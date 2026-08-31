"""Build the Word List 2 test app from Word List 1's shell.

Four item types, the same as List 1:
  def   the word, choose its meaning
  rev   the meaning, choose the word
  blank a sentence with the word removed
  ant   choose the opposite

Distractors are always drawn from this same list, so a wrong answer is still
exposure to another word on it. Two rules the generator enforces rather than
trusts: a `def` item never offers a second meaning of its own word (that would
be defensible twice over), and the correct option is never the longest one,
because a child who spots that stops reading the question.
"""
import io, json, os, pathlib, random, re, sys

ROOT = r"C:\Users\kl\projects\study"
SCRATCH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
sys.argv = ["x"]
import build_theme as B

RNG = random.Random(20260830)   # deterministic build; the app shuffles at render


def load_focus(subject):
    """What the last returned test said to lean on.

    _returned/ is gitignored, so this is absent on a fresh clone and on CI —
    which is the point: no focus file means an even spread, exactly what the
    first week of a unit should be. It only tilts once there is real evidence
    to tilt it with.
    """
    p = pathlib.Path(ROOT) / "_returned" / subject / "focus.json"
    out = {"weight": {}, "retire": set()}
    if not p.exists():
        return out
    try:
        d = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        print("  focus.json ignored (%s)" % e)
        return out
    out["weight"] = {k: v for k, v in (d.get("weight") or {}).items()}
    out["retire"] = set(d.get("retire") or [])
    if out["weight"] or out["retire"]:
        print("  focus: %d weighted, %d retired  (from %s)"
              % (len(out["weight"]), len(out["retire"]), d.get("updated", "undated")))
    return out


def data_span(html):
    i = html.index("const DATA = ")
    b = html.index("{", i)
    d = 0
    for j in range(b, len(html)):
        if html[j] == "{":
            d += 1
        elif html[j] == "}":
            d -= 1
            if not d:
                return b, j + 1
    raise SystemExit("unbalanced DATA")


def pick_distractors(pool, correct, n, avoid=()):
    """n options from pool, never the correct one and never anything in avoid.

    Chosen for length similarity, so the right answer does not stand out as the
    longest or the shortest option on the screen. Candidates are bucketed by how
    far their length is from the correct answer's and the nearest are preferred,
    with a little jitter so the same neighbours are not picked every time.
    """
    cands = [x for x in pool if x != correct and x not in avoid]
    RNG.shuffle(cands)
    cands.sort(key=lambda x: (abs(len(x) - len(correct)) // 6, RNG.random()))
    return cands[:n]


def balance(opts, ai):
    """Put the correct answer in a random slot.

    The app shuffles again at render, so this does not change what a child sees
    — but it keeps the source itself free of a tell. The first pass of this
    generator pinned every answer to index 1 or 2, which is the same mistake in
    a different place.
    """
    correct = opts[ai]
    order = opts[:]
    RNG.shuffle(order)
    return order, order.index(correct)


def main():
    src = io.open(os.path.join(ROOT, "vocabulary", "ww6-lesson1-test", "index.html"),
                  encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off the List 1 test")

    spec = json.load(io.open(os.path.join(SCRATCH, "ww6_l2.json"), encoding="utf-8"))
    senses = spec["senses"]
    CITE = spec["cite"]
    WRITTEN = "Written for this test; the meaning it turns on is the book\u2019s."

    all_defs = [s["def"] for s in senses]
    all_words = sorted(set(s["w"] for s in senses))

    pool = []
    for n, s in enumerate(senses):
        key = "%s:%d" % (s["head"], s.get("s", 0))
        sibling_defs = [x["def"] for x in senses if x["head"] == s["head"]]

        # def — the word, choose its meaning
        d = pick_distractors(all_defs, s["def"], 3, avoid=sibling_defs)
        opts, ai = balance([s["def"]] + d, 0)
        # Several phrasings of the same question. MC.ask() fixes one per run, so
        # a second sitting does not read back word for word from the first.
        qv_def = ["<b>%s</b> <span class='pos'>(%s)</span>" % (s["w"], s["pos"]),
                  "What does <b>%s</b> mean here? <span class='pos'>(%s)</span>" % (s["w"], s["pos"]),
                  "Choose the meaning of <b>%s</b>. <span class='pos'>(%s)</span>" % (s["w"], s["pos"])]
        pool.append({"k": key, "w": s["w"], "s": s.get("s", 0), "type": "def",
                     "q": qv_def[0], "qv": qv_def,
                     "opts": opts, "a": ai,
                     "why": "<b>%s</b> (%s) &mdash; %s" % (s["w"], s["pos"], s["def"]),
                     "cite": CITE, "first": bool(s.get("first"))})

        # rev — the meaning, choose the word
        d = pick_distractors(all_words, s["w"], 3)
        opts, ai = balance([s["w"]] + d, 0)
        qv_rev = ["Which word means: <span class='def'>(%s) %s</span>" % (s["pos"], s["def"]),
                  "Which word fits this meaning? <span class='def'>(%s) %s</span>" % (s["pos"], s["def"]),
                  "Find the word for: <span class='def'>(%s) %s</span>" % (s["pos"], s["def"])]
        pool.append({"k": key, "w": s["w"], "s": s.get("s", 0), "type": "rev",
                     "q": qv_rev[0], "qv": qv_rev,
                     "opts": opts, "a": ai,
                     "why": "<b>%s</b> &mdash; (%s) %s" % (s["w"], s["pos"], s["def"]),
                     "cite": CITE, "first": bool(s.get("first"))})

        # blank — a sentence with the word taken out
        blanked = s["sent"].replace("____", "<u>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</u>")
        d = pick_distractors(all_words, s["w"], 3)
        opts, ai = balance([s["w"]] + d, 0)
        pool.append({"k": key, "w": s["w"], "s": s.get("s", 0), "type": "blank",
                     "q": blanked, "opts": opts, "a": ai,
                     "why": "<b>%s</b> &mdash; (%s) %s" % (s["w"], s["pos"], s["def"]),
                     "cite": WRITTEN, "first": bool(s.get("first"))})

        # ant — the opposite, only where the list has a clean one
        if "ant" in s:
            opts, ai = balance(list(s["ant"]), s["antA"])
            qv_ant = ["Which word is most nearly the <b>opposite</b> of <b>%s</b>?" % s["w"],
                      "Which word means the <b>opposite</b> of <b>%s</b>?" % s["w"],
                      "<b>%s</b> is closest to the opposite of which word?" % s["w"]]
            pool.append({"k": key, "w": s["w"], "s": s.get("s", 0), "type": "ant",
                         "q": qv_ant[0], "qv": qv_ant,
                         "opts": opts, "a": ai,
                         "why": "<b>%s</b> means %s So its opposite is <b>%s</b>."
                                % (s["w"], s["def"][0].lower() + s["def"][1:], s["ant"][s["antA"]]),
                         "cite": WRITTEN, "first": bool(s.get("first"))})

    for i, p in enumerate(pool):
        p["i"] = i

    focus = load_focus("vocabulary")

    def take(pred, n, used):
        """n items of a kind, biased by what the last returned test showed.

        An item whose meaning is in `weight` gets extra tickets in the draw, so
        a thing he actually missed turns up more often than a thing he did not.
        An item in `retire` is skipped unless the pool would otherwise run dry —
        a set that keeps asking about what he already knows is a set he learns
        nothing from, but it is better to repeat than to hand back a short form.
        """
        got = [p for p in pool if pred(p) and p["i"] not in used]
        keep = [p for p in got if p["k"] not in focus["retire"]]
        if len(keep) >= n:
            got = keep
        tickets = []
        for p in got:
            tickets += [p] * max(1, int(focus["weight"].get(p["k"], 1)))
        RNG.shuffle(tickets)
        out, seen = [], set()
        for p in tickets:
            if len(out) == n:
                break
            if p["i"] in seen:
                continue
            seen.add(p["i"])
            out.append(p)
        used.update(p["i"] for p in out)
        return out

    # Sunday warm-up: one per headword, meanings only, first sense only
    warm = []
    for h in spec["headwords"]:
        cand = [p for p in pool if p["type"] == "def" and p["first"] and p["k"].startswith(h + ":")]
        warm.append(cand[0])
    RNG.shuffle(warm)

    # The warm-up does not consume anything: seeing an easy item again later in
    # the week is repetition, not a duplicate. A, B and C still exclude each other.
    # `items` holds indices into `pool` \u2014 the app looks them up as DATA.pool[k].
    # `n` is the short chip label, not a number. Colours must be vars this app
    # actually defines: --sky --gold --red --jade.
    used = set()
    forms = [{"id": "warm", "n": "Warm-up", "name": "Sunday warm-up", "c": "var(--jade)",
              "blurb": "One word at a time, meanings only. Nothing here counts against you \u2014 it is the first look.",
              "items": [p["i"] for p in warm]}]
    for fid, label, name, col in (("a", "Form A", "Form A", "var(--sky)"),
                                  ("b", "Form B", "Form B", "var(--gold)"),
                                  ("c", "Form C", "Form C", "var(--red)")):
        items = take(lambda p: p["type"] == "def", 8, used) \
              + take(lambda p: p["type"] == "rev", 8, used) \
              + take(lambda p: p["type"] == "blank", 6, used) \
              + take(lambda p: p["type"] == "ant", 2, used)
        RNG.shuffle(items)
        forms.append({"id": fid, "n": label, "name": name, "c": col,
                      "blurb": "Mixed practice \u2014 meanings, words, and sentences.",
                      "items": [p["i"] for p in items]})

    # Thursday final: every meaning once, plus whatever is left over
    final, seen = [], set()
    for p in pool:
        if p["type"] == "def" and p["k"] not in seen:
            final.append(p); seen.add(p["k"])
    extra = [p for p in pool if p["type"] in ("blank", "ant") and p["i"] not in used]
    RNG.shuffle(extra)
    final += extra[:max(0, 35 - len(final))]
    RNG.shuffle(final)
    forms.append({"id": "final", "n": "Final", "name": "Comprehensive Final",
                  "c": "var(--jade)",
                  "blurb": "Every meaning on the list, once each. This is the Thursday run before Friday's test.",
                  "items": [p["i"] for p in final]})

    data = {"book": spec["book"], "lesson": spec["lesson"],
            "bank": spec["bank"], "pool": pool, "forms": forms}

    b, e = data_span(shell)
    out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]
    out = re.sub(r"<title>.*?</title>",
                 "<title>Word List 2 \u2014 Tests</title>", out, count=1)

    d = os.path.join(ROOT, "vocabulary", "ww6-lesson2-test")
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)
    print("  senses %d   pool %d" % (len(senses), len(pool)))
    for f in forms:
        print("    %-6s %-22s %2d items" % (f["id"], f["name"], len(f["items"])))
    print("  wrote %.1f KB" % (len(out) / 1024))


main()

"""Build a test-rehearsal app that matches the shape of the paper Myles sits.

    python gen_wwtest.py wwtest_l5.json ww6-lesson5-exam

The vocabulary app already in the repo is a drill: pooled multiple choice,
four forms and a final, every item worth the same. The paper his teacher hands
out is not that. It is five parts and fifty points, and two of those parts --
write the word yourself, and answer in complete sentences -- cannot be done by
tapping. Those are the two he loses marks on, and they were the two the site
never asked for. So this builds the paper.

  Part I    15  matching, one lettered definition bank for the whole part
  Part II   10  the word that completes the sentence
  Part III  10  write the word yourself, spelling counts
  Part IV    5  noun, verb, adjective or adverb
  Part V    10  complete sentences, two points each

Part V is marked by the child against a model answer, not by the machine. A
machine can see that the word was used, that it is a sentence and that it is
punctuated; it cannot see whether the sentence says anything true. Pretending
otherwise would hand him a score he had not earned, which is worse than asking
him to be honest.
"""
import io, json, os, re, sys

ROOT = r"C:\Users\kl\projects\study"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
# build_theme reads sys.argv at import, so ours are put aside first.
MINE = sys.argv[1:]
sys.argv = ["x"]
import build_theme as B                                           # noqa: E402

NEED = ("book", "lesson", "cite", "title", "intro", "parts")
TYPES = ("match", "pick", "write", "pos", "say")
POS = ("noun", "verb", "adjective", "adverb")


def strip_tags(s):
    return re.sub(r"<[^>]+>", "", s)


def check(spec):
    """Refuse to build a paper that would mislead him rather than find out on
    the day. Everything here has been wrong in some app on this site once."""
    bad = ["the spec has no %r" % k for k in NEED if k not in spec]
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))

    total = 0
    ids = set()
    for p in spec["parts"]:
        where = p.get("id", "?")
        if where in ids:
            bad.append("two parts share the id %r" % where)
        ids.add(where)
        if p.get("type") not in TYPES:
            bad.append("%s: type %r is not one the app can render" % (where, p.get("type")))
        n = len(p["items"])
        if p["each"] * n != p["pts"]:
            bad.append("%s: %d items at %d each is %d, but the part says %d"
                       % (where, n, p["each"], p["each"] * n, p["pts"]))
        total += p["pts"]

        if p["type"] == "match":
            letters = [d[0] for d in p["defs"]]
            if len(set(letters)) != len(letters):
                bad.append("%s: the definition bank repeats a letter" % where)
            if len(p["defs"]) != n:
                bad.append("%s: %d words but %d definitions, so the bank does not pair off"
                           % (where, n, len(p["defs"])))
            used = [it["a"] for it in p["items"]]
            if len(set(used)) != len(used):
                bad.append("%s: two words claim the same definition letter" % where)
            for it in p["items"]:
                if it["a"] not in letters:
                    bad.append("%s: %s answers %r, which is not in the bank"
                               % (where, it["w"], it["a"]))
            # A bank written in the same order as the words lets him answer the
            # whole part A, B, C, D without reading a single definition.
            inorder = sum(1 for i, it in enumerate(p["items"])
                          if i < len(letters) and it["a"] == letters[i])
            if inorder > 2:
                bad.append("%s: %d of %d words sit opposite their own letter, so the "
                           "part can be answered straight down the alphabet"
                           % (where, inorder, n))

        if p["type"] == "pick":
            for it in p["items"]:
                o = it["opts"]
                if not (0 <= it["a"] < len(o)):
                    bad.append("%s: %r has no answer at index %d" % (where, it["q"][:40], it["a"]))
                    continue
                if len(set(o)) != len(o):
                    bad.append("%s: %r repeats an option" % (where, it["q"][:40]))
                # The longest option being right is the oldest tell there is.
                if len(o[it["a"]]) > max(len(x) for i, x in enumerate(o) if i != it["a"]):
                    bad.append("%s: on %r the correct option is the longest one"
                               % (where, it["q"][:40]))
                if "______" not in it["q"]:
                    bad.append("%s: %r has no blank to fill" % (where, it["q"][:40]))
                # A sentence that already contains its own answer gives it away.
                if re.search(r"\b" + re.escape(o[it["a"]]) + r"\b", it["q"], re.I):
                    bad.append("%s: %r contains its own answer" % (where, it["q"][:40]))

        if p["type"] == "write":
            for it in p["items"]:
                if not it.get("ok"):
                    bad.append("%s: %r accepts nothing" % (where, it["q"][:40]))
                    continue
                stem = strip_tags(it["q"]).lower()
                for a in it["ok"]:
                    if re.search(r"\b" + re.escape(a.lower()) + r"\b", stem):
                        bad.append("%s: the prompt %r contains the answer %r"
                                   % (where, it["q"][:40], a))

        if p["type"] == "pos":
            for it in p["items"]:
                if it["a"] not in POS:
                    bad.append("%s: %r answers %r, which is not a part of speech the "
                               "app offers" % (where, it["q"][:40], it["a"]))
                if "<b>" not in it["q"]:
                    bad.append("%s: %r has no bold word, so there is nothing to classify"
                               % (where, it["q"][:40]))

        if p["type"] == "say":
            for it in p["items"]:
                if not it.get("need"):
                    bad.append("%s: %r names no word he has to use" % (where, it["q"][:40]))
                m = (it.get("model") or "").lower()
                for w in it.get("need", []):
                    # The model answer is what he marks himself against, so it
                    # has to satisfy the same rule he is being held to.
                    if w.lower()[:5] not in m:
                        bad.append("%s: the model answer for %r never uses %r"
                                   % (where, it["q"][:40], w))
                if not re.search(r"[.!?]$", (it.get("model") or "").strip()):
                    bad.append("%s: the model answer for %r is not a finished sentence"
                               % (where, it["q"][:40]))

    if total != 50:
        bad.append("the five parts come to %d points, and the paper is out of 50" % total)

    # Every headword on the list has to be asked about somewhere, or the part
    # of the list he never sees is the part that turns up on the paper.
    asked = set()
    for p in spec["parts"]:
        for it in p["items"]:
            blob = " ".join([it.get("w", ""), strip_tags(it.get("q", "")),
                             " ".join(it.get("ok", [])), " ".join(it.get("need", [])),
                             " ".join(it.get("opts", []))]).lower()
            for w in spec.get("words", []):
                if w.lower()[:5] in blob:
                    asked.add(w)
    for w in sorted(set(spec.get("words", [])) - asked):
        bad.append("no part of the test asks about %r" % w)

    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))
    return total


def main():
    spec_name = MINE[0] if MINE else "wwtest_l5.json"
    out_dir = MINE[1] if len(MINE) > 1 else "ww6-lesson5-exam"
    spec = json.load(io.open(os.path.join(HERE, spec_name), encoding="utf-8"))

    # The word list is the authority on what has to be covered; it lives in the
    # lesson spec next door rather than being typed out twice.
    src = os.path.join(HERE, spec.get("from", "ww6_l5.json"))
    if os.path.exists(src):
        spec["words"] = json.load(io.open(src, encoding="utf-8"))["headwords"]

    total = check(spec)
    spec["total"] = total

    shell = io.open(os.path.join(HERE, "wwtest_shell.html"), encoding="utf-8").read()
    data = {k: spec[k] for k in ("book", "lesson", "cite", "intro", "parts", "total")}
    out = shell.replace("DATA_GOES_HERE", json.dumps(data, ensure_ascii=False, indent=1))
    out = out.replace("TITLE_GOES_HERE", "%s \u2014 %s" % (spec["title"], spec["book"]))
    out = out.replace("EYEBROW_GOES_HERE", "Vocabulary \u00b7 " + spec["lesson"])
    out = out.replace("H1_GOES_HERE", spec["title"])

    for leftover in ("DATA_GOES_HERE", "TITLE_GOES_HERE", "EYEBROW_GOES_HERE", "H1_GOES_HERE"):
        if leftover in out:
            raise SystemExit("  %s was never filled in" % leftover)

    d = os.path.join(ROOT, "vocabulary", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8",
            newline="\r\n").write(out)

    print("  vocabulary/%s  %.1f KB" % (out_dir, len(out) / 1024))
    print("  %s, %s \u2014 %d points over %d parts"
          % (spec["book"], spec["lesson"], total, len(spec["parts"])))
    for p in spec["parts"]:
        print("    %-9s %-42s %2d items  %2d pts" %
              (p["name"], p["title"], len(p["items"]), p["pts"]))
    if spec.get("words"):
        print("  all %d headwords are asked about somewhere" % len(spec["words"]))


main()

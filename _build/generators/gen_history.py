"""Build a CKHG chapter app from Chapter 3's shell.

    python gen_history.py history_ch4.json g5-maya-ch4

The history chapters are one program with different data: three sets of about
eight items each, ending in the Big Question builder. The Teacher Guide is the
North Star — the builder's correct tiles should be the TG's own key points for
that chapter, not a summary invented here.
"""
import io, json, os, random, re, sys

RNG = random.Random(20260901)   # deterministic build; the app reshuffles at render

ROOT = r"C:\Users\kl\projects\study"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
sys.argv = ["x"]
import build_theme as B


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


def check(spec):
    """The faults worth catching before a ten-year-old finds them."""
    bad = []
    for s in spec["sets"]:
        picks = [i for i in s["items"] if i["type"] == "pick"]
        for n, it in enumerate(picks, 1):
            where = "%s q%d" % (s["id"], n)
            if len(it["opts"]) != 4:
                bad.append("%s: %d options, want 4" % (where, len(it["opts"])))
            if len(set(it["opts"])) != len(it["opts"]):
                bad.append("%s: a repeated option" % where)
            if not isinstance(it.get("a"), int) or not 0 <= it["a"] < len(it["opts"]):
                bad.append("%s: answer index out of range" % where)
            if not it.get("why") or not it.get("cite"):
                bad.append("%s: missing why or cite" % where)
            # The tell that matters: a child who notices that the right answer
            # is always the longest one stops reading the question. Six
            # characters is about where it becomes visible at a glance.
            lens = [len(o) for o in it["opts"]]
            if lens[it["a"]] == max(lens) and max(lens) - sorted(lens)[-2] >= 6:
                bad.append("%s: correct option is the longest by %d characters"
                           % (where, max(lens) - sorted(lens)[-2]))
        if not any(i["type"] == "build" for i in s["items"]):
            bad.append("%s: no Big Question builder at the end" % s["id"])

    b = spec["build"]
    right = [t for t in b["tiles"] if t["a"]]
    if len(right) != 2:
        bad.append("builder: %d correct tiles, the prompt says two" % len(right))
    if len(b["tiles"]) - len(right) < 3:
        bad.append("builder: too few distractors")
    if not b.get("answer") or not b.get("cite"):
        bad.append("builder: missing answer or cite")
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))


def spread(spec):
    """Shuffle each question's options so the answer index is not clustered.

    The app reshuffles at render, so this changes nothing a child sees — but it
    keeps the source free of a pattern, and the source is what the next person
    reads. Written out by hand, these landed on index 1 twelve times in
    twenty-one.
    """
    for s in spec["sets"]:
        for it in s["items"]:
            if it["type"] != "pick":
                continue
            right = it["opts"][it["a"]]
            RNG.shuffle(it["opts"])
            it["a"] = it["opts"].index(right)


def main():
    spec_name = sys.argv[1] if len(sys.argv) > 1 else "history_ch4.json"
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "g5-maya-ch4"
    spec = json.load(io.open(os.path.join(HERE, spec_name), encoding="utf-8"))
    spread(spec)
    check(spec)

    src = io.open(os.path.join(ROOT, "history", "g5-maya-ch3", "index.html"),
                  encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off Chapter 3")
    # The shell is a previously *patched* chapter, so strip the review layer too
    # and let build_theme put today's version back on. Otherwise a new chapter
    # inherits whatever the patch looked like when its predecessor was built.
    import review
    shell = review.unpatch(shell)

    b, e = data_span(shell)
    data = {"bigQuestion": spec["bigQuestion"], "sets": spec["sets"],
            "build": spec["build"]}
    # The reading panel needs these; dropping them silently gave a chapter
    # tagged questions and nothing for the tags to point at.
    if spec.get("passages"):
        data["passages"] = spec["passages"]
    out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]
    out = re.sub(r"<title>.*?</title>",
                 "<title>%s</title>" % spec.get("title", "Tenochtitl\u00e1n: City of Wonder"),
                 out, count=1)

    # The shell is the previous chapter's file, so its source comment and its
    # footer still name that chapter. The title was the only thing being
    # rewritten, which left Chapter 4 telling the reader it came from Chapter 3.
    if spec.get("note"):
        out = re.sub(r"/\* Every question.*?\*/", lambda m: spec["note"], out,
                     count=1, flags=re.S)
    # The home page's own heading, which lives in the markup rather than in
    # DATA. Chapter 4 shipped introducing itself as Chapter 3, under Chapter 3's
    # Big Question, because <title> was the only heading being rewritten.
    for field, rx in (("eyebrow", r'<p class="eyebrow">[^<]*</p>'),
                      ("h1", r"<h1>.*?</h1>")):
        if spec.get(field):
            tag = "p class=\"eyebrow\"" if field == "eyebrow" else "h1"
            shut = "p" if field == "eyebrow" else "h1"
            out, n = re.subn(rx, "<%s>%s</%s>" % (tag, spec[field], shut),
                             out, count=1, flags=re.S)
            if not n:
                raise SystemExit("the %s is not where it was" % field)
    # the Big Question is printed under the heading as literal text
    out, n = re.subn(r'(<div class="bigq"><b>The Big Question</b>\s*\n\s*)[^<]*</div>',
                     lambda m: m.group(1) + spec["bigQuestion"] + "</div>", out, count=1)
    if not n:
        raise SystemExit("the Big Question block is not where it was")

    if spec.get("chapter"):
        out, n = re.subn(r"(Student Reader(?: and Teacher Guide)?, )Chapter \d+\.",
                         lambda m: m.group(1) + "Chapter %d." % spec["chapter"], out)
        if not n:
            raise SystemExit("the footer no longer names a chapter \u2014 check the shell")

    d = os.path.join(ROOT, "history", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)
    n = sum(len(s["items"]) for s in spec["sets"])
    print("  history/%s  %d sets, %d items  %.1f KB" % (out_dir, len(spec["sets"]), n, len(out)/1024))
    for s in spec["sets"]:
        kinds = {}
        for i in s["items"]:
            kinds[i["type"]] = kinds.get(i["type"], 0) + 1
        print("    %-3s %-32s %s" % (s["id"], s["name"],
              " ".join("%s:%d" % kv for kv in sorted(kinds.items()))))


main()

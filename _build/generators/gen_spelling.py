"""Build a weekly spelling app from List 2's shell.

    python gen_spelling.py spelling_list3.json list3

The seven levels are a fixed ladder — warm up, definitions, in a sentence, step
up, test day, and two challenges — and they work for any word list, so a new
week is the word data and nothing else. Only the words, the rule, the week
label and the root change.

The last level asks him to write his own sentence, which is the one place on the
site he produces language rather than picking it. That is deliberate; keep it.
"""
import io, json, os, re, sys

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


# The ladder, lifted from List 2 and held here rather than read back out of it.
# List 2's DATA is a JS object literal with unquoted keys, so it is not JSON and
# cannot be parsed as such — and keeping the ladder here means a new week does
# not depend on an older week's file still existing.
LEVELS = [
    {"id": "l1", "name": "Warm up", "prompt": "def", "input": "boxes",
     "clue": "syllable", "wide": True, "tag": "Syllable by syllable",
     "blurb": "The boxes are split into syllable chunks with a gap between each one, "
              "and every chunk starts you off with its first letter."},
    {"id": "l2", "name": "Definitions", "prompt": "def", "input": "boxes",
     "clue": "first", "tag": "Meaning · first letter",
     "blurb": "Same syllable chunks, but now only the very first letter of the "
              "whole word is given."},
    {"id": "l3", "name": "In a sentence", "prompt": "sent", "input": "boxes",
     "clue": "first", "tag": "Sentence · first letter",
     "blurb": "A sentence with the word missing. Work out which word fits, then spell it."},
    {"id": "l4", "name": "Step up", "prompt": "both", "input": "free",
     "tag": "Listen · meaning and sentence",
     "blurb": "Hear the word. Meaning and sentence to lean on, but no boxes and no letters."},
    {"id": "l5", "name": "Test day", "prompt": "none", "input": "free",
     "tag": "Listen · nothing else",
     "blurb": "Dictation, the way Friday works. Hear the word, spell it. "
              "Nothing else on screen."},
    {"id": "l6", "name": "Challenge", "prompt": "none", "input": "free",
     "dictate": "def", "boss": True, "tag": "Hear the meaning · name the word",
     "blurb": "You hear the definition read out loud — not the word — and you "
              "work out which word it is and spell it from nothing."},
    {"id": "l7", "name": "Challenge 2", "prompt": "word", "input": "sentence",
     "boss": True, "tag": "Write your own sentence",
     "blurb": "You get the word. Write a sentence that uses it properly. Miss twice "
              "and you will see one that works."},
]


def check(spec):
    """Refuse to build a list that would misbehave in the app rather than
    finding out from a ten-year-old on Friday morning."""
    bad = []
    for w in spec["words"]:
        if "".join(w["syl"]) != w["w"]:
            bad.append("%s: syllables spell %r" % (w["w"], "".join(w["syl"])))
        if "___" not in w["sent"]:
            bad.append("%s: sentence has no ___ blank" % w["w"])
        if w["w"].lower() in w["sent"].lower().replace("___", ""):
            bad.append("%s: the sentence gives the word away" % w["w"])
        if not w["def"] or not w["pos"]:
            bad.append("%s: missing definition or part of speech" % w["w"])
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))


def main():
    spec_name = sys.argv[1] if len(sys.argv) > 1 else "spelling_list3.json"
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "list3"
    spec = json.load(io.open(os.path.join(HERE, spec_name), encoding="utf-8"))
    check(spec)

    src = io.open(os.path.join(ROOT, "spelling", "list2", "index.html"),
                  encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off List 2")

    b, e = data_span(shell)

    data = {
        "title": spec["title"],
        "rule": spec["rule"],
        "week": spec["week"],
        "words": spec["words"],
        "root": spec["root"],
        "levels": LEVELS,
    }
    out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]
    out = re.sub(r"<title>.*?</title>",
                 "<title>%s \u2014 %s</title>" % (spec["title"], spec["rule"]),
                 out, count=1)

    d = os.path.join(ROOT, "spelling", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)
    print("  spelling/%s  %d words, %d levels  %.1f KB"
          % (out_dir, len(data["words"]), len(data["levels"]), len(out) / 1024))
    print("  rule: %s   root: %s = %s"
          % (spec["rule"], spec["root"]["stem"], spec["root"]["means"]))


main()

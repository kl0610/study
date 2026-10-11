"""Build a CKHG chapter app from the newest science chapter's shell.

    python gen_ckhg.py ae_ch1.json g5-ae-ch1

A CKHG chapter and a CKSci chapter are the same object: a reader chapter, a Big
Question at the top, core vocabulary in the margins, and a quiz over passages
quoted from the book. So this is gen_science.py's job with three differences,
each of which is why it is a separate file rather than a flag:

  * it writes into history/ rather than science/;
  * a chapter may have more than one section, though these do not use it: a
    chapter is one sitting of five or six minutes, and the vocabulary is asked
    inside that quiz rather than in a section beside it. The dozen core words
    are carried by the second paper of each question -- paper one asks what
    happened, paper two asks what the word means or what it is doing here -- so
    they are tested without adding a question;
  * an item may carry `vs`, the two papers. The retake round is meant to look
    different from the first run -- "mix up the questions again and the wrong
    answers so that the questions would look slightly different" -- and the
    shell layer in review.py already does exactly that for any item with `vs`.

The shell is the newest ecosystems chapter: it is a mission-shell app, so it
arrives with the retake, the excerpt-on-a-miss and the papers machinery already
patched in, and with a Big Question block in the markup that the reading shell
does not have.
"""
import io
import json
import os
import random
import re
import sys

RNG = random.Random(20261010)   # deterministic build; the app reshuffles at render

ROOT = r"C:\Users\kl\projects\study"
HERE = os.path.dirname(os.path.abspath(__file__))
SHELL = os.path.join(ROOT, "science", "g5-eco-ch8", "index.html")
sys.path.insert(0, os.path.join(ROOT, "_build"))
# build_theme reads sys.argv at import time for its own flags, so ours are put
# aside first and put back after.
MINE = sys.argv[1:]
sys.argv = ["x"]
import build_theme as B          # noqa: E402

TAG = re.compile(r"</?[a-z][^>]*>|&[a-z]+;")


def bare(t):
    """Letters only, for comparing what an option says against what the book says."""
    return re.sub(r"[^a-z]", "", t.lower())


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


def forms(it):
    """Every version of a question. An item either carries `vs` or is itself."""
    return list(it["vs"]) if it.get("vs") else [it]


def items_of(spec):
    out = []
    for m in spec["missions"]:
        out.extend(m["items"])
    return out


def check(spec):
    """The faults worth catching before a ten-year-old finds them."""
    bad = []
    keys = set(spec["passages"])
    papers = None

    for mi, m in enumerate(spec["missions"], 1):
        for k in ("id", "name", "tag", "blurb", "items"):
            if not m.get(k):
                bad.append("section %d has no %r" % (mi, k))
        if not m.get("items"):
            continue
        for n, it in enumerate(m["items"], 1):
            where = "%s q%d" % (m.get("id", "?"), n)
            if it.get("p") not in keys:
                bad.append("%s: no passage %r" % (where, it.get("p")))
            else:
                # A highlight that is not in its own passage opens the book at
                # nothing, which is worse than not opening it at all.
                body = " ".join(spec["passages"][it["p"]]["text"])
                vocab = " ".join(w + " " + d
                                 for w, d in spec["passages"][it["p"]].get("vocab", []))
                for h in ([it["hi"]] if isinstance(it.get("hi"), str) else it.get("hi") or []):
                    if h not in body and h not in vocab:
                        bad.append("%s: highlight %r is not in passage %r"
                                   % (where, h[:40], it["p"]))

            vs = forms(it)
            if papers is None:
                papers = len(vs)
            elif len(vs) != papers:
                bad.append("%s: %d versions, but another question has %d"
                           % (where, len(vs), papers))

            for vi, v in enumerate(vs, 1):
                spot = where + ("v%d" % vi if it.get("vs") else "")
                if not v.get("why"):
                    bad.append("%s: no explanation" % spot)
                # The shell prints question, options and explanation through
                # esc(), so markup in any of them reaches the screen as text.
                # Two science chapters shipped asking 'What does <b>x</b> mean?'
                for field, val in ([("question", v.get("q", "")),
                                    ("why", v.get("why", ""))] +
                                   [("option", o) for o in (v.get("opts") or [])
                                    if isinstance(o, str)]):
                    if TAG.search(val):
                        bad.append("%s: the %s is escaped when printed, so its "
                                   "markup reaches the screen as text: %r"
                                   % (spot, field, val[:50]))
                # The fault that shipped: a wrong answer lifted out of the same
                # sentence the right one came from. "Which islands did Europeans
                # call the Spice Islands?" offered Sumatra and Java, which the
                # page calls spice-bearing islands two lines earlier -- so the
                # question came down to which island is most famous, and three of
                # four answers were defensible. If the book says it in the very
                # passage the question points at, it is not a wrong answer.
                if it.get("p") in keys:
                    page = bare(" ".join(spec["passages"][it["p"]]["text"]) + " " +
                               " ".join(w + " " + d for w, d in
                                        spec["passages"][it["p"]].get("vocab", [])))
                    for i, o in enumerate(v.get("opts") or []):
                        if i == v.get("a") or not isinstance(o, str):
                            continue
                        if len(bare(o)) >= 12 and bare(o) in page:
                            bad.append("%s: the passage says %r, so offering it as "
                                       "a wrong answer gives the question two "
                                       "defensible answers" % (spot, o[:50]))
                o = v.get("opts") or []
                if len(o) != 4:
                    bad.append("%s: %d options, want 4" % (spot, len(o)))
                if len(set(o)) != len(o):
                    bad.append("%s: a repeated option" % spot)
                if not isinstance(v.get("a"), int) or not 0 <= v["a"] < len(o):
                    bad.append("%s: answer index out of range" % spot)
                    continue
                # The tell that matters: a child who notices the right answer is
                # always the longest one stops reading the question.
                lens = [len(x) for x in o]
                if lens[v["a"]] == max(lens) and max(lens) - sorted(lens)[-2] > 6:
                    bad.append("%s: correct option is the longest by %d characters"
                               % (spot, max(lens) - sorted(lens)[-2]))

            if it.get("vs"):
                if len(set(v["q"] for v in vs)) != len(vs):
                    bad.append("%s: two papers ask it the same way" % where)
                wrongs = [frozenset(o for i, o in enumerate(v["opts"]) if i != v["a"])
                          for v in vs if v.get("opts")]
                if len(set(wrongs)) != len(wrongs):
                    bad.append("%s: two papers offer the same wrong answers" % where)
                rights = set(v["opts"][v["a"]] for v in vs
                             if v.get("opts") and isinstance(v.get("a"), int))
                for vi, v in enumerate(vs, 1):
                    for i, o in enumerate(v.get("opts") or []):
                        if i != v["a"] and o in rights:
                            bad.append("%sv%d: offers as wrong what the other "
                                       "paper marks right" % (where, vi))

    for k, P in spec["passages"].items():
        if not P.get("title") or not P.get("cite") or not P.get("text"):
            bad.append("passage %r is missing title, cite or text" % k)

    # A chapter is a short sitting. Five or six minutes is what was asked for.
    mins = sum(int(mm.group(1))
               for mm in (re.search(r"about (\d+) minute", m.get("tag", ""))
                          for m in spec["missions"]) if mm)
    if mins > 6:
        bad.append("the chapter claims %d minutes, and a chapter is five or six" % mins)
    for m in spec["missions"]:
        got = re.search(r"^(\d+) question", m.get("tag", ""))
        if got and int(got.group(1)) != len(m["items"]):
            bad.append("%s: the card says %s questions and the section has %d"
                       % (m["id"], got.group(1), len(m["items"])))

    unused = keys - {it.get("p") for it in items_of(spec)}
    for k in sorted(unused):
        print("    note: passage %r is not used by any question" % k)
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))
    return papers


def spread(spec):
    """Shuffle each question's options so the answer index is not clustered.

    The app reshuffles at render, so this changes nothing a child sees -- but
    the source is what the next person reads, and written out by hand these
    land on index 0 nearly every time.
    """
    for it in items_of(spec):
        taken = set()
        for v in forms(it):
            if not v.get("opts"):
                continue
            right = v["opts"][v["a"]]
            # With only two papers, a plain shuffle lands the answer in the same
            # slot about a quarter of the time -- and the second paper is meant
            # to look different from the first. Reshuffle until this version's
            # answer sits somewhere none of its siblings put theirs.
            for _ in range(40):
                RNG.shuffle(v["opts"])
                if v["opts"].index(right) not in taken:
                    break
            v["a"] = v["opts"].index(right)
            taken.add(v["a"])


def main():
    if len(MINE) < 2:
        raise SystemExit("usage: gen_ckhg.py <spec.json> <out-dir-name>")
    spec = json.load(io.open(os.path.join(HERE, MINE[0]), encoding="utf-8"))
    out_dir = MINE[1]
    spread(spec)
    papers = check(spec)

    src = io.open(SHELL, encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off %s" % os.path.basename(SHELL))

    b, e = data_span(shell)
    data = {
        "chapter": spec["chapter"],
        "bigQuestion": spec["bigQuestion"],
        "passages": spec["passages"],
        # An absent key keeps the shell's; an empty list means none. `or` would
        # treat [] as absent, which is how eight ecosystems chapters shipped
        # carrying a matter chapter's videos.
        "videos": spec["videos"] if "videos" in spec else [],
        # Name the page on every question card. These chapters are revised with
        # the book open, and a quiz that says where to check is a study guide
        # rather than a memory test -- which is what was asked for here and is
        # deliberately not what the reading sections do.
        "showCite": True,
        "missions": spec["missions"],
    }
    out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]
    out = re.sub(r"<title>.*?</title>", "<title>%s</title>" % spec["title"], out, count=1)

    # The header is markup, not data, so a chapter cloned from another one keeps
    # that one's name until it is told otherwise.
    for rx, rep, what in (
        (r'<div class="eyebrow">[^<]*</div>',
         '<div class="eyebrow">%s</div>' % spec["eyebrow"], "eyebrow"),
        (r"<h1>.*?</h1>", "<h1>%s</h1>" % spec["h1"], "h1"),
    ):
        out, n = re.subn(rx, rep, out, count=1, flags=re.S)
        if not n:
            raise SystemExit("the %s is not where it was" % what)
    out, n = re.subn(r'(<div class="eyebrow">The Big Question</div>\s*<p>)[^<]*(</p>)',
                     lambda m: m.group(1) + spec["bigQuestion"] + m.group(2), out, count=1)
    if not n:
        raise SystemExit("the Big Question block is not where it was")

    # No video shelf on a history chapter. #vids still has to exist, because the
    # render writes into it unconditionally.
    # The ecosystems chapters had no videos either, so the shell usually arrives
    # with the shelf already gone. Take it out if it is there, and either way
    # leave #vids behind, because the render writes into it unconditionally.
    SHELF_START = '  <div class="shelf">'
    i = out.find(SHELF_START)
    if i >= 0:
        j = out.index("</div>", out.index('<div id="vids"></div>', i)) + len("</div>")
        out = out[:i] + '  <div id="vids" hidden></div>\n' + out[j:]
    if '<div class="shelf">' in out:
        raise SystemExit("a video shelf is still in the file")
    if 'id="vids"' not in out:
        raise SystemExit("#vids is gone, and the render writes into it")

    d = os.path.join(ROOT, "history", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8",
            newline="\r\n").write(out)

    n = sum(len(m["items"]) for m in spec["missions"])
    print("  history/%-14s %d sections (%s), %d questions, %d papers  %.1f KB"
          % (out_dir, len(spec["missions"]),
             " + ".join(str(len(m["items"])) for m in spec["missions"]),
             n, papers, len(out) / 1024))
    print("    vocabulary taught: %s"
          % ", ".join(w for P in spec["passages"].values()
                      for w, _ in P.get("vocab", [])))
    print("    next: add it to APPS in build_theme.py and to the hub, then rebuild")


main()

"""Build the Word List 2 matching sheet from Word List 1's sheet.

The sheet is the study tool, not the test: every word on the list matched to
every meaning it carries. List 1 grouped its rounds by how many jobs a word
does. List 2 has 21 word forms across 33 meanings, which is too many for three
rounds, so it splits into four — and the derived forms (arrogance, degrading,
integration, segregation, triumphant, violation) get a round of their own,
because seeing them beside their roots is the point of them being on the list.
"""
import io, json, os, re, sys

ROOT = r"C:\Users\kl\projects\study"
SCRATCH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
# build_theme reads sys.argv at import time for its own flags, so ours are put
# aside first and put back after. Doing it the other way round threw them away.
MINE = sys.argv[1:]
sys.argv = ["x"]
import build_theme as B
import vocabspec


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


# The rounds come from the week's spec now. They were a constant here, naming
# List 2's words, which meant a new list could not be built without editing this
# file — and a round naming a word that is not on the list is caught below.


def sub1(s, old, new, what):
    """Replace exactly one occurrence, or stop."""
    n = s.count(old)
    if n != 1:
        raise SystemExit("  patch %r matched %d times, wanted 1:\n    %s"
                         % (what, n, old.split("\n")[0][:100]))
    return s.replace(old, new, 1)


def pos_on_words(out):
    """Move the part of speech off the meaning and onto the word.

    The sheet used to print "v. To dress up or be dressed up" on the line and
    put a bare `attire` chip in the tray. A word with three meanings had three
    identical chips, so any of them dropped into any of that word's lines was
    marked right, and the label on the line was decoration: it told him the
    answer instead of asking for it.

    Now the label rides on the chip — `attire v.` and `attire n.` are different
    chips — and the meaning is bare, so matching them means knowing which sense
    is the verb. Where a word has two meanings that are the same part of speech
    the chips really are identical and either order is right, which is correct:
    nothing on the line distinguishes them and nothing should pretend to.
    """
    out = sub1(out,
        '    <p class="sub">Every meaning from the list is below. Drag each word onto its'
        ' meaning, Each meaning is already labelled as a noun, a verb, or an adjective'
        ' — use that as your clue. Words with more than one meaning appear more'
        ' than once.</p>',
        '    <p class="sub">Every meaning from the list is below, with nothing on it to'
        ' say what kind of word it wants. The label is on the word instead — so a'
        ' word that is both a noun and a verb is in the tray twice, once each way, and'
        ' the two do not go in the same place.</p>', "the instructions")

    out = sub1(out,
        '  chips=ITEMS.map((it,n)=>({id:"c"+n,word:it.word,at:null}))\n'
        '             .sort((a,b)=>a.word.localeCompare(b.word));',
        '  chips=ITEMS.map((it,n)=>({id:"c"+n,word:it.word,pos:it.pos,at:null}))\n'
        '             .sort((a,b)=>a.word.localeCompare(b.word)'
        '||a.pos.localeCompare(b.pos));', "chips carry their part of speech")

    out = sub1(out,
        '? chips.map(c=>`<button class="chip ${c.at!==null?"gone":""} '
        '${sel===c.id?"sel":""}" data-c="${c.id}">${esc(c.word)}</button>`).join("")',
        '? chips.map(c=>`<button class="chip ${c.at!==null?"gone":""} '
        '${sel===c.id?"sel":""}" data-c="${c.id}">${esc(c.word)}'
        '<span class="postag" data-p="${c.pos}">${c.pos}.</span></button>`).join("")',
        "the chip shows its label")

    out = sub1(out,
        '        <span class="txt"><span class="postag" data-p="${s.pos}">${s.pos}.</span>'
        '${esc(s.txt)}</span>',
        '        <span class="txt">${esc(s.txt)}</span>', "the meaning loses its label")

    out = sub1(out,
        '${c?`<button class="placed ${marks.has(s.n)?"wrongmark":""}" '
        'data-pull="${s.n}">${esc(c.word)}</button>`',
        '${c?`<button class="placed ${marks.has(s.n)?"wrongmark":""}" '
        'data-pull="${s.n}">${esc(c.word)}'
        '<span class="postag" data-p="${c.pos}">${c.pos}.</span></button>`',
        "a placed word keeps its label")

    # The whole point: the placement is only right if the part of speech is too.
    out = sub1(out,
        '                       return !c || c.word!==s.word; };',
        '                       return !c || c.word!==s.word || c.pos!==s.pos; };',
        "the label is graded")

    # adv. had no rule at all, so `aloft` on List 4 would have drawn its label as
    # bare text in an invisible pill. And a label sitting after a word wants its
    # margin on the other side.
    out = sub1(out,
        '.postag[data-p="adj"]{background:var(--violet);color:#fff}\n',
        '.postag[data-p="adj"]{background:var(--violet);color:#fff}\n'
        '.postag[data-p="adv"]{background:#6E7FA8;color:#fff}\n'
        '.chip .postag,.placed .postag{margin:0 0 0 6px;padding:1px 5px;font-size:10px}\n'
        '.placed .postag{background:rgba(255,255,255,.24);color:#fff}\n',
        "the label's own styling")
    return out


def main():
    """usage: gen_sheet.py <spec.json> <out-dir> [shell-dir]"""
    if len(MINE) < 2:
        raise SystemExit("usage: gen_sheet.py <spec.json> <out-dir> [shell-dir]")
    spec_name, out_dir = MINE[0], MINE[1]
    shell_dir = MINE[2] if len(MINE) > 2 else "ww6-lesson2"

    src = io.open(os.path.join(ROOT, "vocabulary", shell_dir, "index.html"),
                  encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off %s" % shell_dir)

    spec = json.load(io.open(os.path.join(SCRATCH, spec_name), encoding="utf-8"))
    vocabspec.check(spec)
    senses = spec["senses"]
    ROUNDS = [(r["id"], r["name"], r["blurb"], r["words"]) for r in spec["rounds"]]

    by_word = {}
    order = []
    for s in senses:
        if s["w"] not in by_word:
            by_word[s["w"]] = []
            order.append(s["w"])
        # The page writes the full stop itself and keys its colours off the bare
        # abbreviation, so the data holds "n" and not "n.". List 1 was written by
        # hand and got this right; every generated sheet since has carried the
        # spec's "n." through, printing "n.." and setting data-p="n.", which
        # matches no rule — so the labels have had no colour at all since List 2.
        by_word[s["w"]].append([s["pos"].rstrip("."), s["def"]])

    lst = [{"w": w, "entries": by_word[w]} for w in order]

    rounds, seen = [], set()
    for rid, name, blurb, words in ROUNDS:
        items = []
        for w in words:
            if w not in by_word:
                raise SystemExit("round %s names a word not on the list: %s" % (rid, w))
            for pos, d in by_word[w]:
                items.append([w, pos, d])
            seen.add(w)
        rounds.append({"id": rid, "name": name, "blurb": blurb, "items": items})

    missing = [w for w in order if w not in seen]
    if missing:
        raise SystemExit("these words are on no round: %s" % ", ".join(missing))

    total = sum(len(r["items"]) for r in rounds)
    if total != len(senses):
        raise SystemExit("rounds cover %d meanings but the list has %d" % (total, len(senses)))

    data = {"book": spec["book"], "lesson": spec["lesson"], "list": lst, "rounds": rounds}

    b, e = data_span(shell)
    out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]
    out = re.sub(r"<title>.*?</title>",
                 "<title>%s \u2014 all the meanings</title>" % spec["lesson"], out, count=1)

    # Same reason as the test app: the sheet's headings are markup, and would
    # otherwise go on naming the list it was built from. Both of them — List 2's
    # sheet has carried "Word List 1" in its title since the day it shipped,
    # because only the smaller heading was ever being substituted.
    out, n = re.subn(r"<h3>Word List \d+</h3>", "<h3>%s</h3>" % spec["lesson"], out, count=1)
    if not n:
        raise SystemExit("the sheet's heading is not where it was")

    m = re.search(r"(\d+)", spec["lesson"])
    h1 = ("<h1>Word <em>List %s</em></h1>" % m.group(1) if m
          else "<h1><em>%s</em></h1>" % spec["lesson"])
    out, n = re.subn(r"<h1>.*?</h1>", h1, out, count=1, flags=re.S)
    if not n:
        raise SystemExit("the sheet's title is not where it was")

    # The footer cites the lesson the definitions came from, and it has said
    # Lesson 1 on every sheet ever built — six of them — because nothing
    # substituted it. It is not caught by the "names only itself" check either,
    # which looks for "List <n>" and this says "Lesson <n>".
    out, n = re.subn(r"Book 6, Lesson \d+, for personal study use",
                     "Book 6, Lesson %s, for personal study use"
                     % (m.group(1) if m else "?"), out, count=1)
    if not n:
        raise SystemExit("the sheet's footer is not where it was")

    # Same for the developer comment at the head of the data.
    out = re.sub(r"/\* Wordly Wise 3000, Book 6 — Lesson \d+ Word List\.",
                 "/* Wordly Wise 3000, Book 6 — Lesson %s Word List."
                 % (m.group(1) if m else "?"), out, count=1)

    if spec.get("posOnWords"):
        out = pos_on_words(out)

    d = os.path.join(ROOT, "vocabulary", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)
    print("  %d word forms, %d meanings" % (len(lst), total))
    for r in rounds:
        print("    %-3s %-24s %2d meanings" % (r["id"], r["name"], len(r["items"])))
    print("  wrote %.1f KB" % (len(out) / 1024))


main()

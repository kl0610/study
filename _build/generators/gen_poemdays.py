"""Build a recitation app that is learnt over several evenings, not in one go.

    python gen_poemdays.py poem_roadnottaken.json the-road-not-taken

new_poem.py builds a poem as a single thing: five levels over every line in it.
That works for six lines. It does not work for twenty with four days to learn
them in, and it does not do the thing that actually makes a long poem stick --
on the evening you learn stanza three you run one, two and three together,
because the joins between stanzas are where a recitation falls over, and the
joins are the one part that practising a stanza on its own never touches.

So a day here has two groups: the new stanza, and everything learnt so far.
The new stanza gets the whole ladder. The cumulative run gets only the three
levels that test recall rather than recognition, because running "last words"
over fifteen lines he already knows is typing, not learning.

The shell is the newest recitation app, with its DATA and ART swapped and the
home screen taught about days. The levels, the marking and the pictures are
the shell's own and are not touched -- the only new idea is which lines are in
front of him, and that is done by handing the shell a different DATA.lines
before each run rather than by threading a range through ten call sites.
"""
import io, json, os, re, sys

ROOT = r"C:\Users\kl\projects\study"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
MINE = sys.argv[1:]
sys.argv = ["x"]
import build_theme as B                                           # noqa: E402

SHELL = os.path.join(ROOT, "recitation", "fireflies-in-the-garden", "index.html")
LADDER = ["last", "first", "half", "line", "heart"]


def span(html, name):
    i = html.index("const %s = " % name)
    b = html.index("{", i)
    d = 0
    for j in range(b, len(html)):
        if html[j] == "{":
            d += 1
        elif html[j] == "}":
            d -= 1
            if not d:
                return b, j + 1
    raise SystemExit("unbalanced %s" % name)


def sub(s, old, new, what):
    """Replace exactly once or stop. A patch that quietly matches nothing is
    how List 2's rule layer shipped on top of List 3 for a week."""
    n = s.count(old)
    if n != 1:
        raise SystemExit("  patch %r matched %d times, wanted 1:\n    %s"
                         % (what, n, old.split("\n")[0][:90]))
    return s.replace(old, new, 1)


def check(spec):
    bad = []
    for f in ("title", "plain", "eyebrow", "sub", "source", "poem", "days", "modes", "art"):
        if not spec.get(f):
            bad.append("no %s" % f)
    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))

    poem, art = spec["poem"], spec["art"]
    for i, ln in enumerate(poem, 1):
        if not ln.get("t", "").strip():
            bad.append("line %d is empty" % i)
        if not re.search(r"[A-Za-z0-9]", ln.get("t", "")):
            bad.append("line %d has nothing to type" % i)
        if ln.get("art") not in art:
            bad.append("line %d wants a picture called %r, which nothing has drawn"
                       % (i, ln.get("art")))
    for m in LADDER:
        if m not in spec["modes"]:
            bad.append("no wording for the %r level" % m)

    # Every line has to be reachable, and the cumulative runs have to actually
    # be cumulative -- the whole point of the ask. Both are easy to get wrong
    # by one and impossible to notice from the screen.
    covered, ids = set(), set()
    last_to = 0
    for d in spec["days"]:
        if not d["groups"]:
            bad.append("%s has no work in it" % d["id"])
        for g in d["groups"]:
            if g["id"] in ids:
                bad.append("two groups share the id %r" % g["id"])
            ids.add(g["id"])
            if not (0 <= g["from"] < g["to"] <= len(poem)):
                bad.append("%s covers lines %d..%d, which is not inside a %d line poem"
                           % (g["id"], g["from"], g["to"], len(poem)))
                continue
            covered |= set(range(g["from"], g["to"]))
            for m in g["modes"]:
                if m not in LADDER:
                    bad.append("%s asks for a %r level, and there is no such level"
                               % (g["id"], m))
        news = [g for g in d["groups"] if g["from"] != 0]
        alls = [g for g in d["groups"] if g["from"] == 0]
        if alls:
            a = alls[-1]
            if a["to"] <= last_to:
                bad.append("%s runs to line %d, and the day before already ran to %d, "
                           "so nothing new is being joined on" % (a["id"], a["to"], last_to))
            last_to = a["to"]
            if news and news[-1]["to"] != a["to"]:
                bad.append("%s learns up to line %d but then runs through line %d"
                           % (d["id"], news[-1]["to"], a["to"]))
    missing = sorted(set(range(len(poem))) - covered)
    if missing:
        bad.append("no evening covers line(s) %s"
                   % ", ".join(str(i + 1) for i in missing))

    # Being swept through a line in a run-through is not the same as being
    # taught it. Every line has to be new stanza material on exactly one
    # evening, and the new stanzas have to tile the poem end to end with no
    # gap and no overlap. Without this a line dropped out of a stanza still
    # passed, because the cumulative run that evening happened to cover it.
    taught, edge = [], 0
    for d in spec["days"]:
        for g in d["groups"]:
            if g["from"] != 0 or len(spec["days"]) == 1:
                taught.append((g["from"], g["to"], g["id"]))
    first_all = [g for g in spec["days"][0]["groups"]]
    if first_all and first_all[0]["from"] == 0:
        taught.insert(0, (first_all[0]["from"], first_all[0]["to"], first_all[0]["id"]))
    for a, b_, gid in sorted(set(taught)):
        if a != edge:
            bad.append("%s teaches lines %d..%d, but the stanza before it ended at "
                       "line %d, so %s" % (gid, a + 1, b_, edge,
                                           "lines are skipped" if a > edge else "lines are taught twice"))
        edge = max(edge, b_)
    if edge != len(poem):
        bad.append("the new stanzas only reach line %d of %d, so the rest is never "
                   "taught, only run past" % (edge, len(poem)))
    if last_to != len(poem):
        bad.append("the last run through stops at line %d of %d, so he never says "
                   "the whole poem" % (last_to, len(poem)))

    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))


# ---------------------------------------------------------------- the day layer
DAYS_JS = """
/* ---------- evenings ----------
   The shell knows how to run five levels over DATA.lines and nothing else, so
   a day is served by handing it a different DATA.lines and a different
   DATA.levels and then calling its own start(). Nothing downstream has to know
   that the poem is longer than the piece on screen. */
let DAYI = 0;

function linesOf(g){ return DATA.poem.slice(g.from, g.to); }

function levelsOf(g){
  return g.modes.map((m, i) => Object.assign({}, DATA.modes[m], {
    id: g.id + "-l" + (i + 1), mode: m,
    boss: !!g.boss && i === g.modes.length - 1
  }));
}

function openLevel(di, gi, li){
  DAYI = di;
  const g = DATA.days[di].groups[gi];
  DATA.lines = linesOf(g);
  DATA.levels = levelsOf(g);
  start(li);
}

function dayScreen(di){
  DAYI = di;
  const d = DATA.days[di];
  const best = Object.assign({}, MC.bests());
  $("eyebrow").textContent = d.name + " \\u00b7 " + d.date;
  $("title").innerHTML = DATA.title;
  $("sub").textContent = d.blurb;
  $("fullpoem").innerHTML = d.groups[d.groups.length - 1].modes.length ?
    linesOf(d.groups[d.groups.length - 1]).map(ln =>
      '<div class="line">' + esc(ln.t) + "</div>").join("") : "";

  $("levels").innerHTML =
    '<button class="lvl backweek" data-back="1"><span class="tag">All four evenings</span>' +
    "<h3>Back to the week</h3><p>Sunday to Wednesday, and the whole poem on Thursday.</p></button>" +
    d.groups.map((g, gi) =>
      '<div class="grouphead"><strong>' + esc(g.label) + "</strong><span>" +
      esc(g.note) + " \\u00b7 " + (g.to - g.from) + " lines</span></div>" +
      levelsOf(g).map((l, li) => {
        const b = best[l.id];
        return '<button class="lvl" data-d="' + di + '" data-g="' + gi + '" data-i="' + li + '">' +
          '<span class="tag">' + esc(l.tag) + "</span>" +
          "<h3>" + esc(l.name) + "</h3><p>" + esc(l.blurb) + "</p>" +
          '<span class="go">' + (b != null ? "Again &rsaquo;" : "Start &rsaquo;") + "</span>" +
          (b != null ? '<span class="badge mc-best' + (b >= 75 ? " mc-done" : "") + '">' +
                       (b >= 75 ? "Learnt &middot; " : "") + "best " + b + "%</span>" : "") +
          "</button>";
      }).join("")).join("");

  [...document.querySelectorAll(".lvl")].forEach(b => b.onclick = () =>
    b.dataset.back ? home() : openLevel(+b.dataset.d, +b.dataset.g, +b.dataset.i));
  $("foot").innerHTML = esc(DATA.source) +
    "<br>Pictures drawn for this page.";
  show("home");
}

/* How much of a day is already learnt, for the card on the front screen. */
function dayDone(d){
  const best = MC.bests();
  let n = 0, t = 0;
  d.groups.forEach(g => levelsOf(g).forEach(l => { t++; if ((best[l.id] || 0) >= 75) n++; }));
  return [n, t];
}
"""

HOME_OLD = """function home(){
  $("eyebrow").textContent = DATA.eyebrow;
  $("title").innerHTML = DATA.title;
  $("sub").textContent = DATA.sub;
  $("fullpoem").innerHTML = poemHTML();
  Object.assign(bests, MC.bests());
  $("levels").innerHTML = DATA.levels.map((l, i) => {
    const b = bests[l.id];
    return '<button class="lvl" data-l="' + i + '">' +
      '<span class="tag">' + esc(l.tag) + "</span>" +
      "<h3>" + esc(l.name) + "</h3><p>" + esc(l.blurb) + "</p>" +
      '<span class="go">' + (b != null ? "Again &rsaquo;" : "Start &rsaquo;") + "</span>" +
      (b != null ? '<span class="badge mc-best' + (b >= 75 ? " mc-done" : "") + '">' +
                   (b >= 75 ? "Learnt &middot; " : "") + "best " + b + "%</span>" : "") +
      "</button>";
  }).join("");
  [...document.querySelectorAll(".lvl")].forEach(b =>
    b.onclick = () => start(+b.dataset.l));
  $("foot").innerHTML = esc(DATA.source) +
    "<br>Pictures drawn for this page; the poem is traditional and out of copyright.";
  show("home");
}"""

HOME_NEW = """function home(){
  $("eyebrow").textContent = DATA.eyebrow;
  $("title").innerHTML = DATA.title;
  $("sub").textContent = DATA.sub;
  $("fullpoem").innerHTML = DATA.poem.map((ln, i) =>
    '<div class="line' + (i && i % 5 === 0 ? " gap" : "") + '">' + esc(ln.t) + "</div>").join("");
  $("levels").innerHTML = DATA.days.map((d, di) => {
    const dn = dayDone(d);
    return '<button class="lvl" data-d="' + di + '">' +
      '<span class="tag">' + esc(d.name) + " &middot; " + esc(d.date) + "</span>" +
      "<h3>" + d.groups.map(g => esc(g.label)).join(", then ") + "</h3>" +
      "<p>" + esc(d.blurb) + "</p>" +
      '<span class="go">' + (dn[0] ? "Carry on &rsaquo;" : "Start &rsaquo;") + "</span>" +
      (dn[0] ? '<span class="badge mc-best' + (dn[0] >= dn[1] ? " mc-done" : "") + '">' +
               dn[0] + " of " + dn[1] + " learnt</span>" : "") +
      "</button>";
  }).join("");
  [...document.querySelectorAll(".lvl")].forEach(b =>
    b.onclick = () => dayScreen(+b.dataset.d));
  $("foot").innerHTML = esc(DATA.source) +
    "<br>Pictures drawn for this page.";
  show("home");
}"""

GROUP_CSS = """
/* #levels is a two-column grid, so a heading dropped into it becomes a cell
   and lands beside a level button instead of over its own section. It has to
   span every column. The home screen is light paper, not the dark page head,
   so these take the card's own ink -- written in the dark theme's colours the
   heading was white on cream and simply could not be seen. Both faults were
   invisible in the markup and obvious the moment the page was photographed. */
.grouphead{grid-column:1/-1;margin:20px 0 2px;padding:0 2px}
.lvl.backweek{grid-column:1/-1}
.grouphead strong{display:block;color:var(--ink);font-size:17px;letter-spacing:-.01em}
.grouphead span{display:block;color:var(--dim);font-size:13px;margin-top:3px}
"""


def main():
    if len(MINE) < 2:
        raise SystemExit("usage: gen_poemdays.py <spec.json> <out-dir-name>")
    spec = json.load(io.open(os.path.join(HERE, MINE[0]), encoding="utf-8"))
    out_dir = MINE[1]
    check(spec)

    src = io.open(SHELL, encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off the shell")

    art = spec.pop("art")
    # DATA sits after ART, so DATA is replaced first and ART's offsets hold.
    ab, ae = span(shell, "ART")
    db, de = span(shell, "DATA")

    # The shell reads DATA.lines and DATA.levels; both are filled in at the
    # moment a level is opened. Shipping them empty rather than absent means a
    # stray read gets an empty list instead of a crash.
    data = dict(spec)
    data["lines"] = []
    data["levels"] = []
    out = shell[:db] + json.dumps(data, ensure_ascii=False, indent=1) + shell[de:]
    drawn = "{\n\n" + "\n\n".join("%s: `%s`," % (k, art[k].strip()) for k in art) + "\n\n}"
    out = out[:ab] + drawn + out[ae:]

    out = sub(out, HOME_OLD, HOME_NEW + "\n" + DAYS_JS, "the home screen")
    out = sub(out, '$("quit").onclick = home;\n$("quit2").onclick = home;',
              '$("quit").onclick = () => dayScreen(DAYI);\n'
              '$("quit2").onclick = () => dayScreen(DAYI);', "the back buttons")
    out = sub(out, '  $("pick").onclick = home;',
              '  $("pick").onclick = () => dayScreen(DAYI);', "pick a level")
    out = sub(out, "</style>", GROUP_CSS + "</style>", "the group heading style")

    out = re.sub(r"<title>.*?</title>",
                 "<title>%s &mdash; Recitation</title>" % spec["plain"], out, count=1)

    # Nothing of the shell's own poem may survive. Fireflies shipped inside
    # three apps before anybody looked.
    for ghost in ("Fireflies", "firefly", "fireflies"):
        if ghost in out:
            raise SystemExit("  the shell's own poem is still in the file: %r" % ghost)
    for need in ("function dayScreen(", "function openLevel(", "DATA.poem"):
        if need not in out:
            raise SystemExit("  the day layer did not land: %r" % need)

    d = os.path.join(ROOT, "recitation", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8",
            newline="\r\n").write(out)

    print("  recitation/%s  %d lines over %d evenings  %.1f KB"
          % (out_dir, len(spec["poem"]), len(spec["days"]), len(out) / 1024))
    for day in spec["days"]:
        bits = ", ".join("%s (lines %d\u2013%d, %d levels)"
                         % (g["label"], g["from"] + 1, g["to"], len(g["modes"]))
                         for g in day["groups"])
        print("    %-18s %s \u2014 %s" % (day["name"], day["date"], bits))
    print("    pictures: %s" % ", ".join(sorted(art)))


main()

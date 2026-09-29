"""Generate a Sherlock section app from the existing one's shell.

The reading apps are one program with different data, so a new section is the
shell plus a new DATA block. Nothing here touches the theme: build_theme.py
injects that afterwards, the same as for every other app.
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


def data_span(html):
    """Locate the DATA object literal by brace matching."""
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


def missions_of(s):
    """A section's missions, however it spells them.

    A section covering one scene writes `mission` and `items`; one covering
    several writes `missions`, a list. Both end up as the same list here, so
    nothing downstream has to know which kind it was built from.
    """
    if "missions" in s:
        return s["missions"]
    m = s["mission"]
    return [{"id": "m1", "name": m["name"], "tag": m["tag"],
             "blurb": m["blurb"], "items": s["items"]}]


def items_of(s):
    """Every question in a section, across all of its missions."""
    out = []
    for m in missions_of(s):
        out.extend(m["items"])
    return out


def main():
    """usage: gen_sherlock.py <sections.json> <story title> [shell-dir]

    The story changes and the app does not, but both were written into this
    file — so a second story meant editing the generator rather than writing a
    spec for it."""
    if len(MINE) < 2:
        raise SystemExit("usage: gen_sherlock.py <sections.json> <story title> [shell-dir]")
    spec_name, story = MINE[0], MINE[1]
    shell_dir = MINE[2] if len(MINE) > 2 else "sherlock-speckled-5"

    src = io.open(os.path.join(ROOT, "reading", shell_dir, "index.html"),
                  encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off %s" % shell_dir)

    b, e = data_span(shell)
    old = json.loads(shell[b:e])
    videos = old["videos"]            # the reading-strategy videos carry over

    sections = json.load(io.open(os.path.join(SCRATCH, spec_name), encoding="utf-8"))

    # The shell escapes every question, option and explanation before printing
    # it, so markup written into a spec arrives on the screen as &lt;b&gt;
    # rather than as bold. Refuse it here rather than find it in a screenshot.
    tag = re.compile(r"</?[a-zA-Z]+ ?/?>")
    bad = []

    def asked(it):
        """Every string a child will read off this item, versions included."""
        for who in [it] + list(it.get("vs", [])):
            yield "q", who.get("q", "")
            yield "why", who.get("why", "")
            for o in who.get("opts", []):
                yield "option", o

    for s in sections:
        for n, it in enumerate(items_of(s), 1):
            for what, v in asked(it):
                if isinstance(v, str) and tag.search(v):
                    bad.append("%s q%d %s: %s" % (s["slug"], n, what, v[:60]))
    if bad:
        raise SystemExit("markup in text the shell escapes:\n  " + "\n  ".join(bad))
    for s in sections:
        data = {
            "chapter": "%s \u2014 pages %s" % (s["title"], s["pages"]),
            "bigQuestion": s["bigQuestion"],
            "passages": s["passages"],
            "videos": videos,
            "missions": missions_of(s),
        }
        out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]

        # The title, the eyebrow and the h1 are markup rather than data, so an
        # app built from another story's shell goes on naming that story until
        # it is told otherwise.
        out = re.sub(r"<title>.*?</title>",
                     "<title>%s \u2014 %s</title>" % (s["title"], story),
                     out, count=1)
        for rx, rep, why in (
            (r'<div class="eyebrow">[^<]*</div>',
             '<div class="eyebrow">Core Classics &middot; %s &middot; pages %s</div>'
             % (story, s["pages"]), "eyebrow"),
            (r"<h1>.*?</h1>", "<h1>%s</h1>" % s["title"], "heading"),
        ):
            out, n = re.subn(rx, rep, out, count=1, flags=re.S)
            if not n:
                raise SystemExit("the %s is not where it was" % why)

        d = os.path.join(ROOT, "reading", s["slug"])
        os.makedirs(d, exist_ok=True)
        io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)
        n = len(items_of(s))
        papers = max([len(it.get("vs", [])) for it in items_of(s)] or [0])
        print("  %-28s %2d questions in %d chapter%s%s  %6.1f KB" %
              (s["slug"], n, len(missions_of(s)),
               "" if len(missions_of(s)) == 1 else "s",
               ", %d papers" % papers if papers else "", len(out) / 1024))


main()

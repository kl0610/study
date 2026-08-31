"""Generate a Sherlock section app from the existing one's shell.

The reading apps are one program with different data, so a new section is the
shell plus a new DATA block. Nothing here touches the theme: build_theme.py
injects that afterwards, the same as for every other app.
"""
import io, json, os, re, sys

ROOT = r"C:\Users\kl\projects\study"
SCRATCH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
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


def main():
    src = io.open(os.path.join(ROOT, "reading", "sherlock-speckled-1", "index.html"),
                  encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off the source app")

    b, e = data_span(shell)
    old = json.loads(shell[b:e])
    videos = old["videos"]            # the reading-strategy videos carry over

    sections = json.load(io.open(os.path.join(SCRATCH, "sections.json"), encoding="utf-8"))
    for s in sections:
        data = {
            "chapter": "%s \u2014 pages %s" % (s["title"], s["pages"]),
            "bigQuestion": s["bigQuestion"],
            "passages": s["passages"],
            "videos": videos,
            "missions": [{
                "id": "m1",
                "name": s["mission"]["name"],
                "tag": s["mission"]["tag"],
                "blurb": s["mission"]["blurb"],
                "items": s["items"],
            }],
        }
        out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]

        # the source app's title was left over from the science app it was cloned from
        out = re.sub(r"<title>.*?</title>",
                     "<title>%s \u2014 The Speckled Band</title>" % s["title"],
                     out, count=1)

        d = os.path.join(ROOT, "reading", s["slug"])
        os.makedirs(d, exist_ok=True)
        io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)
        print("  %-28s %2d questions  %6.1f KB" %
              (s["slug"], len(s["items"]), len(out) / 1024))


main()

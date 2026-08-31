"""Generate science Chapter 4 from Chapter 3's shell plus its own DATA.

Same approach as the Sherlock sections: the science chapters are one program
with different data, so a new chapter is the shell and a new DATA block. The
theme is injected afterwards by build_theme.py.
"""
import io, json, os, re, sys

ROOT = r"C:\Users\kl\projects\study"
SCRATCH = os.path.dirname(os.path.abspath(__file__))
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


src = io.open(os.path.join(ROOT, "science", "g5-matter-ch3", "index.html"),
              encoding="utf-8").read()
shell = B.strip_theme(src)
if shell is None:
    raise SystemExit("could not strip the theme off Chapter 3")

b, e = data_span(shell)
old = json.loads(shell[b:e])

spec = json.load(io.open(os.path.join(SCRATCH, "ch4.json"), encoding="utf-8"))
data = {
    "chapter": spec["chapter"],
    "bigQuestion": spec["bigQuestion"],
    "passages": spec["passages"],
    "videos": old["videos"],
    "missions": [{
        "id": "m1",
        "name": spec["mission"]["name"],
        "tag": spec["mission"]["tag"],
        "blurb": spec["mission"]["blurb"],
        "items": spec["items"],
    }],
}
out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]

out = re.sub(r"<title>.*?</title>",
             "<title>How Matter Changes — Investigating Matter, Chapter 4</title>",
             out, count=1)

# Three bins need three columns. The old rule hard-coded two, so a third wrapped
# onto its own row; auto-fit sizes 2 or 3 evenly and still collapses on a phone.
old_css = ".slots.bins{grid-template-columns:1fr 1fr}"
assert out.count(old_css) == 1, out.count(old_css)
out = out.replace(old_css,
                  ".slots.bins{grid-template-columns:repeat(auto-fit,minmax(132px,1fr))}", 1)

d = os.path.join(ROOT, "science", "g5-matter-ch4")
os.makedirs(d, exist_ok=True)
io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)
print("  science/g5-matter-ch4  %d questions  %.1f KB" % (len(spec["items"]), len(out) / 1024))

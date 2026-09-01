"""Build a Saxon practice app from the previous night's missed homework.

    python gen_math.py math_l7.json saxon-c2-l7

Math works differently from the other subjects. There is no chapter to cover —
there is last night's written practice, and the handful of problems that came
back wrong. Each app is built for those, with different numbers, so it is
practice on the same skill rather than a second run at the same questions.

It is built on the history shell because that is the one carrying the full
review layer: back and skip, remembered answers, reveal after three misses,
retry, and marks that stay up. The parts of that shell that speak history — the
Big Question, the reading panel, the Core Knowledge footer — read from the data,
so here they become the idea being practised, a worked example, and Saxon.

Nothing from the book is reproduced. Every number is changed, and the citations
name the lesson a skill was taught in the way the book's own problem numbers do.
"""
import io
import json
import math
import os
import random
import re
import sys

RNG = random.Random(20260901)   # deterministic build; the app reshuffles at render

ROOT = r"C:\Users\kl\projects\study"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(ROOT, "_build"))
sys.argv = ["x"]
import build_theme as B          # noqa: E402
import review                    # noqa: E402

SHELL = os.path.join(ROOT, "history", "g5-maya-ch4", "index.html")


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


# --------------------------------------------------------------- the numbers
#
# Every arithmetic claim the app makes, recomputed here from scratch rather than
# read back out of the file it is checking. A wrong answer in a math app is
# worse than no app: it teaches the mistake. These run on every build.

def factors(n):
    out = set()
    for i in range(1, int(math.isqrt(n)) + 1):
        if n % i == 0:
            out.add(i)
            out.add(n // i)
    return sorted(out)


def single_digit_factors(n):
    return [f for f in factors(n) if f < 10]


def csv(nums):
    return ", ".join(str(n) for n in nums)


def arithmetic(spec):
    """Recompute every claim, and say which question it belongs to."""
    bad = []
    # "1, 2 and 4" and "1, 2, 4" are the same list; the app writes lists the way
    # a person would, so compare on a normalised form rather than on punctuation.
    txt = json.dumps(spec, ensure_ascii=False).replace(" and ", ", ")

    def want(claim, ok):
        if not ok:
            bad.append(claim)

    # factor lists quoted as correct answers
    want("single-digit factors of 396 = %s" % csv(single_digit_factors(396)),
         csv(single_digit_factors(396)) == "1, 2, 3, 4, 6, 9")
    want("single-digit factors of 84 = %s" % csv(single_digit_factors(84)),
         csv(single_digit_factors(84)) == "1, 2, 3, 4, 6, 7")
    want("all factors of 396 = %s" % csv(factors(396)),
         csv(factors(396)) in txt)
    want("all factors of 84 = %s" % csv(factors(84)), csv(factors(84)) in txt)

    # the divisibility tests, checked against the number they are offered for
    want("396 passes the tests for 2, 3, 4, 6 and 9",
         all(396 % d == 0 for d in (2, 3, 4, 6, 9)))
    want("396 fails the tests for 5, 7, 8 and 10",
         all(396 % d for d in (5, 7, 8, 10)))
    want("the test for 3 agrees with division on 396",
         (sum(int(c) for c in "396") % 3 == 0) == (396 % 3 == 0))
    want("the test for 9 agrees with division on 396",
         (sum(int(c) for c in "396") % 9 == 0) == (396 % 9 == 0))
    want("the test for 4 agrees with division on 396", (96 % 4 == 0) == (396 % 4 == 0))

    # common factors and GCF
    common = lambda a, b: sorted(set(factors(a)) & set(factors(b)))
    want("common factors of 28 and 42 = %s" % csv(common(28, 42)),
         csv(common(28, 42)) == "1, 2, 7, 14")
    want("gcf(28,42) = 14", max(common(28, 42)) == 14)
    want("4 divides 28 but not 42", 28 % 4 == 0 and 42 % 4)
    want("3 divides 42 but not 28", 42 % 3 == 0 and 28 % 3)
    want("factors of 28 = %s" % csv(factors(28)), csv(factors(28)) in txt)
    want("factors of 42 = %s" % csv(factors(42)), csv(factors(42)) in txt)
    want("factors of 24 = %s" % csv(factors(24)), csv(factors(24)) in txt)
    want("factors of 40 = %s" % csv(factors(40)), csv(factors(40)) in txt)
    want("common factors of 24 and 40 = %s" % csv(common(24, 40)),
         csv(common(24, 40)) == "1, 2, 4, 8")
    want("gcf(24,40) = 8", max(common(24, 40)) == 8)

    # every equation the app solves, worked independently
    for label, got, expect in [
            ("m - 47 = 156", 156 + 47, 203),
            ("12n = 156", 156 // 12, 13),
            ("w - 98 = 432", 432 + 98, 530),
            ("Ana's wrong w, 432 - 98", 432 - 98, 334),
            ("334 - 98 (fails the check)", 334 - 98, 236),
            ("w / 20 = 200", 200 * 20, 4000),
            ("Priya's wrong w, 200 / 20", 200 // 20, 10),
            ("240 / x = 16", 240 // 16, 15),
            ("n - 26 = 71", 71 + 26, 97),
            ("n + 34 = 90", 90 - 34, 56),
            ("7n = 168", 168 // 7, 24),
            ("2*3*n = 168", 168 // 6, 28),
            ("n / 12 = 30", 30 * 12, 360),
            ("50 - n = 18", 50 - 18, 32),
            ("60 / n = 12", 60 // 12, 5),
            ("15n = 195", 195 // 15, 13),
            ("15 * 180 (fails the check)", 15 * 180, 2700),
            ("x / 8 = 40", 40 * 8, 320),
            ("x / 8 = 7", 7 * 8, 56),
            ("8x = 40", 40 // 8, 5),
            ("x - 8 = 40", 40 + 8, 48),
            ("x + 8 = 40", 40 - 8, 32),
            ("8 / x = 4", 8 // 4, 2)]:
        want("%s -> %d, app says %d" % (label, got, expect), got == expect)
    want("$100.00 - $17.54 = $82.46", round(100.00 - 17.54, 2) == 82.46)

    # perfect squares
    sq = [i * i for i in range(1, 16)]
    want("squares 1..15 = %s" % sq, sq[:6] == [1, 4, 9, 16, 25, 36])
    want("50 is not a square", 50 not in sq)
    want("after 121 come 144, 169, 196", sq[sq.index(121) + 1:sq.index(121) + 4] == [144, 169, 196])
    want("squares list in the worked example", ", ".join(str(n) for n in sq[:14]) in txt)

    # grouping
    want("800/(40/2) = 40", 800 // (40 // 2) == 40)
    want("(800/40)/2 = 10", (800 // 40) // 2 == 10)
    want("36/(6/2) = 12", 36 // (6 // 2) == 12)
    want("(36/6)/2 = 3", (36 // 6) // 2 == 3)
    want("(4*5)*3 = 4*(5*3) = 60", (4 * 5) * 3 == 60 == 4 * (5 * 3))
    want("(9+7)+4 = 9+(7+4) = 20", (9 + 7) + 4 == 20 == 9 + (7 + 4))
    want("(2*6)*5 = 2*(6*5) = 60", (2 * 6) * 5 == 60 == 2 * (6 * 5))
    want("100/(10/2) = 20", 100 // (10 // 2) == 20)
    want("(100/10)/2 = 5", (100 // 10) // 2 == 5)
    want("(3+8)+5 = 3+(8+5) = 16", (3 + 8) + 5 == 16 == 3 + (8 + 5))
    want("(2*3)*4 = 2*(3*4) = 24", (2 * 3) * 4 == 24 == 2 * (3 * 4))
    return bad


def check(spec):
    """The faults worth catching before a ten-year-old finds them."""
    bad = arithmetic(spec)
    P = spec.get("passages", {})

    for s in spec["sets"]:
        n = 0
        for it in s["items"]:
            if it["type"] != "pick":
                continue
            n += 1
            where = "%s q%d" % (s["id"], n)
            if len(it["opts"]) != 4:
                bad.append("%s: %d options, want 4" % (where, len(it["opts"])))
            if len(set(it["opts"])) != len(it["opts"]):
                bad.append("%s: a repeated option" % where)
            if not isinstance(it.get("a"), int) or not 0 <= it["a"] < len(it["opts"]):
                bad.append("%s: answer index out of range" % where)
            if not it.get("why") or not it.get("cite"):
                bad.append("%s: missing why or cite" % where)
            # The tell that matters: a child who notices the right answer is
            # always the longest one stops reading the question.
            lens = [len(o) for o in it["opts"]]
            if lens[it["a"]] == max(lens) and max(lens) - sorted(lens)[-2] >= 6:
                bad.append("%s: correct option is the longest by %d characters"
                           % (where, max(lens) - sorted(lens)[-2]))

    # every highlight has to be findable in the passage it points at, or the
    # worked example opens and points at nothing
    for holder in [it for s in spec["sets"] for it in s["items"]] + [spec["build"]]:
        key = holder.get("p")
        if not key:
            continue
        if key not in P:
            bad.append("passage %r does not exist" % key)
            continue
        body = " ".join(P[key]["text"])
        hi = holder.get("hi")
        for h in (hi if isinstance(hi, list) else ([hi] if hi else [])):
            if h not in body:
                bad.append("highlight not in passage %r: %r" % (key, h[:60]))

    for key, p in P.items():
        if not p.get("title") or not p.get("cite") or not p.get("text"):
            bad.append("passage %r is missing title, cite or text" % key)

    b = spec["build"]
    right = [t for t in b["tiles"] if t["a"]]
    if len(right) != 2:
        bad.append("builder: %d correct tiles, the prompt says two" % len(right))
    if len(b["tiles"]) - len(right) < 3:
        bad.append("builder: too few distractors")
    if not b.get("answer") or not b.get("cite"):
        bad.append("builder: missing answer or cite")

    # Two to four questions per set. "Which Move?" grew to nine, which is not a
    # short set any more — it is a sitting, and the whole point of splitting the
    # practice up is that each piece can be finished in one go.
    # A set colour that the shell does not define renders as no colour at all,
    # which is silent and only visible on the page.
    shell_colours = {"--gold", "--stone", "--jade", "--red", "--sky"}
    for s in spec["sets"]:
        c = re.sub(r"var\(|\)", "", s.get("c", ""))
        if c not in shell_colours:
            bad.append("%s: colour %r is not one the shell defines" % (s["id"], s.get("c")))

    for s in spec["sets"]:
        n = len(s["items"])
        if not 2 <= n <= 4:
            bad.append("%s has %d questions; two to four per set" % (s["id"], n))

    # A tag reading "Lesson 6" on a page headed Lesson 7 says the page covers
    # Lesson 6. It does not — that is where the skill was first taught, which is
    # the book's bookkeeping and not something to put in front of a child.
    for s in spec["sets"]:
        if re.match(r"(?i)lessons?\s", s.get("tag", "")):
            bad.append("%s: the tag %r reads as a lesson this page is about"
                       % (s["id"], s["tag"]))

    # Two variations per kind is the standard, asked for after a set of six
    # questions that were really two questions asked three times each. More than
    # two only where a particular miss earns it, and then it is a deliberate
    # override rather than a spec that drifted.
    kinds = {}
    for s in spec["sets"]:
        for it in s["items"]:
            if it["type"] == "pick":
                k = it.get("kind")
                if not k:
                    bad.append("%s: an item with no kind" % s["id"])
                else:
                    kinds.setdefault(k, []).append(s["id"])
    cap = spec.get("maxPerKind", 2)
    for k, where in sorted(kinds.items()):
        if len(where) > cap and k not in spec.get("allowMore", []):
            bad.append("%d questions of kind %r (the standard is %d) in %s"
                       % (len(where), k, cap, ", ".join(sorted(set(where)))))

    # a worked example is more use with somewhere further to go
    for key, p in P.items():
        if not p.get("book"):
            bad.append("worked example %r does not point into the book" % key)

    # The builder is optional. It is a format rather than a miss, so on a night
    # when twelve questions are all aimed at real mistakes it does not make the
    # cut. The shell holds at most one, and reads DATA.build only when an item
    # of that type is rendered, so leaving it in the data unused is harmless and
    # makes swapping it back in one line.
    builds = sum(i["type"] == "build" for s in spec["sets"] for i in s["items"])
    if builds > 1:
        bad.append("%d build items; the shell holds one builder" % builds)

    # Twelve is the ceiling. A review that takes longer than the homework did is
    # not a review.
    total = sum(len(s["items"]) for s in spec["sets"])
    if total > spec.get("maxQuestions", 12):
        bad.append("%d questions; the cap is %d"
                   % (total, spec.get("maxQuestions", 12)))

    if bad:
        raise SystemExit("  refusing to build:\n    " + "\n    ".join(bad))


def spread(spec):
    """Shuffle each question's options so the answer index is not clustered.

    The app reshuffles at render, so this changes nothing a child sees — but the
    source is what the next person reads, and written out by hand these landed
    on index 0 every single time.
    """
    for s in spec["sets"]:
        for it in s["items"]:
            if it["type"] != "pick":
                continue
            right = it["opts"][it["a"]]
            RNG.shuffle(it["opts"])
            it["a"] = it["opts"].index(right)


# ------------------------------------------------------------------ the skin
#
# The shell says "Big Question" and "Student Reader" in a few places that are
# markup rather than data. Each is replaced by exact match and the count is
# asserted, because a silent no-op here ships a math app that calls itself a
# history chapter.

def reskin(out, spec):
    swaps = [
        (re.compile(r"<title>.*?</title>", re.S),
         "<title>%s</title>" % spec["title"]),
        (re.compile(r'<p class="eyebrow">CKHG[^<]*</p>'),
         '<p class="eyebrow">%s</p>' % spec["eyebrow"]),
        (re.compile(r"<h1>.*?</h1>", re.S), "<h1>%s</h1>" % spec["h1"]),
        (re.compile(r'<div class="bigq"><b>[^<]*</b>\s*\n?\s*[^<]*</div>'),
         '<div class="bigq"><b>%s</b>\n      %s</div>'
         % (spec["ideaLabel"], spec["bigQuestion"])),
        (re.compile(r"/\* Every question.*?\*/", re.S), spec["note"]),
        (re.compile(r'\$\("foot"\)\.innerHTML = "[^;]*?;', re.S),
         '$("foot").innerHTML = %s;' % json.dumps(spec["foot"], ensure_ascii=False)),
        # the builder's own miss line names the Big Question
        (re.compile(r'miss\(\{why:"Those facts are all true — but only "\+word\(N\)\+'
                    r'" of them answer the Big Question\.",'),
         'miss({why:"Those are all real equations — but only "+word(N)+'
         '" of them take that move.",'),
        (re.compile(r'"One of your "\+word\(N\)\+" is true, but it isn\'t evidence\."'),
         '"One of your "+word(N)+" is an equation, but not one that takes that move."'),
        (re.compile(r'wrong\+" of your "\+word\(N\)\+" are true, but they aren\'t evidence\."'),
         'wrong+" of your "+word(N)+" are equations, but not ones that take that move."'),
        (re.compile(r'<div class="review"><b>Say it out loud</b>'),
         '<div class="review"><b>The idea</b>'),
    ]
    for rx, to in swaps:
        out, n = rx.subn(lambda m, t=to: t, out, count=1)
        if not n:
            raise SystemExit("  reskin: nothing matched %s" % rx.pattern[:70])
    return out


def main():
    spec_name = sys.argv[1] if len(sys.argv) > 1 else "math_l7.json"
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "saxon-c2-l7"
    spec = json.load(io.open(os.path.join(HERE, spec_name), encoding="utf-8"))
    spread(spec)
    check(spec)

    src = io.open(SHELL, encoding="utf-8").read()
    shell = B.strip_theme(src)
    if shell is None:
        raise SystemExit("could not strip the theme off the shell")
    shell = review.unpatch(shell)

    b, e = data_span(shell)
    data = {"bigQuestion": spec["bigQuestion"],
            "readCta": spec["readCta"], "readLabel": spec["readLabel"],
            "vocabLabel": spec["vocabLabel"], "backLabel": spec["backLabel"],
            "sets": spec["sets"], "build": spec["build"],
            "passages": spec["passages"]}
    out = shell[:b] + json.dumps(data, ensure_ascii=False, indent=1) + shell[e:]
    out = reskin(out, spec)

    d = os.path.join(ROOT, "math", out_dir)
    os.makedirs(d, exist_ok=True)
    io.open(os.path.join(d, "index.html"), "w", encoding="utf-8", newline="\r\n").write(out)

    n = sum(len(s["items"]) for s in spec["sets"])
    print("  math/%s  %d sets, %d items  %.1f KB" % (out_dir, len(spec["sets"]), n, len(out) / 1024))
    for s in spec["sets"]:
        kinds = {}
        for i in s["items"]:
            kinds[i["type"]] = kinds.get(i["type"], 0) + 1
        print("    %-3s %-24s %s" % (s["id"], s["name"],
              " ".join("%s:%d" % kv for kv in sorted(kinds.items()))))
    print("    %d worked examples, every highlight resolves" % len(spec["passages"]))


main()

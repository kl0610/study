# StudyCraft

Practice apps for Myles, a 5th grader, across five subjects. Static HTML served
from GitHub Pages at **kl0610.github.io/study/**. No build step for the apps
themselves — each is a self-contained `index.html`. The only build is the theme
injector.

```
study/
├── index.html                          hub — collapsible subject list
├── assets/                             Minecraft sprites (24 files)
├── _build/                             theme source + injector + tests
│   ├── mc.css  mc.js                   the theme engine
│   ├── build_theme.py                  injects the theme into every app
│   └── test_theme.js                   node tests for the engine
├── history/…  science/…  reading/…  spelling/…  vocabulary/…
└── CLAUDE.md                           this file
```

---

## Rules that must not be broken

**Never use Myles's name in question scenarios.** Use Ana, Jamal, Priya.

**Build from the Teacher's Guide, not the reader alone.** The TG says what is and
isn't assessed at grade level. Respect its boundaries even when the reader covers
more. Never invent curriculum content — if the source isn't readable, stop and say so.

**These are reviews, not tests. 5–10 minutes.** Question count follows the
material: a 4-page chapter gets ~7 questions, an 8-page chapter ~9. Never pad a
chapter to match another. The goal is that he understands the chapter, not that
he's been examined on it.

**Passages must be verbatim.** Every quoted excerpt is asserted as a substring of
its source before shipping. See "Verification" below.

**No context-inference vocabulary formats** — don't ask "which sentence uses X to
mean Y." Test each sense separately against the TG's own wording. This rule is
about *vocabulary*; inference about a *story* is the point of Reading and is expected.

**Spoilers count as errors.** For an unfinished story, a wrong-answer distractor
can reveal the ending just as easily as a correct answer. Scope tests block
forbidden words until the relevant page is reached.

**Don't hand-edit the theme inside an app's `index.html`.** Edit `_build/mc.js`
or `mc.css` and re-run `build_theme.py`, or the copies drift.

---

## Standing design decisions

- **Answer options shuffle at render**, so there is no fixed key to notice. Keep it.
- **Multi-select is a known stumbling block** — he stops at the first right answer.
  Label it explicitly and, where the format allows, require a verdict on every option.
- **Never use HTML5 drag-and-drop** — it fails silently on touch. Pointer events only.
- **Hearts never block progress.** No death, no game over. Low health only shrinks
  the end-of-level loot. A kid who is stuck must never hit a wall.
- **The hotbar only ever fills.** Nothing earned is taken away.
- **Spelling free-typing levels must not leak word length or letter positions** in
  feedback. Saying "3 letters are off" is fine with boxes, forbidden without them.
- **Spelling Challenge 2 is a self-check.** It can only verify mechanics (word used,
  6+ words, capitalised, punctuated, not a copy of the example) and it says so out
  loud. Keith chose this over wiring up an API. Do not turn it into a fake validator.
- Wrong answers open the source passage. Excerpt first, then the video, then the
  full page, then a pinned "try again". Auto-open on the first miss only.

---

## Returned tests → next week's practice

Graded work goes in `_returned/<subject>/`. **It is gitignored and must stay
that way** — this repo is public and serves GitHub Pages, so a scan carrying a
name, handwriting and a teacher's marks cannot be pushed. The analysis derived
from it stays local too. What gets committed is the questions it produces.

The loop, per returned test:

1. **Read it against the source**, not from memory. Every miss is checked
   against the book in `_source/`.
2. **Classify each miss by cause**, because the causes need opposite responses:
   didn't know it · confused two specific things · misread the question · knew
   it and slipped · ran out of time. The last two mean *do not drill this* —
   practising something already known is how a kid learns to hate practising,
   and "wrong on a page" is not "does not know".
3. **Write `_returned/<subject>/analysis/<date>.md`** — each miss, its cause,
   and the page the call turns on.
4. **Update `_returned/<subject>/focus.json`** — `weight` over-samples a
   concept, `retire` drops one that has been solid several sittings running.
5. **Re-run the generator.** `_build/generators/gen_vocab.py` reads focus.json
   and tilts the forms; the comprehensive final still covers every meaning, so
   retiring something narrows practice without creating a hole in the test.

No focus.json means an even spread, which is right for the first week of a
unit. `_returned/README.md` has the file format and the naming convention;
`focus.example.json` shows the shape.

The generators live in `_build/generators/`. They are the only way these apps
get rebuilt, so a change to question content belongs there, not in an app's
HTML.

---

## Math — the nightly loop

Math is not a chapter to cover. It is last night's written practice and the
handful of problems that came back wrong, so it goes lesson by lesson, on the
days there is something to review.

Per night:

1. **Read the problems he missed** out of `_private/math/` — the lesson number
   he was assigned locates them (`printed = PDF - 21`, confirmed at both ends).
2. **Classify the miss**, the same way returned tests are classified. Math
   misses split cleanly, and the kinds want opposite responses: *read the
   question wrong* (asked for single-digit factors, gave all of them), *did not
   know the term* (perfect square), *knew the idea but stopped early* (listed
   both factor lists and never compared them), *right idea, inverse operation*
   (subtracted where he needed to add). The last is worth the most practice and
   is the easiest to miss, because the work looks right all the way down.
3. **Write `_build/generators/math_l<N>.json` and run `gen_math.py`.** Different
   numbers throughout — the point is practice on the skill, not a second run at
   the same questions, and it keeps the book out of the repo.
4. **Twelve questions is the ceiling, two to four per set, two variations per
   kind.** A review that takes longer than the homework did is not a review. All
   three are enforced by `gen_math.py`. The practical effect is that every
   question has to be aimed at a miss: twelve buys two variations on six of
   them, and nothing else fits. A question that is merely good — a harder form
   he did not get wrong, a format worth practising — stays in the spec unused
   and waits for a night that has room.
5. **Tag each set with the homework problems it came from**, never with the
   lesson a skill was first taught in. Saxon numbers every written-practice
   problem with the lesson it reviews, which is how the misses get located — but
   a set tagged "Lesson 6" on a page headed "Lesson 7" reads as a claim about
   what the page covers. The teaching lesson belongs in each answer's citation,
   where it reads as a reference. Both are checked.
6. **Two variations per kind of question is the standard.** One "do it" and one
   "spot the slip" covers a skill; six of the same thing is padding, and it is
   what a review is not for. More only when Keith asks for it on a particular
   miss. `gen_math.py` counts the `kind` on each item and refuses to build past
   the cap, so a spec cannot drift back.
7. **Check the numbers against the lesson's own examples before using them.**
   Lesson 6 works the greatest common factor of 18 and 30 as Example 3 — a
   question on that pair is practice on the example, not on the skill.
8. **Give each worked example the lesson's own method underneath it**, in the
   lesson's own words (minuend, subtrahend, addend, divisor, quotient, and the
   rule for each), plus a `book` line saying where the same kind is worked. That
   is somewhere further to go than what we wrote, without reproducing it.
9. Where the miss was the operation rather than the arithmetic, **ask which move
   is needed, not what the answer is**: "add 47 / subtract 47 / multiply by 47 /
   divide by 47". That is the thing being practised, and it takes ten seconds a
   question instead of two minutes.

The app is built on the history shell, which is the one carrying the full review
layer — back and skip, remembered answers, reveal after three misses, retry,
marks that stay up. `gen_math.py` reskins the history-specific parts, all of
which now read from the data: the Big Question becomes the idea being practised,
the reading panel becomes a worked example, the footer becomes Saxon.

**Every number is verified twice, by two programs sharing no code.**
`gen_math.py` refuses to build unless it can recompute each claim from scratch,
and `test_math.js` recomputes them again from the shipped file. A math app that
is confidently wrong is worse than no app — it teaches the mistake.

**Nothing from `_private/` is committed.** What ships is questions with
different numbers, citing the lesson a skill was taught in.

---

## Curriculum sources

Source books live in two places, and the difference is a licensing one, not a
filing one.

### `_source/` — committed

Core Knowledge material under CC BY-NC-SA 4.0. It may be redistributed with
attribution, so it is in the repo and a fresh clone has it.

```
_source/history/  CKHG_G5_U2_MayaAztecInca_Teacher-Guide.pdf      110 pp
                  CKHG_G5_U2_MayaAztecInca_Student-Reader.pdf      76 pp
                  CKHG_G5_U2_MayaAztecInca_Timeline.pdf            11 pp
                    — carries each chapter's Big Question; useful for
                      sequencing and for the hub's chapter titles
_source/science/  CKSci_G5U1_Matter_TG.pdf                        173 pp
                  CKSci_G5U1_Matter_SR.pdf                         50 pp
_source/reading/  CC_SherlockHolmes_Reader_W1.pdf                 228 pp
                  Core-Classics-Sherlock-Holmes-Teacher-Guide.pdf  92 pp
```

`_source/spelling/` and `_source/vocabulary/` also exist and are **gitignored** —
weekly worksheets are personal study use only.

### `_private/` — never committed

**Purchased books. Nothing under `_private/` may be committed, ever.** They are
not Creative Commons and not ours to redistribute, and this repo is public and
serves GitHub Pages, so a commit would publish them. `.gitignore` covers the
whole directory; check `git status` shows nothing under it before committing.

```
_private/math/        Student+eBook+Course+2.pdf      Saxon Course 2
_private/vocabulary/  Wordly Wise Book 6 pages, arriving week by week
```

Read them freely, quote sparingly, cite the page — the same as any other source.
What gets committed is the questions built from them.

### Reading the PDFs

They extract text with `pypdf` — quote the wording and cite the page from the
PDF rather than from memory of the original work. Core Classics in particular is
an abridgement: it cuts and rewords, so the original Doyle is not a safe source.
Printed page numbers are offset from PDF page indices (in the Sherlock Reader,
`printed = PDF − 13`); confirm the offset per book against a page you can match.

**Math is Saxon Course 2, not Course 1.** Course 2 is normally a sixth-grade
text — this is an accelerated placement, so pitch questions to **the book, not to
a generic grade-5 level**. Do not simplify a problem because it looks hard for
fifth grade; if it is in Course 2 it is what he is being taught. Nothing has been
built for Math yet.

Anything on this machine for Wordly Wise Book 5, or Saxon Parts 8–9, is a
fourth-grade leftover — ignore it.

**CKHG and CKSci Teacher Guides and Student Readers are free PDFs on
coreknowledge.org** and can be pulled with `web_fetch` when a local copy is
missing — no upload needed. Example:
`coreknowledge.org/wp-content/uploads/2019/09/CKSci_G5U1_Matter_TG.pdf`

**CKSci reader→lesson mapping is not a constant offset.** Confirmed:
SR1→L2, SR2→L3, SR3→L5, SR4→L7, SR5→L9, SR6→L11. Lesson 4 is a demonstration
lesson with no reader chapter. Verify per unit; don't assume.

**Licensing.** CKHG, CKSci, and Core Knowledge **Core Classics** (the abridged
Sherlock Holmes) are CC BY-NC-SA 4.0 — quote verbatim with the attribution footer.
Wordly Wise and the weekly spelling lists are personal study use only; don't
reproduce them beyond what the app needs.

Required footer, on every app:
> Based on an original work of the Core Knowledge Foundation (coreknowledge.org).
> This does not imply that the Core Knowledge Foundation endorses this work.

---

## Verification — run before every commit

```bash
cd study/_build
python3 build_theme.py --retheme   # --retheme is required for engine changes
for t in test_*.js; do node $t; done   # theme, history, reading, vocab, math
```

`build_theme.py` exits 0 whether or not a patch found its anchor, and a
silently skipped patch has shipped three times. After a change to `review.py`
or a generator, **assert each patched piece is present in the output** and
parse-check the generated scripts (`node --check`) rather than trusting the
exit code.

And for any new content:

- **Excerpts verbatim.** Assert each is a substring of its passage, and each
  passage a subsequence of the source PDF. Extraction gotchas: CKHG sidebars
  splice word-by-word under `pdftotext -layout`; Core Classics hyphenates across
  line breaks (`re.sub(r'-\s*\n\s*','',raw)`); two-column boxes need `-raw`.
- **Perfect-play simulation.** A few thousand runs; every item must grade clean.
- **Scope test.** No distractor may reference material past the assigned pages.

Bugs that have shipped before, worth guarding against:
- **Falsy-zero** — `!chip.at` where `at` can legitimately be slot `0`.
- **CSS specificity** — `#typed{opacity:0}` hid a second input sharing that id.
- A definition truncated at 150 chars passed a 40-char prefix check. Compare full strings.

---

## Working style

Small commits, one change each, with a message saying what changed and why.
Run the tests before committing. If a source can't be read or a fact can't be
verified, say so rather than filling the gap.

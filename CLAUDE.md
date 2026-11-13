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

## Vocabulary — what a week ships

**From Word List 8 on (11 Nov 2026), every week is four apps, not three.**
Earlier lists are not being gone back over; they stay as they are.

| App | Spec | Built with |
|---|---|---|
| `ww6-lessonN` | `ww6_lN.json` | `gen_sheet.py ww6_lN.json ww6-lessonN` |
| `ww6-lessonN-test` | `ww6_lN.json` | `gen_vocab.py ww6_lN.json ww6-lessonN-test` |
| `ww6-lessonN-exam` | `wwtest_lN.json` | `gen_wwtest.py wwtest_lN.json ww6-lessonN-exam` |
| `ww6-lessonN-sentences` | `sentences_lN.json` | `gen_wwtest.py sentences_lN.json ww6-lessonN-sentences` |

The fourth is **Practice sentences**, added because Keith asked for more of
what the end section of the teacher's real paper does: use one or two of the
week's words in a sentence of your own. It is the same `say` machinery as the
rehearsal's Part V, on the same shell, but it is the whole app rather than five
questions at the end of one.

What a sentences spec has to be:

- **One part, `"type": "say"`, every item worth 2 points.** `"outof"` declares
  its own total, so it is not refused for not being 50 — but the rehearsal next
  door still is, and must stay out of 50.
- **Eight prompts: four asking for two words in one sentence, four for one.**
  The pairs are the point. Picking two words that have to sit in one sentence
  is where he has to actually hold both meanings, and a set of eight singles is
  a set of eight easy ones.
- **Every headword on the list asked for somewhere.** `gen_wwtest.py` refuses a
  set that leaves one out, reading the list from the `"from"` spec next door.
- **A `"rule"` line**, or the page tells him he is sitting the teacher's
  five-part paper.
- **Prompts may name their words in bold** — unlike Part III, where naming the
  word would hand over the answer, here the word *is* the task.
- **A model answer that would itself pass the app's gate**: uses the words, six
  words or more, capitalised, finished with a full stop. He marks his own
  against it, 2 / 1 / 0. Do not turn that into a machine score — see Spelling
  Challenge 2 above; it is the same decision for the same reason.

### The meaning check — every written answer carries one

Keith, 11 Nov 2026: *"I am able to make sentences, but ones that don't really
make sense. Are you able to at least check that the sentence makes sense and is
used in the correct context? If it works mechanically, you can say so, but you
also say that it doesn't really make sense and maybe give it another try."*

He is right that this was the hole. *"The expedition went on an expedition
across the expanse."* uses the words, runs long enough and is punctuated, and
the app used to send it straight through to full marks.

There is no model behind a page on github.io and there is not going to be one,
so the page looks instead for the evidence a right answer cannot help leaving
behind: something musical in a sentence about *accompany* in that sense, a
thing the *expanse* is an expanse of, both halves of a question that asks for a
difference. Every `say` item carries a `"sense"` block saying what its answer
has to show, and `gen_wwtest.py` **refuses to build a written answer without
one** — there is no flag to forget.

```json
"sense": {
  "ask":   "the nudge under the bullets, in words he can act on",
  "show":  [{"of": ["piano", "sing", "choir"], "why": "what is missing, in his words"}],
  "avoid": [{"of": ["translat", "is when"],    "why": "why this is the wrong track"}],
  "note":  "optional: why this block is the shape it is, for whoever edits it next"
}
```

Entries match a word plus an ending (`cross` covers crossing, `clums` covers
clumsy), or a whole phrase if they contain a space. They do **not** match any
word that merely starts with them — `win` used to match *window*, `sea`
matched *search* — so a group is a list of short stems, not prefixes.

Four rules, every one of them learned the hard way:

1. **It never blocks.** A doubt shows the reason, offers another go, and takes
   his word for it if he says the sentence is right. Guessing wrong about a
   good sentence must not cost him a right answer, so the page says *"Kept,
   because you said so"* rather than pretending he was right.
2. **One copy of the code.** `_build/generators/sense.js` is inlined into the
   app, required by the suites, and run by the build over every model answer.
   A model answer its own check would turn back cannot ship.
3. **Tune it against sentences, never by eye.** `node _build/test_sense.js`
   holds good sentences that must be let through and bad ones that must be
   stopped. The first sweep flagged **five of twenty-seven good sentences**;
   nothing else noticed, and nothing else could have. It also shows every
   block a sentence built to say nothing, and fails any block that shrugs.
4. **Add three or four good sentences and two bad ones for each new week** to
   `TRIALS` in that file. It prints how many written answers have nobody
   vouching for them, so skipping it says so out loud instead of going quiet.

### A section, when a week turns out to be short

Keith, 12 Nov 2026, with page 85 of the Word List attached: *"we forgot to
include these three words for Lesson 8. Make a special section for these three
missing words and include it with Lesson 8 so that he can study the same way as
the rest of the chapter."*

Lesson 8 was built from pages 83–84 and shipped twelve headwords. The list has
fifteen: **skirmish, supplement and territory** are on page 85, and all four of
the week's apps were missing them.

They were **not** folded into `ww6_l8.json`. Two things stop that, and both are
rules worth more than the tidiness:

- the rehearsal next door is the teacher's paper and has to stay **out of 50**,
  so three more words cannot be added to a part without unbalancing it;
- `gen_wwtest.py` refuses a sentences set that leaves a headword out, reading
  the list from the `"from"` spec — so widening that list fails the build of
  an app that is already right.

So a short week gets a **section of its own**, built from the same generators:

| App | Spec | Built with |
|---|---|---|
| `ww6-lesson8-extra` | `ww6_l8_extra.json` | `gen_sheet.py ww6_l8_extra.json ww6-lesson8-extra` |
| `ww6-lesson8-extra-exam` | `wwtest_l8_extra.json` | `gen_wwtest.py wwtest_l8_extra.json ww6-lesson8-extra-exam` |

What makes it a section rather than a paper:

1. **It declares its own total** with `"outof"`, and **writes its own `"rule"`
   line**. Leaving the rule line out is what makes the page tell him he is
   sitting the five-part fifty-point paper, so the rule line is the mark that
   says he is not. `test_wwtest.js` tells the three kinds of app apart by it
   and nothing else — not by a list of directory names, which goes quiet.
2. **It keeps all five shapes**, including the two he cannot tap his way
   through. A section that drops Part III and Part V drills the easy half.
3. **A few words he already knows are mixed into Part I and Part II**, because
   that is how the three will arrive on the paper: among the other twelve.
4. **The heading says which slice of the list it is.** Two tiles on the hub
   both opening a page headed "Word List 8" are two tiles he cannot tell apart
   — `gen_sheet.py` now carries whatever the spec's lesson name says after the
   number into the `<h1>`, and `test_vocabsheet.js` fails a part-sheet headed
   like the whole list. Nothing but looking at the rendered page found that.

And the thing that caused it: **the word list came as a scan, and the scan was
short by a page.** Count the headwords against the book before building a
week — fifteen is the usual size of a Wordly Wise list, and twelve should have
been the question it was.

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
                    — Book 1, Investigating Matter. Chapters 1–6, all built.
                  CKSci_G5U2_Ecosystems_TG.pdf                    180 pp
                  CKSci_G5U2_Ecosystems_SR.pdf                     64 pp
                    — Book 2, Energy and Matter in Ecosystems. Chapters 1–8,
                      all built. `printed = PDF − 5`, confirmed at both ends.
_source/reading/  CC_SherlockHolmes_Reader_W1.pdf                 228 pp
                  Core-Classics-Sherlock-Holmes-Teacher-Guide.pdf  92 pp
```

**Science goes book by book, and there will be more books.** Each book is its
own group on the hub: a row carrying a `book` and no `href` renders as a
heading, and every filter that skips unbuilt rows skips those too. Chapter 1 of
one book is not chapter 1 of the next, so never merge two books into one run of
numbers. The newest book goes at the top of the section.

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
Printed page numbers are offset from PDF page indices. Confirm the offset per
book against a page you can match — and where the book prints its own page
number, read it rather than counting:

```
Sherlock Reader   printed = PDF − 13   PDF 116 is printed 103
CKSci G5 Unit 2   printed = PDF − 5    chapter 2 opens on 11, glossary on 53
Saxon Course 2    printed = PDF − 21   confirmed at both ends
CKHG / CKSci SR   printed = PDF − 6
```

The Sherlock offset has been written down wrong here in both directions — first
−13, then "corrected" to −12, and it is −13. Do not reason about it; read it.
Every page of that book states its own number twice, in the running head and
again in the printer's mark at the foot, and the two agree:

```python
for i in (114, 115, 116):                     # 1-based PDF page
    t = r.pages[i - 1].extract_text()
    print(i, re.findall(r"Page (\d+)\s*$", t.strip()))     # 101 102 103
```

The apps built under either wrong offset still cite the right pages, because
their text was located by searching for it rather than by arithmetic. Keep doing
that: find the sentence, then read the page number off the page it landed on.

### Ten minutes a section, and what that buys

**A section is one night's homework and has to be answerable in ten minutes end
to end** — not ten minutes a chapter. That works out at about twelve questions,
which for a multi-chapter section is three or four per chapter and a two-minute
sitting he can finish.

This was the rule for science from the start and nobody carried it across to
reading: The Engineer's Thumb and The Blue Carbuncle both shipped as four
chapters of five minutes, twenty minutes each, because the figure on a chapter
card is typed by hand and nothing added the cards up. `_build/test_pages.js` adds
them up now, and also refuses a chapter whose claimed minutes do not match its
question count — so the budget cannot be met by writing a smaller number.

**Aim the cut at the questions that ask which detail it was.** What a section is
for is the plot — what happened and what it cost — and the characters. Keep the
turns, the decisions and the places where one character pushes back at another;
drop the inventory. The section builders select from a `KEEP` table rather than
deleting anything, so the unselected questions stay written and putting one back
is one line.

### A new Sherlock story, or a new block of one

**Start at `_build/generators/sherlock/README.md`** — it holds the passages, the
questions, the builders with all their checks, the browser probe, and the order of
operations. Each builder reproduces its shipped spec byte for byte, so that is the
first thing to run if anything there looks stale.

One spec file per story, in `_build/generators/`: `sections_engineer.json`,
`sections_carbuncle.json`. Build with the newest app as the shell, so the block
inherits whatever the shell layer has learned since:

```
python _build/generators/gen_sherlock.py sections_carbuncle.json \
    "The Adventure of the Blue Carbuncle" sherlock-engineer-3
```

Then register it in `build_theme.py` (`dragon` lists every mission id), add the
hub row (`ids` lists them too), `--retheme`, and run the suites.

**Each reading stops one page short of its own reveal, so each needs its own
spoiler list.** Pages 103–120 end before Holmes explains the circle; 126–136 end
before the goose is opened. A distractor that reaches past the reading answers a
question he has not read yet, and one did. Both the section builder and the
`AHEAD` table in `_build/test_papers.js` carry the list; the suite fails on a
versioned app that has no entry, which is the reminder.

**A suite that names one app goes quiet when the second arrives.** `test_papers.js`
was written around `sherlock-engineer-3` and saw nothing of the next day's app
— a hundred versions unchecked, for the second time in two days. It now finds
versioned apps by looking for `vs`. When a check must read one app's copy of
shell code, also assert the *shape* of that code in every app: the behaviour
section lifts `verCount()` out of the first versioned app it finds, so breaking a
different app's copy was invisible until a whole-site check was added.

**Two things the PDF does that break verbatim checks on this story.** A sentence
runs across a page break with the running head *and* an illustration caption
wedged into the middle of it; and a caption is itself text you may want to quote.
So check each sentence against two views of the pages — furniture stripped, and
furniture intact — and accept it in either. Neither view can admit text that is
not in the book. Keep the reader's own spellings: this edition prints
*discolored*, *endeavored*, *odor*.

### Five papers per mission

An item in a mission spec may carry `vs`, a list of complete versions of itself:

```json
{"type": "pick", "p": "horse", "hi": ["fresh and glossy"],
 "vs": [{"q": "...", "opts": ["...", "...", "...", "..."], "a": 0, "why": "..."},
        ... four more ...]}
```

Rules that matter, all enforced by `_build/test_papers.js` and by the section's
own builder:

- **What the machinery needs stays on the item**, not in the version: `p`, `hi`,
  `type`. `leadUp()`, the log, the retake and the excerpt all index `M.items`
  and know nothing about versions, and they stay that way.
- **One version for a whole run.** `verCount()` is the *shortest* `vs` in the
  mission, so `VER` is never an index some item has not got. `view(it)` merges
  `vs[VER]` over the item and deletes `vs`.
- **Only a full run turns the page** (`if(!RUNPART && verCount() > 1)`). A
  correction round is the same paper looked at again — the excerpt he has just
  read answers *that* wording.
- **"Run the whole thing again" must go through `fullRun()`**, which re-reads
  the stored number. Calling `startRun()` directly reruns the paper that has
  just been finished, and nothing else in the app would notice.
- Five wordings that are actually different, five sets of wrong answers that are
  actually different, an answer that does not sit in the same slot on all five,
  and no version offering as a wrong answer what another version marks right.

A mission app with no `vs` anywhere is unchanged: `verCount()` is 1, `VER` stays
0, `view()` hands the item straight back.

**Anything that reads a question must walk its versions.** `test_pages.js`
checked `it.q` and `it.opts`, so on the first app with versions in it the markup
check and the option-letter check both found nothing and passed — a hundred
versions unexamined. Grep for `.opts` and `it.q` in `_build/test_*.js` before
adding a spec shape.

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

**Layout can be measured, not argued about.** Chrome and Edge are both on this
machine, and a page served by `python -m http.server 8765` renders headlessly:

```bash
chrome --headless=new --window-size=1000,760 --virtual-time-budget=6000 \
       --user-data-dir=<scratch> --dump-dom    http://127.0.0.1:8765/<app>/
chrome --headless=new ...       --screenshot=<file.png>   http://...
```

Append a probe to a throwaway copy of the page that writes
`getBoundingClientRect()`, a computed style, or `elementFromPoint()` into a div,
and `--dump-dom` hands it back. That is how the HUD-over-the-bar bug was finally
settled; reading the CSS had already produced two confident wrong answers.

Bugs that have shipped before, worth guarding against:
- **Falsy-zero** — `!chip.at` where `at` can legitimately be slot `0`.
- **CSS specificity** — `#typed{opacity:0}` hid a second input sharing that id.
- A definition truncated at 150 chars passed a 40-char prefix check. Compare full strings.
- **`offsetParent` is null for `position:fixed`**, so it cannot answer "is this
  element on screen". `getClientRects().length` can.
- A DOM stub that gives every element a truthy `offsetParent`, or throws away
  `style.setProperty`, cannot see either of the two bugs above. Stub the shape
  of the thing being stood in for.

---

## Working style

Small commits, one change each, with a message saying what changed and why.
Run the tests before committing. If a source can't be read or a fact can't be
verified, say so rather than filling the gap.

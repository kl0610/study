# Sherlock reading sections

Everything needed to rebuild or extend the Sherlock reading apps. These were
written in a scratch directory for the first few weeks; they live here now
because a session's scratch directory does not survive a restart and the
unselected questions existed nowhere else.

Each builder reproduces its shipped `sections_*.json` byte for byte. That is the
check to run first if anything here looks stale:

```
python _build/generators/sherlock/build_carbuncle3.py
git diff --quiet _build/generators/sections_carbuncle.json && echo same
```

## What is where

| File | Holds |
|---|---|
| `<story>_text.py` | the passages, quoted word for word from the reader |
| `<story>_q12.py`, `<story>_q34.py` | the questions, five versions of each |
| `build_<story>.py` | the checks, and the writer for `sections_*.json` |
| `probe_section.py` | plays a section twice in headless Chrome |

Prefixes: `eng3_` = The Engineer's Thumb pages 103–120. `carb_` = The Blue
Carbuncle 126–136, `carb2_` = 137–146, `carb3_` = 147–156. `build_engineer.py`
and `build_engineer2.py` are the two earlier blocks (87–94, 95–103); they carry
their questions inline and have no versions.

## Building the next section

1. **Find the pages.** Printed page = PDF page − 13 in this reader. Do not
   reason about it; read the number off the page — it is stated twice, in the
   running head and in the printer's mark at the foot.
2. **Copy the three newest files** (`carb3_text.py`, `carb3_q12.py`,
   `carb3_q34.py`) and the builder, bump the prefix, and rewrite the content.
3. **Retarget the builder**: `SLUG`, `FIRST`/`LAST`, `SECTIONS`, `ORDER`,
   `SPOILERS`, the title, pages and big question. A copied builder arrives with
   the *previous* reading's sections and spoiler list, which is the fault that
   has bitten this project more than any other — an app generated from another
   app's shell inherits that app's content.
4. **Run the builder** until it stops refusing. It will refuse for a length tell
   (fix by filling out the short distractors, not by trimming the answer), for
   markup the shell would escape, for a word that reaches past the reading, and
   for the word "chapter".
5. **Build, register, wire, re-theme:**
   ```
   python _build/generators/gen_sherlock.py sections_carbuncle.json \
       "The Adventure of the Blue Carbuncle" sherlock-engineer-3
   ```
   then the entry in `build_theme.py` (`dragon` lists every mission id), the hub
   row in `index.html` (`ids` lists them too), an `AHEAD` entry in
   `_build/test_papers.js`, and `python _build/build_theme.py --retheme`.
6. **Run every suite**, then `probe_section.py <slug>`.

Build the app from the newest existing app as its shell, so it inherits whatever
the shell layer has learned since. If that shell was just regenerated it is
un-themed and `strip_theme` will refuse — `--retheme` first.

## The rules these enforce

- **Twelve questions, four sections of three, about eight minutes.** A section is
  one night's homework and has to be answerable in ten minutes end to end, not
  ten minutes a section. `test_pages.js` adds the cards up.
- **Sections, not chapters.** From pages 137–146 onward. The builder refuses the
  word in any question, option or explanation.
- **Five papers.** Five complete versions of every question — its own wording,
  its own four options, its own explanation. Five wordings that differ, five
  wrong-answer sets that differ, the answer not always in the same slot, and no
  version offering as wrong what another marks right.
- **One correct answer**, four distinct options, and the answer never the longest
  by more than six characters.
- **Nothing past the reading.** Each reading stops one page short of its own
  reveal, so each has its own spoiler list in two places: the builder and the
  `AHEAD` table in `test_papers.js`, which fails on a versioned app with no
  entry.
- **Every quoted sentence verbatim**, compared on letters only against two views
  of the pages — furniture stripped, and furniture intact. Stripping is what
  lets a sentence running across a page break match, since the running head and
  an illustration caption sit in the middle of it; keeping it is what lets a
  caption match, since a caption *is* furniture. Keep the reader's own
  spellings: *discolored*, *endeavored*, *odor*, *Proosia*, *Mr. Cocksure*.
- **At most four highlights a question.** A mark is a pointer, not a paragraph.
- **The questions not selected stay written.** `build_carbuncle.py` and
  `build_engineer3.py` select three of five per section from a `KEEP` table;
  putting one back is one line.

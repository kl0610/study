# Returned tests

Drop graded work here and it gets read, analysed, and turned into practice that
targets what was actually missed.

**Nothing in this folder is committed.** The repo is public and serves GitHub
Pages, so scans of graded work — a name, handwriting, a teacher's marks, a score
— must not be pushed. `.gitignore` keeps everything here local except this file.
What *does* get committed is the practice questions that come out the other end,
and those look like any other content on the site.

```
_returned/
├── history/  science/  reading/  spelling/  vocabulary/  math/
│   ├── 2026-09-05-ww6-lesson2.jpg      ← what you drop in
│   ├── analysis/2026-09-05.md          ← what comes back
│   └── focus.json                      ← what the generators then over-sample
└── README.md
```

## Dropping one in

Photo, scan or PDF — a phone picture of the paper is fine. Name it
`YYYY-MM-DD-<what-it-was>.jpg` so the date is the date of the test, not of the
upload. Several pages: add `-p2`, `-p3`.

Then say which subject it is. Every question missed gets read against the source
book in `_source/`, not from memory.

## What the analysis asks

A wrong answer is not one thing, and the fix differs by cause. Each miss is put
into one of these, because they need opposite responses:

| what happened | what it looks like | what it changes |
|---|---|---|
| **didn't know it** | no attempt, or a wild guess | more exposure — put the fact in the warm-up |
| **confused two things** | picked a specific plausible wrong one | target that pair directly with a question that forces them apart |
| **misread the question** | the answer is right for a different question | rephrase; check whether our own wording has the same trap |
| **knew it, slipped** | right elsewhere on the same paper | leave alone — drilling this teaches nothing |
| **ran out of time** | blanks clustered at the end | shorten the practice sets, don't add content |

The last two matter most. Practising something he already knows is the fastest
way to make him hate practising, and "wrong" on a page does not mean "does not
know".

## What comes out

`analysis/<date>.md` records each miss, its cause, and the evidence for that
call — quoting the Reader or Teacher Guide page it turns on.

`focus.json` is the machine-readable part: the concepts to over-sample next
time. The generators in `_build/generators/` read it when they build the next
set, so the following week's practice leans on the weak spots without anyone
having to remember to make it.

```json
{
  "updated": "2026-09-05",
  "weight": { "segregate:0": 3, "campaign:1": 2 },
  "retire": ["ceremony:0"],
  "note": "confused segregate/integrate twice; ceremony solid three sittings running"
}
```

`weight` over-samples an item; `retire` drops one that has been solid for
several sittings, so the set does not fill up with things already mastered.

## Over the year

The point is that this moves. Early on, practice covers the whole list evenly.
As returned tests accumulate, it should tilt toward what keeps being missed and
quietly drop what does not — so a twenty-question set in May is twenty questions
about the things still worth asking, not the same even spread as September.

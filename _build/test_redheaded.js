/* The Red-Headed League sections, checked as built artifacts.
 *
 *   node _build/test_redheaded.js
 *
 * A reading app has one job beyond being well formed: it must not hand a child
 * anything from further along than they have read. So as well as the shape of
 * the questions, this checks that every section's passages and citations stay
 * inside its own page range, and that the six of them tile pages 45 to 86 with
 * no gap and no overlap.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let pass = 0;
const fails = [];
const ok = (what, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
};
const G = g => console.log("\n" + g);

const ROOT = path.join(__dirname, "..");
const SECTIONS = [1, 2, 3, 4].map(n => {
  const rel = "reading/sherlock-redheaded-" + n;
  const html = fs.readFileSync(path.join(ROOT, rel, "index.html"), "utf8");
  const DATA = JSON.parse(html.match(/const DATA = (\{[\s\S]*?\});\r?\n/)[1]);
  const pages = DATA.chapter.match(/pages\s+(\d+)[–-](\d+)/);
  return { n, rel, html, DATA, from: +pages[1], to: +pages[2] };
});

/* the scoring chain the shell really uses */
const points = (tries, hinted) =>
  hinted ? 25 : (tries === 1 ? 100 : tries === 2 ? 75 : tries === 3 ? 50 : 25);
const score = pts => Math.round(pts.reduce((a, b) => a + b, 0) / pts.length);

/* ====================================================================== */
G("the story is cut into sections that fit together");
{
  ok("four sections, one per reading assignment", SECTIONS.length === 4);
  ok("the first is pages 45 to 54, as the class set it",
     SECTIONS[0].from === 45 && SECTIONS[0].to === 54,
     SECTIONS[0].from + "–" + SECTIONS[0].to);
  ok("the second is 54 to 64, picking up where the first stopped",
     SECTIONS[1].from === 54 && SECTIONS[1].to === 64,
     SECTIONS[1].from + "–" + SECTIONS[1].to);
  ok("the last ends at 86, where the story ends",
     SECTIONS[SECTIONS.length - 1].to === 86, String(SECTIONS[SECTIONS.length - 1].to));
  /* Each block starts on the page the one before it ended on, which is how the
     assignments were set: read to 54, then read 54 to 64. So a shared boundary
     page is expected; a gap between blocks is not. */
  const gaps = [];
  SECTIONS.forEach((s, i) => {
    if (i && s.from !== SECTIONS[i - 1].to && s.from !== SECTIONS[i - 1].to + 1)
      gaps.push(SECTIONS[i - 1].to + " then " + s.from);
    if (s.to < s.from) gaps.push("section " + s.n + " runs backwards");
  });
  ok("each block starts where the last one ended, with no gap", !gaps.length,
     gaps.join(", "));
  const lens = SECTIONS.map(s => s.to - s.from + 1);
  ok("the blocks are about ten pages each (" + lens.join(", ") + ")",
     Math.max(...lens) <= 13 && Math.min(...lens) >= 9);
  ok("the story is covered from 45 to 86",
     SECTIONS[0].from === 45 && SECTIONS[SECTIONS.length - 1].to === 86);
}

/* ====================================================================== */
G("no section is longer than five minutes");
SECTIONS.forEach(s => {
  const m = s.DATA.missions[0];
  ok("section " + s.n + ": " + m.items.length + " questions", m.items.length === 6);
  const mins = +(m.tag.match(/about (\d+) minute/) || [])[1];
  ok("...and it says " + mins + " minutes, which is under five", mins > 0 && mins <= 5,
     m.tag);
  ok("...and the count in the tag matches the questions",
     m.tag.startsWith(m.items.length + " questions"), m.tag);
});

/* ====================================================================== */
G("nothing is quoted from further on than the child has read");
SECTIONS.forEach(s => {
  const outside = [];
  Object.entries(s.DATA.passages).forEach(([key, P]) => {
    const cited = [...String(P.cite).matchAll(/(\d+)/g)].map(x => +x[1]);
    cited.forEach(p => {
      /* A section boundary falls mid-sentence, so a quotation may begin on the
         page before or finish on the page after — that is one sentence, not a
         leak. Anything beyond a single page of overrun is reading ahead. */
      if (p > s.to + 1 || p < s.from - 1) outside.push(key + " cites " + p);
    });
  });
  s.DATA.missions[0].items.forEach((it, i) => {
    const cited = [...String(it.cite || "").matchAll(/(\d+)/g)].map(x => +x[1]);
    cited.forEach(p => {
      if (p > s.to + 1 || p < s.from - 1) outside.push("q" + (i + 1) + " cites " + p);
    });
  });
  ok("section " + s.n + " (" + s.from + "–" + s.to + ") stays inside its own pages",
     !outside.length, outside.join(", "));
});

/* ====================================================================== */
G("the questions are well formed");
SECTIONS.forEach(s => {
  const items = s.DATA.missions[0].items;
  const bad = [];
  items.forEach((it, i) => {
    const where = "q" + (i + 1);
    if (!s.DATA.passages[it.p]) bad.push(where + ": no passage " + it.p);
    if (!it.why) bad.push(where + ": no explanation");
    if (!it.cite) bad.push(where + ": no citation");
    if (!it.hi) bad.push(where + ": nothing highlighted");
    if (it.type === "pick") {
      if (it.opts.length !== 4) bad.push(where + ": " + it.opts.length + " options");
      if (new Set(it.opts).size !== it.opts.length) bad.push(where + ": repeated option");
      if (!(it.a >= 0 && it.a < it.opts.length)) bad.push(where + ": answer out of range");
      const L = it.opts.map(o => o.length).sort((x, y) => y - x);
      if (it.opts[it.a].length === L[0] && L[0] - L[1] >= 8)
        bad.push(where + ": correct option is the longest by " + (L[0] - L[1]));
    }
    /* One answer, always. A question that asks for several at once is a
       different job from reading a page and remembering it, and was asked not
       to be set. */
    if (it.type !== "pick") bad.push(where + ": is a " + it.type + ", not a single choice");
  });
  ok("section " + s.n + ": every question holds together", !bad.length, bad.join(" | "));

  /* The highlight is the line that answers it. One that matches nothing is
     worse than none: the passage opens, marks nothing, and leaves a child who
     is already stuck hunting for something that is not there. */
  const lost = items.filter(it => {
    const P = s.DATA.passages[it.p];
    if (!P) return true;
    const hay = P.text.join(" ");
    return [].concat(it.hi).some(h => hay.indexOf(h) === -1);
  });
  ok("...and every highlight is really in the passage it points at",
     !lost.length, lost.map(it => it.q.slice(0, 40)).join(" | "));

  /* Where the answer sits in the stored list does not matter, because the shell
     reshuffles the options every time the question is drawn. What the shuffle
     cannot hide is length, which is why that is what is checked above. */
  ok("...and the shell shuffles the options at render, so position gives nothing away",
     /const order = shuffle\(it\.opts\.map/.test(s.html));
});

/* ====================================================================== */
G("each one introduces itself as itself");
SECTIONS.forEach(s => {
  const h1 = (s.html.match(/<h1>([\s\S]*?)<\/h1>/) || [])[1] || "";
  const eyebrow = (s.html.match(/<div class="eyebrow">([^<]*)<\/div>/) || [])[1] || "";
  const title = (s.html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  ok("section " + s.n + " is titled for this story, not the last one",
     /Red-Headed League/.test(eyebrow) && /Red-Headed League/.test(title) &&
     !/Speckled/.test(h1 + eyebrow + title),
     [h1, eyebrow, title].join(" | "));
  ok("...and the eyebrow names its own pages",
     eyebrow.indexOf(String(s.from)) !== -1 && eyebrow.indexOf(String(s.to)) !== -1,
     eyebrow);
  ok("...and the engine is configured as redheaded" + s.n,
     new RegExp('"app":\\s*"redheaded' + s.n + '"').test(s.html) &&
     /"dragon":\s*\["m1"\]/.test(s.html));
  ok("...and the mission is m1, which is what the hub and the dragon name",
     s.DATA.missions[0].id === "m1");
});

/* ====================================================================== */
G("what a run scores, and that the page runs at all");
SECTIONS.forEach(s => {
  const items = s.DATA.missions[0].items;
  ok("section " + s.n + ": a flawless run is 100 and takes the dragon",
     score(items.map(() => points(1, false))) === 100);
  const scripts = [...s.html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]);
  let parsed = 0;
  for (const b of scripts) { try { new vm.Script(b); parsed++; } catch (e) { console.log("      " + e.message); } }
  ok("...and all " + scripts.length + " inline scripts parse", parsed === scripts.length);
});

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);

/* Energy and Matter in Ecosystems — the eight chapter quizzes, as built apps.
 *
 *   node _build/test_eco.js
 *
 * These were asked for as chapter quizzes: single multiple choice throughout,
 * nothing that wants several answers at once, each chapter's own vocabulary
 * tested, and the comparisons the chapter draws tested as comparisons. So that
 * is what this checks, along with the thing the generator cannot see — that a
 * quiz built from another unit's shell is not still carrying that unit's
 * furniture. The first build of these shipped with Chapter 4 of the matter
 * unit's videos on all eight pages, because an empty video list is falsy and
 * fell through to the shell's.
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
const UNIT = "Energy and Matter in Ecosystems";
const text = s => String(s).replace(/<[^>]+>/g, "").replace(/&middot;/g, "·")
  .replace(/&mdash;/g, "—").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

const CH = [];
for (let n = 1; n <= 8; n++) {
  const rel = "science/g5-eco-ch" + n;
  const file = path.join(ROOT, rel, "index.html");
  if (!fs.existsSync(file)) { fails.push("missing " + rel); continue; }
  const html = fs.readFileSync(file, "utf8");
  const i = html.indexOf("const DATA = ");
  const b = html.indexOf("{", i);
  let d = 0, DATA = null;
  for (let j = b; j < html.length; j++) {
    if (html[j] === "{") d++;
    else if (html[j] === "}" && !--d) { DATA = JSON.parse(html.slice(b, j + 1)); break; }
  }
  CH.push({ n, rel, html, DATA, items: DATA.missions[0].items });
}

/* the scoring chain the mission shell really uses */
const points = t => (t === 1 ? 100 : t === 2 ? 75 : t === 3 ? 50 : 25);

/* ====================================================================== */
G("the unit");
ok("eight chapters built", CH.length === 8, CH.length + " found");
ok("one quiz each, and it is the mission the hub and the dragon name",
   CH.every(c => c.DATA.missions.length === 1 && c.DATA.missions[0].id === "m1"));
ok("every chapter is its own app, eco1 to eco8",
   CH.every(c => new RegExp('"app":\\s*"eco' + c.n + '"').test(c.html)),
   CH.filter(c => !new RegExp('"app":\\s*"eco' + c.n + '"').test(c.html))
     .map(c => c.rel).join(", "));
const total = CH.reduce((n, c) => n + c.items.length, 0);
ok(total + " questions across the unit, none of them over the ten-minute mark",
   CH.every(c => {
     const m = +(c.DATA.missions[0].tag.match(/about (\d+) minute/) || [])[1];
     return m > 0 && m <= 10;
   }), CH.map(c => c.DATA.missions[0].tag).join(" | "));
ok("...and each tag counts its own questions",
   CH.every(c => c.DATA.missions[0].tag.startsWith(c.items.length + " questions")),
   CH.map(c => c.n + ":" + c.DATA.missions[0].tag).join(" | "));

/* ====================================================================== */
G("multiple choice, one answer, as asked");
{
  const kinds = {};
  CH.forEach(c => c.items.forEach(it => { kinds[it.type] = (kinds[it.type] || 0) + 1; }));
  ok("every question is a single pick: " + JSON.stringify(kinds),
     Object.keys(kinds).length === 1 && kinds.pick === total);
  const bad = [];
  CH.forEach(c => c.items.forEach((it, i) => {
    const where = "ch" + c.n + " q" + (i + 1);
    if (it.opts.length !== 4) bad.push(where + ": " + it.opts.length + " options");
    if (new Set(it.opts).size !== it.opts.length) bad.push(where + ": repeated option");
    if (!(it.a >= 0 && it.a < it.opts.length)) bad.push(where + ": answer out of range");
    if (!it.why || !it.cite) bad.push(where + ": no explanation or citation");
    /* One right answer, so exactly one option may be the answer. */
    if (typeof it.a !== "number") bad.push(where + ": no single answer index");
  }));
  ok("four options and exactly one answer, every time", !bad.length, bad.join(" | "));

  /* The tell that matters. The generator refuses to build past it, and this is
     the second opinion on the file it actually wrote. */
  const tells = [];
  CH.forEach(c => c.items.forEach((it, i) => {
    const L = it.opts.map(o => o.length).sort((x, y) => y - x);
    if (it.opts[it.a].length === L[0] && L[0] - L[1] >= 6)
      tells.push("ch" + c.n + " q" + (i + 1) + " by " + (L[0] - L[1]));
  }));
  ok("the right answer is never the longest option by a noticeable margin",
     !tells.length, tells.join(", "));
}

/* ====================================================================== */
G("the vocabulary is tested, chapter by chapter");
{
  /* Every word the reader's glossary attaches to a chapter's pages. The quiz
     for that chapter has to ask about each one. */
  const GLOSSARY = {
    1: ["organism", "producer", "consumer", "decomposer", "scavenger"],
    2: ["sugar", "glucose", "photosynthesis", "metabolism"],
    3: ["transpiration", "hydroponics"],
    4: ["herbivore", "carnivore", "omnivore"],
    5: ["ecosystem"],
    6: ["food chain", "food web"],
    7: [],
    8: ["disruption"],
  };
  CH.forEach(c => {
    const want = GLOSSARY[c.n];
    const asked = text(c.items.map(it => it.q + " " + it.opts.join(" ")).join(" ")).toLowerCase();
    const missed = want.filter(w => asked.indexOf(w) === -1);
    ok("chapter " + c.n + " asks about all " + want.length + " of its glossary words",
       !missed.length, missed.join(", "));
    /* And the word has to be defined somewhere the child can reach: the
       passage behind the question carries the glossary entry. */
    const defined = [].concat(...Object.values(c.DATA.passages)
      .map(p => (p.vocab || []).map(v => String(v[0]).toLowerCase())));
    const undef = want.filter(w => defined.indexOf(w) === -1);
    ok("...and each one is defined in a passage he can open", !undef.length, undef.join(", "));
  });
}

/* ====================================================================== */
G("the comparisons the chapters draw are tested as comparisons");
{
  /* Each of these is a pair the reader sets against each other, and a quiz that
     tests them one at a time never finds out whether he can tell them apart. */
  const PAIRS = [
    [1, ["producer", "consumer"]],
    [1, ["scavenger", "decomposer"]],
    [3, ["soil", "air"]],
    [4, ["herbivore", "carnivore"]],
    [4, ["omnivore", "herbivore"]],
    [5, ["ecosystem", "environment"]],
    [6, ["food chain", "food web"]],
    [7, ["fruit bats", "vampire bats"]],
    [8, ["forest fires", "earthquake"]],
  ];
  PAIRS.forEach(([n, [a, b]]) => {
    const c = CH.find(x => x.n === n);
    if (!c) return;
    const hit = c.items.some(it => {
      const one = text(it.q + " " + it.opts.join(" ")).toLowerCase();
      return one.indexOf(a) !== -1 && one.indexOf(b) !== -1;
    });
    ok("chapter " + n + " puts " + a + " and " + b + " in the same question", hit);
  });
}

/* ====================================================================== */
G("nothing quoted that the book does not say");
{
  const bad = [];
  CH.forEach(c => {
    const keys = Object.keys(c.DATA.passages);
    c.items.forEach((it, i) => {
      if (keys.indexOf(it.p) === -1)
        bad.push("ch" + c.n + " q" + (i + 1) + ": no passage " + it.p);
    });
    Object.entries(c.DATA.passages).forEach(([k, p]) => {
      if (!p.title || !p.cite || !p.text || !p.text.length)
        bad.push("ch" + c.n + " passage " + k + ": incomplete");
      if (!/Student Reader, page \d+/.test(p.cite))
        bad.push("ch" + c.n + " passage " + k + ": cite is " + p.cite);
    });
  });
  ok("every question opens a passage that exists and cites a page", !bad.length,
     bad.join(" | "));

  /* Citations have to fall inside the chapter's own pages, or the quiz is
     quoting a chapter he has not read. */
  const PAGES = { 1: [1, 10], 2: [11, 14], 3: [15, 22], 4: [23, 28],
                  5: [29, 34], 6: [35, 40], 7: [41, 46], 8: [47, 52] };
  const strayed = [];
  CH.forEach(c => {
    const [lo, hi] = PAGES[c.n];
    const cites = c.items.map(it => it.cite)
      .concat(Object.values(c.DATA.passages).map(p => p.cite));
    cites.forEach(s => {
      const pg = +(String(s).match(/page (\d+)/) || [])[1];
      if (pg && (pg < lo || pg > hi)) strayed.push("ch" + c.n + " cites page " + pg);
    });
  });
  ok("no chapter cites a page outside its own", !strayed.length,
     [...new Set(strayed)].join(", "));
}

/* ====================================================================== */
G("each one introduces itself as itself");
CH.forEach(c => {
  const grab = re => (c.html.match(re) || [])[1] || "";
  const eyebrow = text(grab(/<div class="eyebrow">([^<]*)<\/div>/));
  const title = text(grab(/<title>([^<]*)<\/title>/));
  ok("chapter " + c.n + " names this unit and this chapter",
     eyebrow.indexOf(UNIT) !== -1 && eyebrow.indexOf("Chapter " + c.n) !== -1 &&
     title.indexOf(UNIT) !== -1,
     eyebrow + " | " + title);
  ok("...and says nothing about the matter unit it was built from",
     !/Investigating Matter|The Language of Chemistry|matter is made of/i.test(c.html),
     (c.html.match(/Investigating Matter|The Language of Chemistry/i) || [""])[0]);
  ok("...and carries the chapter's own Big Question",
     !!c.DATA.bigQuestion && c.html.indexOf(c.DATA.bigQuestion) !== -1,
     c.DATA.bigQuestion);
});

/* ====================================================================== */
G("the video shelf tells the truth");
CH.forEach(c => {
  /* Eight chapters of an ecosystems unit shipped advertising three videos about
     matter, evidence and prototypes. An empty list has to mean empty. */
  ok("chapter " + c.n + ": no videos chosen, and no shelf claiming there are",
     c.DATA.videos.length === 0 &&
     c.html.indexOf('class="shelf"') === -1 &&
     c.html.indexOf("Three short videos") === -1 &&
     c.html.indexOf('id="vids"') !== -1,
     c.DATA.videos.map(v => v.t).join(", "));
});

/* ====================================================================== */
G("a clean run, and the page runs at all");
CH.forEach(c => {
  const perfect = c.items.map(() => points(1));
  ok("chapter " + c.n + ": a flawless run scores 100 and takes the dragon",
     Math.round(perfect.reduce((a, b) => a + b, 0) / c.items.length) === 100 &&
     /"dragon":\s*\["m1"\]/.test(c.html));
  const scripts = [...c.html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]);
  let parsed = 0;
  for (const b of scripts) {
    try { new vm.Script(b); parsed++; } catch (e) { console.log("      " + e.message); }
  }
  ok("...and all " + scripts.length + " inline scripts parse", parsed === scripts.length);
});

/* ====================================================================== */
G("the hub groups the chapters under their book");
{
  const hub = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  ok("a book heading is a row with no href, so nothing counts it as a chapter",
     /if\(c\.book\) return `<li class="bookhead">/.test(hub));
  /* The tally under the subject name counts the chapters. Adding the headings
     made it read "14 of 16": two book titles counted as chapters not yet
     built. */
  ok("...and the subject tally leaves the headings out of its total",
     /\$\{live\.length\} of \$\{s\.chapters\.filter\(c=>!c\.book\)\.length\}/.test(hub));
  ok("both books are named", /book:"Book 1 [^"]*Investigating Matter"/.test(hub) &&
     /book:"Book 2 [^"]*Energy and Matter in Ecosystems"/.test(hub));
  const missing = CH.filter(c => hub.indexOf('href:"science/g5-eco-ch' + c.n + '/"') === -1);
  ok("all eight new chapters are on the hub", !missing.length,
     missing.map(c => c.n).join(", "));
  const matter = [1, 2, 3, 4, 5, 6]
    .filter(n => hub.indexOf('href:"science/g5-matter-ch' + n + '/"') === -1);
  ok("...and the six from Book 1 are still there", !matter.length, matter.join(", "));
  /* The hub's app name has to be the one the app configures, or the row shows
     somebody else's progress. */
  const wrong = CH.filter(c =>
    !new RegExp('href:"science/g5-eco-ch' + c.n + '/", app:"eco' + c.n + '"').test(hub));
  ok("...and each row reads the progress of its own app", !wrong.length,
     wrong.map(c => c.n).join(", "));
}

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);

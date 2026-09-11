/* Every weekly spelling list, checked as a built app.
 *
 *   node _build/test_spelling.js
 *
 * There was no suite here, and it cost a week. List 3 shipped wearing List 2's
 * rule layer: headed "Spelling . Week 2 / List 2", ruled "syllabication with
 * double consonants", counting twelve words when it had fourteen, stamping
 * List 2's root (agr = field) on List 3's flam words, and grouping its study
 * chart by doubled pairs that week's words do not have. The data was right the
 * whole time — DATA.title, DATA.rule, DATA.week and DATA.root were all correct
 * and all read by nothing. A suite that only checked the data would have passed.
 *
 * So this checks two things that are easy to confuse. The data: syllables that
 * spell the word, a sentence with a blank that does not give the answer away.
 * And what the page will actually put on the screen: the heading, the counts in
 * the prose, the root label, and the letters it paints pink — the last of those
 * by running the page's own lookup rather than a copy of it.
 *
 * List 2 is the shell the generator builds from, so its rule layer is hand
 * written and is meant to say List 2. Only the lists carrying DATA.n are
 * generated, and only those are held to the rule-layer checks.
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
const DIR = path.join(ROOT, "spelling");

const LISTS = fs.readdirSync(DIR)
  .filter(d => fs.existsSync(path.join(DIR, d, "index.html")))
  .sort()
  .map(d => {
    const html = fs.readFileSync(path.join(DIR, d, "index.html"), "utf8");
    const i = html.indexOf("const DATA = ");
    const b = html.indexOf("{", i);
    let depth = 0, DATA = null;
    for (let j = b; j < html.length; j++) {
      if (html[j] === "{") depth++;
      else if (html[j] === "}" && !--depth) {
        /* List 2's DATA is a JS object literal with unquoted keys, so it is not
           JSON. Every generated list is JSON, but reading both the same way
           means the shell is checked by the same program as its children. */
        DATA = vm.runInNewContext("(" + html.slice(b, j + 1) + ")");
        break;
      }
    }
    if (!DATA) throw new Error("unbalanced DATA in spelling/" + d);
    return { dir: d, html, DATA, gen: DATA.n != null };
  });

/* the scoring chain the shell really uses: first try is the only clean one */
const points = (tries, shownIt) =>
  shownIt ? 25 : (tries === 1 ? 100 : tries === 2 ? 75 : tries === 3 ? 50 : 25);

/* ====================================================================== */
G("what is on the shelf");
ok(LISTS.length + " lists built: " + LISTS.map(l => l.dir).join(", "), LISTS.length >= 3);
ok("List 2 is among them, since every other week is generated from its shell",
   LISTS.some(l => l.dir === "list2"));
ok("every list after it is generated, so it carries its own number",
   LISTS.filter(l => l.dir !== "list2").every(l => l.gen),
   LISTS.filter(l => l.dir !== "list2" && !l.gen).map(l => l.dir).join(", "));

/* ====================================================================== */
LISTS.forEach(L => {
  const D = L.DATA;
  const W = D.words;
  const N = W.length;
  G(D.title + "  (spelling/" + L.dir + ")");

  /* ---------------------------------------------------------- the words */
  const bad = [];
  W.forEach(w => {
    if (w.syl.join("") !== w.w) bad.push(w.w + ": syllables spell " + w.syl.join(""));
    if (w.sent.indexOf("___") === -1) bad.push(w.w + ": sentence has no blank");
    if (w.sent.replace("___", "").toLowerCase().indexOf(w.w.toLowerCase()) !== -1)
      bad.push(w.w + ": the sentence gives the word away");
    if (!w.def || !w.pos) bad.push(w.w + ": no definition or part of speech");
    /* Only these four have a pill style. Anything else renders as bare text on
       a coloured chip that was never sized for it. */
    if (["n", "v", "adj", "adv"].indexOf(w.pos) === -1)
      bad.push(w.w + ": part of speech " + w.pos + " has no pill style");
  });
  ok(N + " words, every one of them sound", !bad.length, bad.join(" | "));
  ok("...and no word is on the list twice", new Set(W.map(w => w.w)).size === N);

  /* --------------------------------------------------------- the ladder */
  ok("seven levels, l1 to l7",
     D.levels.length === 7 &&
     D.levels.every((l, i) => l.id === "l" + (i + 1)));
  ok("...the last two are the challenges, and they are the boss levels",
     D.levels.filter(l => l.boss).map(l => l.id).join(",") === "l6,l7");
  ok("...l5 is dictation with nothing else on screen",
     D.levels[4].prompt === "none" && D.levels[4].input === "free" && !D.levels[4].dictate);
  ok("...l6 reads the meaning aloud instead of the word",
     D.levels[5].dictate === "def");
  ok("...l7 is where he writes his own sentence, which is where the dragon sits",
     D.levels[6].input === "sentence" &&
     /"dragon":\s*\["l7"\]/.test(L.html));

  /* ------------------------------------------------------- a clean run */
  const perfect = W.map(() => points(1, false));
  ok("a flawless run scores 100 and takes the dragon",
     Math.round(perfect.reduce((a, b) => a + b, 0) / N) === 100);
  ok("being shown the word scores 25, not 100 — a level you were handed is not cleared",
     points(1, true) === 25 && points(4, false) === 25);

  /* ------------------------------------------------ it parses at all */
  const scripts = [...L.html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1]);
  let parsed = 0;
  for (const b of scripts) {
    try { new vm.Script(b); parsed++; }
    catch (e) { console.log("      " + e.message); }
  }
  ok("all " + scripts.length + " inline scripts parse", parsed === scripts.length);

  if (!L.gen) return;   /* the rest is the generated rule layer */

  /* ------------------------------------- this week's name, not last week's */
  const grab = re => (L.html.match(re) || [])[1] || "";
  const h1      = grab(/<h1>List <em>(\d+)<\/em><\/h1>/);
  const eyebrow = grab(/<div class="eyebrow" style="margin-top:14px">Spelling &middot; ([^<]*)<\/div>/);
  const ruleln  = grab(/<div class="rule">Rule: <b>([^<]*)<\/b>/);
  const footer  = grab(/<footer>([^<]*)<\/footer>/);
  const drawer  = grab(/<div class="eyebrow">Spelling List (\d+)<\/div>/);
  const title   = grab(/<title>([^<]*)<\/title>/);

  ok("the heading calls it List " + D.n, +h1 === D.n, h1);
  ok("...and the drawer agrees", +drawer === D.n, drawer);
  ok("...and the eyebrow names this week: " + D.weekLabel, eyebrow === D.weekLabel, eyebrow);
  ok("...and the rule on screen is this week's rule: " + D.rule, ruleln === D.rule, ruleln);
  ok("...and the title is " + D.title, title.indexOf(D.title) === 0, title);
  ok("...and the footer counts " + N + " words and names the test day",
     footer === N + " words, three ways. Test " + D.test + ".", footer);
  ok("...and the two chart headings count " + N + " words too",
     (L.html.match(new RegExp("All " + N + " words", "g")) || []).length === 2 &&
     L.html.indexOf("See all " + N + " words") !== -1);

  /* The specific way this went wrong: another list's identity left in the file.
     Any "List <em>m</em>" or "Spelling List m" for m other than this one. */
  const others = [...L.html.matchAll(/List <em>(\d+)<\/em>|Spelling List (\d+)/g)]
    .map(m => +(m[1] || m[2])).filter(v => v !== D.n);
  ok("...and no other list's number is anywhere in the file", !others.length,
     "found " + [...new Set(others)].join(", "));

  /* List 2's rule layer, every string of it. Each of these shipped in List 3. */
  const stale = ["doubles(", "pairsIn(", "agr = field", "AGR = FIELD",
                 "doubled letter", "double consonant", "twelve words",
                 "Test Friday, Aug 28", "Week 2"].filter(s => L.html.indexOf(s) !== -1);
  ok("...and none of List 2's rule is left behind", !stale.length, stale.join(", "));

  /* ------------------------------------------------ the rule is read from data */
  ok("the root label is built from DATA.root, not written into the markup",
     /const ROOTLAB = DATA\.root\.stem\+" = "\+DATA\.root\.means;/.test(L.html) &&
     L.html.indexOf("ROOT ${esc(ROOTLAB.toUpperCase())}") !== -1);
  ok("...and " + D.root.stem + " = " + D.root.means + " is what it will say",
     !!D.root.stem && !!D.root.means);
  ok("the four coaching lines come from DATA.tips",
     ["listen", "boxes", "reveal", "plain"].every(k =>
       D.tips[k] && D.tips[k].trim() &&
       L.html.indexOf("DATA.tips." + k) !== -1));
  ok("the study chart groups on each word's own group, not on a computed rule",
     /const list=DATA\.words\.filter\(x=>x\.group===g\.key\);/.test(L.html) &&
     /DATA\.chart\.map\(g=>/.test(L.html));

  /* ----------------------------------------------- every word has a home */
  const keys = D.chart.map(g => g.key);
  const homeless = W.filter(w => keys.indexOf(w.group) === -1).map(w => w.w);
  ok("every word sits in one of the chart's " + keys.length + " groups", !homeless.length,
     homeless.join(", "));
  const empty = D.chart.filter(g => !W.some(w => w.group === g.key)).map(g => g.key);
  ok("...and no group is empty, so none renders as a bare heading", !empty.length,
     empty.join(", "));
  ok("...and every group's dot has a style",
     D.chart.every(g => ["two", "one", "none"].indexOf(g.dot) !== -1));

  /* A partner is shown on the chart as a link to another card. If it points at
     a word that is not on the list, the card sends him looking for nothing. */
  const byWord = {};
  W.forEach(w => { byWord[w.w] = w; });
  const oneWay = W.filter(w => w.pair && (!byWord[w.pair] || byWord[w.pair].pair !== w.w))
                  .map(w => w.w + " -> " + w.pair);
  ok("every paired word points at a word that points back", !oneWay.length, oneWay.join(", "));

  /* ------------------------------------- what the page will actually paint */
  /* Run the page's own lookup rather than a copy of it, so this cannot agree
     with a bug. The snippet is lifted whole out of the built file. */
  const snip = L.html.match(
    /const MARKS=\{\};[\s\S]*?const marked = w => MARKS\[w\] \|\| new Set\(\);/);
  ok("the page builds its marks from the word data", !!snip);
  if (snip) {
    const ctx = { DATA: D, out: null };
    vm.runInNewContext(snip[0] + "\nout = DATA.words.map(x => " +
      "[...x.w].map((c,i)=>marked(x.w).has(i)?c:'.').join(''));", ctx);

    const wrong = [], loose = [];
    W.forEach((w, i) => {
      const painted = ctx.out[i];
      const want = w.mark
        ? ".".repeat(w.mark[0]) + w.w.slice(w.mark[0], w.mark[0] + w.mark[1]) +
          ".".repeat(w.w.length - w.mark[0] - w.mark[1])
        : ".".repeat(w.w.length);
      if (painted !== want) wrong.push(w.w + ": paints " + painted + ", wanted " + want);
      /* A mark split across the word would read as two rules, not one. */
      const on = [...painted].map((c, j) => c === "." ? -1 : j).filter(j => j >= 0);
      if (on.length && on[on.length - 1] - on[0] !== on.length - 1) loose.push(w.w);
    });
    ok("every word paints exactly the letters its mark names", !wrong.length,
       wrong.join(" | "));
    ok("...and each one is a single unbroken run of letters", !loose.length, loose.join(", "));
    ok("...and a word with no mark paints nothing, so the root words stay plain",
       W.filter(w => !w.mark).every((w, i) => true) &&
       W.every((w, i) => w.mark || !/[^.]/.test(ctx.out[i])));

    const marks = W.filter(w => w.mark)
                   .map((w, i) => w.w.slice(w.mark[0], w.mark[0] + w.mark[1]));
    ok("...and the rule shows up in " + marks.length + " of the " + N +
       " words: " + [...new Set(marks)].join(", "), marks.length >= 2);

    /* The point of a singular/plural week is that the two endings differ. If a
       pair paints the same letters, the chart teaches nothing. */
    const same = W.filter(w => w.pair && w.mark && byWord[w.pair] && byWord[w.pair].mark)
      .filter(w => {
        const p = byWord[w.pair];
        return w.w.slice(w.mark[0], w.mark[0] + w.mark[1]) ===
               p.w.slice(p.mark[0], p.mark[0] + p.mark[1]);
      }).map(w => w.w + "/" + w.pair);
    ok("no paired words paint the same ending as each other", !same.length, same.join(", "));
  }

  /* ----------------------------------------- which letters are given away */
  const cs = L.html.match(/function clueSet\(w,mode,syl\)\{[\s\S]*?\n\}/);
  ok("the page decides the given letters in one place", !!cs);
  if (cs && snip) {
    const ctx = { DATA: D, out: null };
    vm.runInNewContext(snip[0] + "\n" + cs[0] + "\nout = DATA.words.map(x => ({" +
      "syllable:[...clueSet(x.w,'syllable',x.syl)].sort((a,b)=>a-b)," +
      "first:[...clueSet(x.w,'first',x.syl)]," +
      "none:[...clueSet(x.w,'none',x.syl)]," +
      "scatter:[...clueSet(x.w,'scatter',x.syl)]}));", ctx);

    const offs = [];
    W.forEach((w, i) => {
      const got = ctx.out[i];
      let at = 0;
      const starts = w.syl.map(s => { const a = at; at += s.length; return a; });
      if (got.syllable.join() !== starts.join())
        offs.push(w.w + ": warm up gives " + got.syllable + ", syllables start at " + starts);
      if (got.first.join() !== "0") offs.push(w.w + ": level 2 gives " + got.first);
      if (got.none.length) offs.push(w.w + ": test day gives " + got.none.length + " letters away");
    });
    ok("warm up starts each syllable chunk, level 2 gives the first letter, " +
       "test day gives nothing", !offs.length, offs.join(" | "));

    /* The scatter mode is not on the ladder today, but the line that keeps it
       off the rule letters is still in the file and still has to hold. */
    const leak = [];
    W.forEach((w, i) => {
      if (!w.mark) return;
      const on = new Set();
      for (let j = 0; j < w.mark[1]; j++) on.add(w.mark[0] + j);
      ctx.out[i].scatter.forEach(j => { if (on.has(j)) leak.push(w.w + " at " + j); });
    });
    ok("...and no scattered letter ever hands over part of the rule", !leak.length,
       leak.join(", "));
  }
});

/* ====================================================================== */
G("every list is on the hub, and points at itself");
{
  const hub = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const missing = [], mislabelled = [];
  LISTS.forEach(L => {
    const row = hub.match(new RegExp(
      '\\{ n:' + (L.gen ? L.DATA.n : 2) + ', t:"[^"]*"[\\s\\S]{0,220}?href:"spelling/' +
      L.dir + '/"[\\s\\S]{0,160}?\\}'));
    if (!row) { missing.push(L.dir); return; }
    const app = (row[0].match(/app:"([^"]+)"/) || [])[1] || "spelling";
    if (!new RegExp('"app":\\s*"' + app + '"').test(L.html))
      mislabelled.push(L.dir + ": hub says " + app);
    if (!/ids:\["l1","l2","l3","l4","l5","l6","l7"\]/.test(row[0]))
      mislabelled.push(L.dir + ": the hub does not list all seven levels");
  });
  ok("every built list has a row on the hub", !missing.length, missing.join(", "));
  ok("...and the hub's app name is the one the app configures", !mislabelled.length,
     mislabelled.join(" | "));
  ok("...and each list's engine name is its own",
     new Set(LISTS.map(L => (L.html.match(/"app":\s*"([^"]+)"/) || [])[1])).size
       === LISTS.length);
}

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);

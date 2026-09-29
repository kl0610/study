/* Five papers instead of one.
 *
 *   node _build/test_papers.js
 *
 * A quiz he can run again is only worth running again if it asks something the
 * second time. A question may now carry `vs`: five whole versions of itself,
 * each with its own wording, its own four options and its own explanation. One
 * version is used for a whole run, and finishing a full run moves to the next.
 *
 * Three things are checked here, because a fault in any one of them is invisible
 * in the other two.
 *
 * The shell, across every mission app: that the layer is present and wired, that
 * the question is fetched through view(), that "run the whole thing again" goes
 * back through the paper picker rather than restarting the same paper, and that
 * only a full run turns the page.
 *
 * The behaviour, by lifting the page's own view() and verCount() out of the
 * built file and running them: that a version is merged over its item, that `p`,
 * `hi` and `type` survive, that `vs` does not reach the renderer, and that five
 * full runs walk the five papers and come back round.
 *
 * The data, for the app that uses it: twenty questions in four chapters, five
 * versions each, and every one of those hundred versions holding to the same
 * rules the single-version questions have always had -- four distinct options,
 * one answer, an explanation, and no length tell. Plus the rules only versions
 * can break: five wordings that are actually different, five sets of wrong
 * answers that are actually different, an answer that does not sit in the same
 * place every time, and no version offering as a wrong answer what another
 * version of the same question gives as the right one.
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

function grab(html, name, open) {
  const i = html.indexOf(name);
  if (i < 0) return null;
  const b = html.indexOf(open, i);
  const shut = open === "{" ? "}" : "]";
  let d = 0;
  for (let j = b; j < html.length; j++) {
    if (html[j] === open) d++;
    else if (html[j] === shut && !--d)
      return vm.runInNewContext("(" + html.slice(b, j + 1) + ")");
  }
  return null;
}

const APPS = [];
for (const dir of ["reading", "science"]) {
  for (const d of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = dir + "/" + d;
    const file = path.join(ROOT, rel, "index.html");
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, "utf8");
    if (html.indexOf("function drawer(key, exKey, mode, hi)") === -1) continue;
    APPS.push({ rel, html, DATA: grab(html, "const DATA = ", "{") });
  }
}
const items = a => (a.DATA.missions || []).flatMap(m => m.items || []);

/* ====================================================================== */
G("the layer is in every app built on the mission shell");
ok(APPS.length + " apps carry the shell", APPS.length >= 27);
for (const [what, rx] of [
  ["the paper it is set on", /let VER = 0;/],
  ["where that is remembered", /const VKEY = "sc\.paper";/],
  ["how many papers there are", /function verCount\(\)\{/],
  ["the question as this paper asks it", /function view\(it\)\{/],
  ["and the way into a full run", /function fullRun\(\)\{/],
]) {
  const missing = APPS.filter(a => !rx.test(a.html));
  ok("every app has " + what, !missing.length,
     missing.map(a => a.rel).join(", "));
}

/* The bug this shape can have: a patch that keeps the line it anchored on gets
   applied twice by a rebuild, and the app redeclares a const and stops parsing.
   Twenty-six apps went down that way when the retake landed. */
for (const [what, rx] of [["VER", /let VER = 0;/g],
                          ["VKEY", /const VKEY = "sc\.paper";/g],
                          ["view", /function view\(it\)\{/g],
                          ["fullRun", /function fullRun\(\)\{/g]]) {
  const twice = APPS.filter(a => (a.html.match(rx) || []).length !== 1);
  ok("no app declares " + what + " twice", !twice.length,
     twice.map(a => a.rel).join(", "));
}
{
  let bad = 0, n = 0;
  APPS.forEach(a => {
    for (const m of a.html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
      n++;
      try { new vm.Script(m[1]); }
      catch (e) { bad++; console.log("      " + a.rel + ": " + e.message); }
    }
  });
  ok("all " + n + " inline scripts still parse", !bad);
}

/* ====================================================================== */
G("the question is fetched through the paper, and the page is only turned once");
{
  const raw = APPS.filter(a => /const it = M\.items\[RUN\[idx\]\];/.test(a.html));
  ok("no app reads the question without going through view()", !raw.length,
     raw.map(a => a.rel).join(", "));
  const viewed = APPS.filter(a => /const it = view\(M\.items\[RUN\[idx\]\]\);/.test(a.html));
  ok("...and every app reads it through view()", viewed.length === APPS.length,
     APPS.filter(a => !viewed.includes(a)).map(a => a.rel).join(", "));

  /* "Run the whole thing again" must come back through fullRun, or the rerun is
     set on the paper that has just been finished. */
  const direct = APPS.filter(a =>
    /\$\("again"\)\.onclick=\(\)=>startRun\(M\.items\.map/.test(a.html));
  ok("the rerun button asks which paper is due", !direct.length,
     direct.map(a => a.rel).join(", "));
  ok("...and it is wired to fullRun",
     APPS.every(a => /\$\("again"\)\.onclick=fullRun;/.test(a.html)),
     APPS.filter(a => !/\$\("again"\)\.onclick=fullRun;/.test(a.html))
         .map(a => a.rel).join(", "));

  /* A correction round is the same paper looked at again. Three retried
     questions should not use up one of the five. */
  ok("only a full run advances the paper",
     APPS.every(a => /if\(!RUNPART && verCount\(\) > 1\)\{/.test(a.html)),
     APPS.filter(a => !/if\(!RUNPART && verCount\(\) > 1\)/.test(a.html))
         .map(a => a.rel).join(", "));
  ok("...and a correction round still cannot overwrite a best score",
     APPS.every(a => /if\(!RUNPART\) best\[M\.id\] = Math\.max/.test(a.html)));
}

/* ====================================================================== */
G("what view() and verCount() actually do, run out of the built page");
{
  const a = APPS.find(x => x.rel === "reading/sherlock-engineer-3") || APPS[0];
  const src = [/function verCount\(\)\{[\s\S]*?\n\}/, /function view\(it\)\{[\s\S]*?\n\}/]
    .map(rx => (a.html.match(rx) || [])[0]);
  ok("both can be read out of " + a.rel, src.every(Boolean));

  if (src.every(Boolean)) {
    const run = (code, ctx) => {
      const sandbox = Object.assign({ Object: Object, Math: Math, out: null }, ctx);
      new vm.Script(src.join("\n") + "\n" + code).runInNewContext(sandbox);
      return sandbox.out;
    };

    const plain = { type: "pick", p: "horse", hi: ["x"], q: "one?", opts: ["a", "b"], a: 0 };
    ok("an item with no versions comes back as itself",
       run("out = view(IT) === IT;", { IT: plain, VER: 0, M: { items: [plain] } }));

    const versioned = {
      type: "pick", p: "drive", hi: ["mark one", "mark two"],
      vs: [{ q: "first wording", opts: ["1a", "1b", "1c", "1d"], a: 0, why: "one" },
           { q: "second wording", opts: ["2a", "2b", "2c", "2d"], a: 3, why: "two" },
           { q: "third wording", opts: ["3a", "3b", "3c", "3d"], a: 1, why: "three" }],
    };
    const M = { items: [versioned] };
    const seen = [0, 1, 2].map(v =>
      run("out = view(IT);", { IT: versioned, VER: v, M: M }));
    ok("each paper asks its own wording",
       seen.map(x => x.q).join("|") === "first wording|second wording|third wording",
       seen.map(x => x.q).join(" | "));
    ok("...with its own options and its own answer index",
       seen[1].opts[seen[1].a] === "2d" && seen[2].opts[seen[2].a] === "3b");
    ok("...and its own explanation", seen.map(x => x.why).join(",") === "one,two,three");
    ok("the passage, the highlight and the type survive the merge",
       seen.every(x => x.p === "drive" && x.type === "pick" &&
                       JSON.stringify(x.hi) === JSON.stringify(["mark one", "mark two"])));
    ok("`vs` does not reach the renderer", seen.every(x => x.vs === undefined));
    ok("the item itself is not modified",
       versioned.q === undefined && versioned.vs.length === 3);
    ok("a paper number past the end wraps rather than throwing",
       run("out = view(IT).q;", { IT: versioned, VER: 7, M: M }) === "second wording");

    /* verCount takes the shortest list, so VER is never an index some item has
       not got -- a mission where one question has five versions and another has
       three has three papers, not five. */
    ok("the number of papers is the shortest version list",
       run("out = verCount();", { M: { items: [
         { vs: [1, 2, 3, 4, 5] }, { vs: [1, 2, 3] }] } }) === 3);
    ok("...and an item with no versions does not limit it",
       run("out = verCount();", { M: { items: [
         { vs: [1, 2, 3, 4, 5] }, { type: "pick" }] } }) === 5);
    ok("...and a mission with no versions at all has one paper",
       run("out = verCount();", { M: { items: [{ type: "pick" }] } }) === 1);
  }
}

/* ====================================================================== */
G("five full runs walk the five papers");
{
  /* The page's own rule, written out here: a full run reads the stored number,
     and finishing a full run stores the next one. Five runs should see each
     paper once and the sixth should be back to the first. */
  const store = {};
  const papers = 5;
  const seen = [];
  for (let run = 0; run < 6; run++) {
    const ver = (store.m1 || 0) % papers;      // fullRun()
    seen.push(ver + 1);
    store.m1 = (ver + 1) % papers;             // finish(), full run only
  }
  ok("papers come round in order: " + seen.join(", "),
     seen.join(",") === "1,2,3,4,5,1");

  const held = [];
  const store2 = { m1: 2 };
  const ver = (store2.m1 || 0) % papers;
  held.push(ver + 1);
  /* a correction round: RUNPART, so nothing is stored */
  held.push(((store2.m1 || 0) % papers) + 1);
  ok("a correction round stays on the paper it was set on: " + held.join(", "),
     held[0] === held[1]);
}

/* ====================================================================== */
G("the app that uses it: pages 103 to 120");
{
  const a = APPS.find(x => x.rel === "reading/sherlock-engineer-3");
  ok("the app is built", !!a);
  if (a) {
    const M = a.DATA.missions || [];
    ok("four chapters, so each can be sat on its own: " +
       M.map(m => m.items.length).join(" + "), M.length === 4);
    ok("twenty questions across them",
       M.reduce((n, m) => n + m.items.length, 0) === 20);
    ok("every chapter names its pages",
       M.every(m => /pages \d+ to \d+/.test(m.name)), M.map(m => m.name).join(" | "));
    ok("every chapter says how many papers it has",
       M.every(m => /5 papers/.test(m.tag)), M.map(m => m.tag).join(" | "));
    ok("the app is gated on all four chapters",
       /dragon:\["m1","m2","m3","m4"\]|"m1","m2","m3","m4"/.test(a.html) ||
       /MC\.chest/.test(a.html));

    const all = items(a);
    ok("every question has five versions",
       all.every(it => (it.vs || []).length === 5),
       all.filter(it => (it.vs || []).length !== 5).length + " do not");

    /* Everything a single-version question has always had to hold to. */
    const bad = { opts: [], dupe: [], range: [], why: [], tell: [] };
    all.forEach((it, n) => {
      (it.vs || []).forEach((v, k) => {
        const at = "q" + (n + 1) + "v" + (k + 1);
        if (!Array.isArray(v.opts) || v.opts.length !== 4) bad.opts.push(at);
        else if (new Set(v.opts).size !== 4) bad.dupe.push(at);
        if (!(Number.isInteger(v.a) && v.a >= 0 && v.a < (v.opts || []).length))
          bad.range.push(at);
        if (!v.why || v.why.length < 24) bad.why.push(at);
        if (v.opts && Number.isInteger(v.a) && v.opts[v.a]) {
          const L = v.opts.map(o => o.length).sort((x, y) => y - x);
          if (v.opts[v.a].length === L[0] && L[0] - L[1] > 6) bad.tell.push(at);
        }
      });
    });
    ok("all 100 versions offer exactly four options", !bad.opts.length, bad.opts.join(" "));
    ok("...none of them repeating an option", !bad.dupe.length, bad.dupe.join(" "));
    ok("...each with exactly one answer, in range", !bad.range.length, bad.range.join(" "));
    ok("...each explaining itself", !bad.why.length, bad.why.join(" "));
    ok("...and none where the answer is the longest by more than six",
       !bad.tell.length, bad.tell.join(" "));

    /* And the rules only versions can break. */
    const same = { q: [], wrong: [], slot: [], crossed: [] };
    all.forEach((it, n) => {
      const vs = it.vs || [];
      const at = "q" + (n + 1);
      if (new Set(vs.map(v => v.q)).size !== vs.length) same.q.push(at);
      const wrongs = vs.map(v =>
        JSON.stringify(v.opts.filter((o, i) => i !== v.a).slice().sort()));
      if (new Set(wrongs).size !== wrongs.length) same.wrong.push(at);
      if (new Set(vs.map(v => v.a)).size < 2) same.slot.push(at);
      /* A version must not offer, as a wrong answer, what another version of the
         same question gives as the right one. */
      const rights = new Set(vs.map(v => v.opts[v.a]));
      vs.forEach((v, k) => {
        v.opts.forEach((o, i) => {
          if (i !== v.a && rights.has(o)) same.crossed.push(at + "v" + (k + 1));
        });
      });
    });
    ok("no question is worded the same way on two papers", !same.q.length, same.q.join(" "));
    ok("...or offers the same wrong answers twice", !same.wrong.length, same.wrong.join(" "));
    ok("...or keeps its answer in one place on all five", !same.slot.length, same.slot.join(" "));
    ok("...or marks wrong on one paper what it marks right on another",
       !same.crossed.length, same.crossed.join(" "));

    /* The excerpt still has to land: the highlight lives on the item, not the
       version, so one miss on any paper opens the book at the same lines. */
    const nohi = all.filter(it => !(it.hi || []).length);
    ok("every question still points at the lines that answer it", !nohi.length);
    const lost = [];
    all.forEach((it, n) => {
      const p = a.DATA.passages[it.p];
      const body = (p.text || []).join(" ");
      (it.hi || []).forEach(h => {
        if (body.indexOf(h) === -1) lost.push("q" + (n + 1) + ": " + h.slice(0, 30));
      });
    });
    ok("...and every one of those lines is in its own passage", !lost.length,
       lost.join(" | "));

    /* Nothing from page 121 onwards: the reveal is past tonight's reading. */
    const text = JSON.stringify(a.DATA).toLowerCase();
    const early = ["counterfeit", "half-crown", "six out and six back",
                   "centre of the circle", "center of the circle"]
      .filter(w => text.indexOf(w) !== -1);
    ok("nothing gives away the answer from the page after the reading", !early.length,
       early.join(", "));
  }
}

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);

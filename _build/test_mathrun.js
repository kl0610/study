/* The practice app, actually clicked.
 *
 * This exists because of a bug every other kind of test missed. "Make my
 * practice" was wired as `onclick = make`, so the browser handed the function a
 * MouseEvent as its first argument — which is the optional "only these problems"
 * map. An event object is truthy, so the set was built from it, came out empty,
 * hit the guard and returned. The page parsed, every pattern the other suite
 * greps for was present, and the central feature was dead.
 *
 * So this drives the real script through a small DOM: open a lesson, tick the
 * problems, press the button, answer the questions, finish. It asserts on what
 * the page rendered, not on what its source says.
 *
 *   node test_mathrun.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const html = fs.readFileSync(path.join(__dirname, "..", "math", "practice", "index.html"), "utf8");

let pass = 0;
const fails = [];
function ok(what, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what + (extra ? " — " + extra : "")); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
}
function group(n) { console.log("\n" + n); }

/* ============================ a very small DOM ============================
   Shared with the other runnable suites; see _build/domshim.js. */
const { Node, walk, find, boot, byId } = require("./domshim.js");

function run() {
  const { doc, body } = boot();
  const store = {};
  const calls = { begin: 0, right: 0, wrong: 0, credit: 0, chest: 0 };
  const MC = {
    config() {}, begin() { calls.begin++; }, right() { calls.right++; },
    wrong() { calls.wrong++; }, credit() { calls.credit++; }, note() {},
    clear() { return {}; }, chest() { calls.chest++; }, bests() { return {}; },
    state() { return { coins: 0, earned: 0, dragons: 0, beacon: { lit: false } }; },
    owns() { return false; }, equipped() { return null; }, equip() { return true; },
    buy() { return false; }, ask(it) { return it.q; },
  };
  const ctx = {
    document: doc, console, MC,
    addEventListener() {}, scrollTo() {},
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    },
    setTimeout: () => 0, clearTimeout() {},
    Math, JSON, Date, Number, String, Object, Array, Set, isFinite, RegExp,
  };
  /* The engine is stubbed above — it has its own suite, and what is under test
     here is the app. Everything else on the page runs for real. */
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
                   .map(m => m[1]).filter(b => !/Minecraft theme layer/.test(b));
  /* In a browser `window` IS the global object, so a module that assigns
     root.MATHMAP and a script that then reads a bare MATHMAP find the same
     thing. Pointing window at the context itself is what makes that true here;
     with a separate window object the modules load and the app cannot see them. */
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const b of blocks) vm.runInContext(b, ctx, { timeout: 20000 });
  return { doc, body, calls, store, $: id => byId(body, id), q: s => find(body, s) };
}

/* ============================ the walk through ============================ */
const R = run();

group("opening the app");
ok("the lesson list is drawn", /class="decade"/.test(R.$("decades").innerHTML));
ok("all twelve decades are there",
   (R.$("decades").innerHTML.match(/class="decade"/g) || []).length === 12);
ok("there are 120 lesson rows", R.q(".lrow").length === 120);
ok("lessons 1 to 10 are open", R.q(".lrow").slice(0, 10).every(b => !b.disabled));
ok("a late lesson with nothing built is disabled",
   R.q(".lrow").filter(b => Number(b.dataset.l) > 110).some(b => b.disabled));
ok("the footer says which lessons are built", /lessons 1&ndash;10/.test(R.$("foot").innerHTML));

group("opening lesson 7");
R.q(".lrow").find(b => b.dataset.l === "7").click();
ok("the picker opens", /which problems did you miss/i.test(R.$("picker").innerHTML));
ok("it names the printed page", /page 45/.test(R.$("picker").innerHTML));
ok("all thirty problems are listed", R.q(".pk").length === 30);
ok("each row says which skill it draws on",
   R.q(".pk").every(p => p.querySelectorAll(".s").length === 1));
ok("nothing is ticked yet", /Nothing picked yet/.test(R.$("picker").innerHTML));
ok("the make button starts disabled", R.$("smake").disabled === true);

group("ticking the six that came back wrong");
const MISSED = [6, 8, 10, 14, 16, 24];
for (const n of MISSED) {
  const row = R.q(".pk").find(p => p.dataset.n === String(n));
  row.querySelectorAll(".howmany button").find(b => b.dataset.k === "2").click();
}
ok("six problems are ticked",
   R.q(".pk").filter(p => p.classList.contains("on")).length === 6);
ok("the count says twelve questions", /12 questions/.test(R.$("picker").innerHTML));
ok("the make button is live now", R.$("smake").disabled === false);

group("asking for a single question");
{
  /* Some problems only want one look, so one is a choice alongside two, three
     and four. Checked by building a set of exactly that. */
  const one = R.q(".pk").find(p => p.dataset.n === "6");
  const buttons = one.querySelectorAll(".howmany button").map(b => b.dataset.k);
  ok("one, two, three and four are all offered",
     JSON.stringify(buttons) === JSON.stringify(["1", "2", "3", "4"]), buttons.join());
  one.querySelectorAll(".howmany button").find(b => b.dataset.k === "1").click();
  ok("choosing one drops the count to eleven", /11 questions/.test(R.$("picker").innerHTML));
  one.querySelectorAll(".howmany button").find(b => b.dataset.k === "2").click();
  ok("...and putting it back to two restores twelve",
     /12 questions/.test(R.$("picker").innerHTML));
}

group("pressing Make my practice");
R.$("smake").click();
ok("the picker closes", R.$("picker").innerHTML === "");
ok("a run started", R.calls.begin === 1);
ok("twelve questions are queued",
   (R.$("dots").innerHTML.match(/class="dot/g) || []).length === 12);
ok("the first question is on screen", /Question 1 of 12/.test(R.$("card").innerHTML));
ok("it says which homework problem it came from", /From problem \d+/.test(R.$("card").innerHTML));
ok("four options are offered", R.q(".opt").length === 4);
ok("back is disabled on the first question", R.$("back").disabled === true);
ok("the ticks were saved", !!JSON.parse(R.store["math.sets.v1"])["7"].picks);
ok("the questions were not saved",
   !JSON.stringify(JSON.parse(R.store["math.sets.v1"])).includes("opts"));

group("answering");
{
  /* Answer everything correctly by reading the page: pick each option in turn
     until the feedback says it is right. That is what a child does, and it
     exercises the wrong path too. */
  let asked = 0;
  for (let i = 0; i < 12; i++) {
    asked++;
    let done = false;
    for (let t = 0; t < 4 && !done; t++) {
      const opts = R.q(".opt");
      if (!opts[t]) break;
      opts[t].click();
      const go = R.$("go");
      if (!go) break;
      go.click();
      done = /That is right/.test(R.$("fb").innerHTML);
    }
    if (!done) break;
    const next = R.$("next");
    if (next) next.click();
  }
  ok("all twelve were reached", asked === 12);
  ok("right answers were recorded", R.calls.right + R.calls.credit >= 12);
  ok("wrong ones were too", R.calls.wrong > 0);
  ok("the run finished", R.calls.chest === 1);
  ok("a score is shown", /%/.test(R.$("scorebox").innerHTML));
  ok("it offers new questions on the same problems",
     /New questions, same problems/.test(R.$("scorebox").innerHTML));
  ok("it offers a way back to change the picks",
     /Change which problems/.test(R.$("scorebox").innerHTML));
}

group("the worked example, opened on a miss");
{
  /* Answer wrongly on purpose, open the example, and check the line that helps
     is marked. Reading and History have done this from the start; math opened
     the panel and highlighted nothing until now. */
  R.$("same").click();
  /* Getting a question wrong on purpose takes a little care: the first option
     is right about a quarter of the time, and picking it produces no miss and
     no button. So work along the questions until one is actually missed. */
  let btn = null;
  for (let i = 0; i < 12 && !btn; i++) {
    const opts = R.q(".opt");
    if (!opts.length) break;
    opts[0].click();
    const go = R.$("go");
    if (go) go.click();
    btn = R.$("readbtn");
    if (!btn) { const nx = R.$("next"); if (nx) nx.click(); }
  }
  ok("a worked example is offered after the miss", !!btn);
  if (btn) {
    btn.click();
    const box = R.$("readbox");
    ok("the example opens", box.hidden === false);
    ok("it has a title and a citation",
       /class="readtitle"/.test(box.innerHTML) && /class="readcite"/.test(box.innerHTML));
    ok("something in it is highlighted", /<mark class="hl">/.test(box.innerHTML));
    ok("it points into the book for more", /class="readbook"/.test(box.innerHTML));
    ok("it carries the lesson's own words", /class="readvocab"/.test(box.innerHTML));
    R.$("readdone").click();
    ok("and it closes again", box.hidden === true);
  }
}

group("a second set from the same ticks is not the same sheet");
{
  const first = R.$("card").innerHTML;
  const same = R.$("same");
  ok("the button is there", !!same);
  /* Counted relative to wherever we are, because the group above starts a run
     of its own to open the worked example. An absolute count made this fail the
     moment anything was inserted before it. */
  const before = R.calls.begin;
  same.click();
  ok("a fresh run started", R.calls.begin === before + 1);
  ok("twelve questions again",
     (R.$("dots").innerHTML.match(/class="dot/g) || []).length === 12);
  ok("and it is not the sheet just answered", R.$("card").innerHTML !== first);
}

group("reopening the lesson remembers the ticks");
{
  R.$("tolessons").click();
  R.q(".lrow").find(b => b.dataset.l === "7").click();
  ok("the six are ticked again",
     R.q(".pk").filter(p => p.classList.contains("on")).length === 6);
  ok("...and it still says twelve questions", /12 questions/.test(R.$("picker").innerHTML));
}

console.log("");
if (fails.length) {
  console.log(fails.length + " FAILED:");
  fails.forEach(f => console.log("  - " + f));
  process.exit(1);
}
console.log(pass + " assertions passed");

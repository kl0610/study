/* The mission shell — science and reading — actually clicked.
 *
 * These two subjects judged a multiple choice the instant a button was touched,
 * so a mis-tap was a wrong answer, and there was no way backwards or past a
 * question at all. History and math have asked for the answer to be confirmed
 * for months. This drives the real page through a small DOM and asserts on what
 * it renders: that choosing an option does not yet cost anything, that the
 * Check button is what judges, that Back and Skip are under every question, and
 * that a skipped question is a zero the results stop to mention.
 *
 *   node test_missionnav.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { boot, find, byId } = require("./domshim.js");

let pass = 0;
const fails = [];
function ok(what, cond, extra) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
}
function group(n) { console.log("\n" + n); }

/* Load one app and hand back the live page. The engine is stubbed — it has its
   own suite — and everything else on the page runs for real. */
function load(rel) {
  const html = fs.readFileSync(path.join(__dirname, "..", rel, "index.html"), "utf8");
  /* Exactly what the mission shell's own markup carries, and nothing else. The
     card's insides — #body, #act, #fb, #go, #next — are the page's to create,
     and a placeholder for any of them would be found and written into instead. */
  const { doc, body } = boot(["home", "play", "done", "missions", "vids", "foot",
    "mname", "mtag", "dots", "card", "quit", "quit2", "dtag", "scorebox",
    "drawer", "scrim", "dtitle", "dcite", "dbody", "dfoot", "dclose"], true);
  const store = {};
  const calls = { begin: 0, right: 0, wrong: 0 };
  const MC = {
    config() {}, begin() { calls.begin++; }, right() { calls.right++; },
    wrong() { calls.wrong++; }, credit() {}, note() {}, clear() { return {}; },
    chest() {}, bests() { return {}; }, ask(it) { return it.q; },
    state() { return { coins: 0, earned: 0, dragons: 0, beacon: { lit: false } }; },
    owns() { return false; }, equipped() { return null; },
  };
  const ctx = {
    document: doc, console, MC,
    addEventListener() {}, scrollTo() {},
    localStorage: { getItem: k => (k in store ? store[k] : null),
                    setItem: (k, v) => { store[k] = String(v); } },
    setTimeout: () => 0, clearTimeout() {},
    Math, JSON, Date, Number, String, Object, Array, Set, isFinite, RegExp,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
                   .map(m => m[1]).filter(b => !/Minecraft theme layer/.test(b));
  for (const b of blocks) vm.runInContext(b, ctx, { timeout: 20000 });
  const DATA = JSON.parse(html.match(/const DATA = (\{[\s\S]*?\});\r?\n/)[1]);
  return { ctx, doc, body, calls, DATA,
           $: id => byId(body, id), q: s => find(body, s),
           text: () => JSON.stringify(body.innerHTML) };
}

/* Start the first mission. The home screen builds the mission buttons and wires
   them, so this is the same route a child takes. */
function startFirst(P) {
  const m = P.q(".mission")[0];
  if (!m) throw new Error("no mission button on the home screen");
  m.click();
}

/* Skip forward to the first multiple choice, which is what the change is about.
   Not every app opens on one, and a select-all also renders .opt buttons and
   also offers a Check — so the type has to come from the data, not the markup.
   Reading the first .opt it found was how this suite first went wrong. */
function pickQuestion(P) {
  const items = P.DATA.missions[0].items;
  const want = items.findIndex(i => i.type === "pick");
  if (want < 0) throw new Error("no multiple choice in this app at all");
  for (let i = 0; i < want; i++) P.$("navnext").click();
  return P.q(".opt");
}

for (const rel of ["science/g5-matter-ch5", "science/g5-matter-ch6",
                   "science/g5-matter-ch1", "reading/sherlock-speckled-1"]) {
  const P = load(rel);
  const N = P.DATA.missions[0].items.length;

  group(rel + " — choosing is not answering");
  startFirst(P);
  const opts = pickQuestion(P);
  ok("the question renders its options", opts.length >= 2, opts.length + " options");
  const go = P.$("go");
  ok("there is a Check button", !!go && /Check my answer/.test(go.innerHTML || go.textContent || ""));
  ok("it starts disabled — nothing is chosen yet", !!go && go.disabled === true);

  opts[0].click();
  ok("choosing an option marks it chosen", opts[0].classList.contains("sel"));
  ok("...and costs nothing yet", P.calls.right === 0 && P.calls.wrong === 0);
  ok("...and arms the Check button", P.$("go").disabled === false);

  opts[1].click();
  ok("choosing a second option moves the choice", !opts[0].classList.contains("sel") &&
     opts[1].classList.contains("sel"));
  ok("...and still costs nothing", P.calls.right === 0 && P.calls.wrong === 0);

  group(rel + " — checking is answering");
  /* Which option is right is not knowable from outside — the app shuffles — so
     this checks each in turn until one lands, and asserts on both outcomes. */
  let judged = 0, wrongSeen = false;
  for (const o of P.q(".opt")) {
    if (o.disabled || o.classList.contains("out")) continue;
    o.click();
    const g = P.$("go"); if (!g) break;
    g.click(); judged++;
    if (P.calls.right) break;
    wrongSeen = true;
  }
  ok("checking eventually finds the right answer", P.calls.right === 1);
  ok("...and every check before it counted as a miss",
     P.calls.wrong === judged - 1, "wrong=" + P.calls.wrong + " checks=" + judged);
  if (wrongSeen) ok("a wrong option is greyed out and left behind",
                    P.q(".opt").some(o => o.classList.contains("out")));
  else { pass++; console.log("  ok   the first option checked was the right one"); }
  ok("the right one is marked right", P.q(".opt").some(o => o.classList.contains("good")));
  ok("and the way onward appears", !!P.$("next"));

  group(rel + " — Back and Skip are on every question");
  ok("there is a nav row", !!P.$("nav"));
  ok("Back is there", !!P.$("navback"));
  ok("Skip or Next is there", !!P.$("navnext"));
  ok("the position is shown", /\bof " + "" + N + "\b|of " + N/.test(P.q(".navpos")[0].innerHTML) ||
     P.q(".navpos")[0].innerHTML.indexOf("of " + N) !== -1,
     P.q(".navpos")[0].innerHTML);

  group(rel + " — a question can be left and come back to");
  P.$("next").click();                       /* on to question 2 */
  ok("Back is now offered", P.$("navback").disabled !== true);
  P.$("navback").click();                    /* and back to question 1 */
  ok("the answered question is replayed, not asked again",
     P.q(".opt").some(o => o.classList.contains("good")));
  ok("...with its buttons dead", P.q(".opt").every(o => o.disabled === true));
  ok("...and the way onward still live", !!P.$("next") && P.$("next").disabled === false);
  ok("...and it did not score twice", P.calls.right === 1);

  group(rel + " — nothing unanswered slips past");
  /* Skip everything that is left and try to finish. */
  let guard = 0;
  while (guard++ < N + 4) {
    const n = P.$("next") || P.$("navnext");
    if (!n) break;
    n.click();
    if (P.$("goback")) break;
  }
  ok("finishing stops on the skipped questions", !!P.$("goback"),
     "no notice appeared after skipping to the end");
  ok("...and offers to go to the first one", /Go to question \d+/.test(P.$("goback").innerHTML));
  ok("...and lets him finish anyway", !!P.$("anyway"));
  P.$("anyway").click();
  const score = P.$("scorebox").innerHTML;
  ok("the results appear", score.length > 0);
  ok("a skipped question is counted as skipped", /Skipped|left unanswered/.test(score), score.slice(0, 120));
  ok("and one right out of " + N + " is not a pass",
     /(\d+)%/.test(score) && +score.match(/(\d+)%/)[1] < 75,
     (score.match(/(\d+)%/) || [])[0]);
}

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);

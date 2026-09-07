/* The recitation app, actually typed into.
 *
 *   node _build/test_recite.js
 *
 * A poem drill is the one place where being marked wrong for a comma, or being
 * left with no way past a line you cannot remember, would do real damage. So
 * this walks all five levels through a small DOM and asserts on what the page
 * renders: that the forgiving match really is forgiving, that "Show me this
 * line" always gets you out, that a picture arrives on a miss without the words
 * in it, and that nothing on screen ever gives away a gap that is still open.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { boot, find, byId } = require("./domshim.js");

let pass = 0;
const fails = [];
const ok = (what, cond, extra) => {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what); console.log("  FAIL " + what + (extra ? " — " + extra : "")); }
};
const G = g => console.log("\n" + g);

const FILE = path.join(__dirname, "..", "recitation", "wise-old-owl", "index.html");
const HTML = fs.readFileSync(FILE, "utf8");

function load() {
  const { doc, body } = boot(["home", "play", "done", "eyebrow", "title", "sub",
    "fullpoem", "levels", "foot", "quit", "quit2", "lname", "ltag", "card",
    "dtag", "scorebox"], true);

  const calls = { begin: 0, right: 0, wrong: 0, note: 0, clear: [], chest: 0 };
  const MC = {
    config() {}, begin() { calls.begin++; },
    right(k) { calls.right++; calls.lastRight = k; },
    wrong(k) { calls.wrong++; calls.lastWrong = k; },
    note(k) { calls.note++; calls.lastNote = k; },
    credit() {}, clear(id, pct) { calls.clear.push({ id, pct }); return {}; },
    /* Faithful to the real engine, where chest() calls clear() itself. The app
       called both, so every level was logged twice and paid its coins twice —
       a stub that treated them as unrelated could never have shown that. */
    chest(host, pct, opts) { calls.chest++; return MC.clear(opts.id, pct, opts); },
    bests() { return {}; },
    state() { return { coins: 0, cleared: {} }; }, ask(it) { return it.q; },
  };
  const ctx = {
    document: doc, console, MC,
    addEventListener() {}, scrollTo() {},
    setTimeout: fn => { fn(); return 0; }, clearTimeout() {},
    Math, JSON, Date, Number, String, Object, Array, Set, Map, isFinite, RegExp,
    parseInt, parseFloat,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  /* the theme's own scripts are stubbed out; MC above stands in for them */
  const blocks = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1])
    .filter(b => !/Minecraft theme layer|__MC_PREFIX__|__MC_SFX__/.test(b));
  for (const b of blocks) vm.runInContext(b, ctx, { timeout: 20000 });

  const P = {
    ctx, body, calls,
    DATA: vm.runInContext("DATA", ctx),
    ART: vm.runInContext("ART", ctx),
    norm: vm.runInContext("norm", ctx),
    $: id => byId(body, id),
    q: s => find(body, s),
    card: () => byId(body, "card").innerHTML,
    level(i) { P.q(".lvl")[i].onclick(); },
    blanks: () => find(body, ".bl"),
    type(el, v) { el.value = v; el.onkeydown({ key: "Enter", preventDefault() {} }); },
  };
  return P;
}

/* ====================================================================== */
G("the poem, and what the page makes of it");
{
  const P = load();
  const L = P.DATA.lines;
  ok("eight lines", L.length === 8);
  ok("word for word from the sheet",
     L.map(l => l.t).join(" / ") ===
     "A wise old owl / Lived in an oak. / The more he saw, / The less he spoke. / " +
     "The less he spoke, / The more he heard. / Why can’t we be / Like that wise old bird?",
     L.map(l => l.t).join(" / "));
  ok("one stanza break, on the fourth line",
     L.filter(l => l.gap).length === 1 && L[3].gap === true);
  ok("...splitting it four and four, not three and five",
     L.findIndex(l => l.gap) === 3 && L.length === 8);
  /* The data said line four all along; the space was being put above that line
     instead of below it, so the poem broke after three. Where the gap falls is
     a rule in the stylesheet, so that is what has to be asserted. */
  ok("...and the space goes under that line, not over it",
     /\.poem \.line\.gap\{margin-bottom:/.test(HTML) &&
     !/\.poem \.line\.gap\{margin-top:/.test(HTML));
  ok("every line has a picture", L.every(l => !!P.ART[l.art]));
  ok("every picture is drawn in the file, not fetched",
     Object.values(P.ART).every(s => /^<svg/.test(s.trim()) && !/https?:|<image/.test(s)));
  ok("the repeated line reuses its picture", L[3].art === L[4].art);
  ok("the poem is printed on the home page to read first",
     P.$("fullpoem").textContent.indexOf("Like that wise old bird?") !== -1);

  G("five levels, each giving less away");
  const V = P.DATA.levels;
  ok("five of them", V.length === 5);
  ok("ids l1 to l5, which is what the hub and the dragon name",
     V.map(l => l.id).join() === "l1,l2,l3,l4,l5");
  ok("the ladder runs last words, first words, half, line, by heart",
     V.map(l => l.mode).join() === "last,first,half,line,heart");
  ok("the last one is the boss", V[4].boss === true && !V.slice(0, 4).some(l => l.boss));
  ok("every level explains itself", V.every(l => l.name && l.tag && l.blurb));
  ok("a card is drawn for each", P.q(".lvl").length === 5);
}

/* ====================================================================== */
G("marking is forgiving, because this is not a spelling test");
{
  const P = load();
  const n = P.norm;
  const same = (a, b, why) => ok(why, n(a) === n(b), n(a) + " vs " + n(b));
  same("owl", "owl", "the word itself");
  same("Owl", "owl", "capitals do not matter");
  same("  owl  ", "owl", "spaces around it do not matter");
  same("oak", "oak.", "a full stop does not matter");
  same("saw", "saw,", "a comma does not matter");
  same("bird", "bird?", "a question mark does not matter");
  same("cant", "can’t", "the apostrophe does not matter");
  same("can't", "can’t", "a straight apostrophe is the same as a curly one");
  same("the less he spoke", "The less he spoke.", "a whole line, punctuation and all");
  same("Why cant we be", "Why can’t we be", "a whole line with the apostrophe dropped");
  ok("but a different word is still wrong", n("owls") !== n("owl"));
  ok("and an empty answer is not a match", n("") !== n("owl"));
}

/* ====================================================================== */
G("level 1 — the last word of each line");
{
  const P = load();
  P.level(0);
  ok("the level starts", P.calls.begin === 1 && P.$("play").classList.contains("hide") === false);
  const bl = P.blanks();
  ok("eight gaps, one per line", bl.length === 8, bl.length + " gaps");
  ok("the rest of the poem is on the page",
     P.card().indexOf("Lived") !== -1 && P.card().indexOf("wise") !== -1);
  ok("...but never the word that is missing",
     P.card().indexOf(">owl<") === -1 && P.card().indexOf(">oak.<") === -1);
  ok("each gap is about as wide as its word",
     bl.every(el => /width:\s*[\d.]+ch/.test(el.attr.style || "")));

  G("...getting one right");
  P.type(bl[0], "owl");
  ok("a right answer is scored", P.calls.right === 1);
  ok("...and keyed to the line, so a miss can be looked up later",
     P.calls.lastRight === "l1:line1", P.calls.lastRight);
  ok("...and the word is now printed in the poem", /class="w got">owl</.test(P.card()));
  ok("...with the feedback surviving the redraw",
     /Yes, first go/.test(P.card()), "the card is rebuilt after every answer");
  ok("...and no picture, because nothing went wrong", P.q(".artbox").length === 0);
  ok("...and the cursor has walked on to the next gap, not back to the top",
     P.q(".bl")[0].getAttribute("data-b") === "1");

  G("...getting one wrong");
  P.type(P.q(".bl")[0], "tree");
  ok("a wrong answer is counted", P.calls.wrong === 1);
  ok("...and it is not accepted", P.blanks().length === 7);
  ok("...and a picture arrives as a clue", P.q(".artbox").length === 1);
  ok("...naming the line by number, not by its words",
     /Line 2/.test(P.card()) && P.card().indexOf("Lived in an oak") === -1);
  ok("...and the message does not say the answer", P.card().indexOf(">oak") === -1);

  P.type(P.q(".bl")[0], "oak.");
  ok("the full stop is forgiven", P.calls.right === 2);

  G("...and the way out is always there");
  ok("Show me this line is offered from the start, not only after a slip",
     !!P.$("peek"));
  P.$("peek").onclick();
  ok("it fills the gap in", P.blanks().length === 5);
  ok("...and it is recorded as help, not as a wrong answer",
     P.calls.note === 1 && P.calls.wrong === 1);
  ok("...and now the words are printed under the picture",
     /class="artline"/.test(P.card()) && P.card().indexOf("The more he saw") !== -1);
  /* Being handed the answer is not a win to be congratulated for, and not a
     failure to be told off for. */
  ok("...and it is neither congratulated nor punished",
     /class="fb plain"/.test(P.card()) &&
     !/class="fb yes"/.test(P.card()) && !/class="fb no"/.test(P.card()));

  G("...to the end");
  let guard = 0;
  while (P.blanks().length && guard++ < 20) {
    const el = P.blanks()[0];
    const k = +el.getAttribute("data-b");
    P.type(el, vm.runInContext("BL", P.ctx)[k].w);
  }
  ok("every gap gets filled", P.blanks().length === 0);
  ok("the results appear", P.$("done").classList.contains("hide") === false);
  ok("the level is recorded against l1", P.calls.clear.length === 1 &&
     P.calls.clear[0].id === "l1");
  /* chest() calls clear() itself, so calling both logged the level twice and
     paid the coins twice. Once, exactly once, however it ended. */
  ok("...once, not twice", P.calls.clear.length === 1, P.calls.clear.length + " times");
  ok("...and the chest is painted into the results", P.calls.chest === 1);
  const pct = P.calls.clear[0].pct;
  ok("the score is dragged down by the miss and the peek, not perfect",
     pct > 0 && pct < 100, pct + "%");
  ok("...and it is still above the clear bar, so the chest is earned",
     pct >= 75 && P.$("scorebox").innerHTML.indexOf('class="again"') === -1, pct + "%");
  ok("the lines that were rough are listed with their pictures",
     /class="rline"/.test(P.$("scorebox").innerHTML) &&
     /<svg/.test(P.$("scorebox").innerHTML));
  ok("...and it offers the next level", !!P.$("up"));
}

/* ====================================================================== */
G("asking to be shown the answer is not a way to win");
{
  /* Three of the eight shown: (5x100 + 3x25) / 8 = 72%, under the 75% every
     subject on this site treats as cleared. */
  const P = load();
  P.level(0);
  for (let i = 0; i < 3; i++) P.$("peek").onclick();
  let guard = 0;
  while (P.blanks().length && guard++ < 20) {
    const el = P.blanks()[0];
    P.type(el, vm.runInContext("BL", P.ctx)[+el.getAttribute("data-b")].w);
  }
  const pct = P.calls.clear[0].pct;
  ok("three lines shown drops it under the bar", pct === 72, pct + "%");
  ok("...so the chest stays shut", P.calls.chest === 0);
  ok("...and it is still recorded, once", P.calls.clear.length === 1);
  const box = P.$("scorebox").innerHTML;
  ok("...and the screen is encouraging, not empty-handed",
     /class="again"/.test(box) && /Try again/.test(box));
  ok("...and says why, without scolding",
     /3 lines were given to you in full/.test(box) && !/wrong|bad|poor|fail/i.test(box));
  ok("...and points at what to do next",
     /Say the poem out loud once/.test(box));
  ok("...and the way back in is still offered",
     !!P.$("again") && !!P.$("pick"));

  G("...and no amount of being shown gets you a perfect score");
  const Q = load();
  Q.level(0);
  let g2 = 0;
  while (Q.blanks().length && g2++ < 20) Q.$("peek").onclick();
  ok("every gap shown scores the floor", Q.calls.clear[0].pct === 25);
  ok("...never a hundred", Q.calls.clear[0].pct < 100);
  ok("...no chest", Q.calls.chest === 0);
  ok("...and nothing was logged as a wrong answer either",
     Q.calls.wrong === 0 && Q.calls.right === 0);

  /* And the other way: one peek out of eight is not enough to lose it. */
  const R = load();
  R.level(0);
  R.$("peek").onclick();
  let g3 = 0;
  while (R.blanks().length && g3++ < 20) {
    const el = R.blanks()[0];
    R.type(el, vm.runInContext("BL", R.ctx)[+el.getAttribute("data-b")].w);
  }
  ok("one peek out of eight still clears (91%)", R.calls.clear[0].pct === 91,
     R.calls.clear[0].pct + "%");
  ok("...and still opens the chest", R.calls.chest === 1);
}

/* ====================================================================== */
G("level 2 — the first word of each line");
{
  const P = load();
  P.level(1);
  ok("eight gaps again", P.blanks().length === 8);
  ok("the gaps are at the start of the lines",
     P.q(".line").every(l => {
       const kids = l.children;
       return kids.length === 0 || kids[0].classList.contains("bl");
     }));
  ok("the last words are shown this time", P.card().indexOf("owl") !== -1);
}

/* ====================================================================== */
G("level 3 — half the words gone");
{
  const P = load();
  P.level(2);
  const BL = vm.runInContext("BL", P.ctx);
  ok("seventeen gaps", BL.length === 17, BL.length + " gaps");
  ok("the rhyming word is always one of them",
     P.DATA.lines.every((ln, li) => {
       const ws = ln.t.split(" ");
       return BL.some(b => b.li === li && b.wi === ws.length - 1);
     }));

  /* A line here has two gaps. Printing the line to help with the first would
     answer the second, so the words stay off until both are settled. */
  G("...and a line with two gaps keeps its second one secret");
  const first = P.blanks()[0];
  P.type(first, "wrong");
  ok("a miss shows the picture", P.q(".artbox").length === 1);
  ok("...but not the line, because another gap in it is still open",
     P.q(".artline").length === 0);
  P.$("peek").onclick();
  ok("Show me this line gives every gap in that line", P.calls.note === 1 &&
     vm.runInContext("ST", P.ctx).filter(s => s.shown).length === 2);
  ok("...and only then are the words printed", P.q(".artline").length === 1);
}

/* ====================================================================== */
G("level 4 — a whole line at a time");
{
  const P = load();
  P.level(3);
  ok("one input, not eight", P.q(".lineinput").length === 1 && P.blanks().length === 0);
  ok("the rest of the poem is still there to lean on",
     P.card().indexOf("Like that wise old bird?") !== -1);
  P.type(P.$("lineinput"), "a wise old owl");
  ok("capitals are not required", P.calls.right === 1);
  ok("...and the line is now shown as done", /class="w got"/.test(P.card()));
  P.type(P.$("lineinput"), "lived in a oak");
  ok("a real slip is still a slip", P.calls.wrong === 1);
  ok("...and the picture comes up", P.q(".artbox").length === 1);
  P.type(P.$("lineinput"), "Lived in an oak.");
  ok("the right line is taken", P.calls.right === 2);
}

/* ====================================================================== */
G("on the whole-line levels the hint hands over one word at a time");
{
  const P = load();
  P.level(3);                                   /* Line by line */
  const input = () => P.$("lineinput");
  ok("the button offers a word, not the line",
     /Give me the first word/.test(P.card()), P.card().match(/id="peek">[^<]*/));
  ok("the input starts empty", (input().value || "") === "");

  P.$("peek").onclick();
  ok("one press writes in the first word", (input().value || "").trim() === "A");
  ok("...and says to carry on from there", /Carry on from there/.test(P.card()));
  ok("...and does not settle the line", P.q(".lineinput").length === 1);
  ok("...and the button now offers another", /Give me another word/.test(P.card()));
  ok("...and it is one note against that line, not one per word",
     P.calls.note === 1);

  P.$("peek").onclick();
  ok("the next press adds the second word", (input().value || "").trim() === "A wise");
  ok("...still one note", P.calls.note === 1);

  /* Finish it yourself after two words and it costs two words, not the line. */
  P.type(input(), "A wise old owl");
  ok("typing the rest is accepted", P.calls.right === 1);
  const ST = vm.runInContext("ST", P.ctx);
  ok("...and two of the four words are recorded as given", ST[0].given === 2);

  G("...and the last word settles the line, so it is never a dead end");
  const Q = load();
  Q.level(3);
  for (let i = 0; i < 4; i++) Q.$("peek").onclick();   /* "Lived in an oak." is four */
  const QST = vm.runInContext("ST", Q.ctx);
  ok("four presses on a four-word line completes it", QST[0].done === true);
  ok("...and moves on to the next line", vm.runInContext("CUR", Q.ctx) === 1);

  G("...and a word costs less than the whole line");
  const one = load(); one.level(3);
  one.$("peek").onclick();
  one.type(one.$("lineinput"), "A wise old owl");
  let g = 0;
  while (one.q(".lineinput").length && g++ < 20) {
    const li = vm.runInContext("CUR", one.ctx);
    one.type(one.$("lineinput"), one.DATA.lines[li].t);
  }
  const all = load(); all.level(3);
  let g2 = 0;
  while (all.q(".lineinput").length && g2++ < 80) all.$("peek").onclick();
  ok("one word out of four on one line barely costs anything (" +
     one.calls.clear[0].pct + "%)", one.calls.clear[0].pct === 98);
  ok("...and being handed every line lands on the floor (" +
     all.calls.clear[0].pct + "%)", all.calls.clear[0].pct === 25);
  ok("...so needing a word is not the same as being told",
     one.calls.clear[0].pct > all.calls.clear[0].pct);
  ok("one word given still clears, and still opens the chest",
     one.calls.clear[0].pct >= 75 && one.calls.chest === 1);
  ok("...and the results call it a word given, not a line shown",
     /one word given/.test(one.$("scorebox").innerHTML) &&
     one.$("scorebox").innerHTML.indexOf("shown to you") === -1,
     one.$("scorebox").innerHTML.match(/<small>[^<]*/g));
}

/* ====================================================================== */
G("level 5 — by heart, nothing but the picture");
{
  const P = load();
  P.level(4);
  ok("it is the boss level", P.DATA.levels[4].boss === true);
  ok("no words of the poem are on the page at all",
     P.DATA.lines.every(l => P.card().indexOf(l.t) === -1),
     P.DATA.lines.filter(l => P.card().indexOf(l.t) !== -1).map(l => l.t).join(" | "));
  ok("the unreached lines are dots", (P.card().match(/· · ·/g) || []).length === 7);
  ok("but the picture for the line being asked is up", P.q(".artbox").length === 1);
  ok("...labelled by number only", /Line 1/.test(P.card()) && P.q(".artline").length === 0);

  P.type(P.$("lineinput"), "A wise old owl");
  ok("a line typed from memory is taken", P.calls.right === 1);
  ok("...and it stays on screen, so the poem builds up as it goes",
     P.card().indexOf("A wise old owl") !== -1);
  ok("...and the picture moves to the next line",
     /Line 2/.test(P.card()) && P.card().indexOf("Lived in an oak") === -1);

  G("...and a child who is stuck is never stuck");
  let guard = 0;
  while (P.q(".lineinput").length && guard++ < 80) P.$("peek").onclick();
  ok("asking for words walks all the way to the end", P.$("done").classList.contains("hide") === false);
  ok("...and it still finishes and scores", P.calls.clear.length === 1);
  ok("...and the one line said from memory still counts for something",
     P.calls.clear[0].pct === 34, P.calls.clear[0].pct + "% for one right and seven shown");

  /* The floor, on its own: the hardest level of the hardest kind, done
     entirely on help. It has to end somewhere above nothing, because a zero
     for a child who asked for help is exactly the discouraging thing. */
  const Q = load();
  Q.level(4);
  let g2 = 0;
  while (Q.q(".lineinput").length && g2++ < 80) Q.$("peek").onclick();
  ok("a level done entirely on help still finishes", Q.calls.clear.length === 1);
  ok("...and scores the floor rather than nothing",
     Q.calls.clear[0].pct === 25, Q.calls.clear[0].pct + "%");
  ok("...and none of it was counted as a wrong answer", Q.calls.wrong === 0);
}

/* ====================================================================== */
G("it is a themed app on the site");
{
  ok("the engine is configured as recite1", /"app":\s*"recite1"/.test(HTML));
  ok("...as a Recitation subject, so the back link knows where to go",
     /"subject":\s*"Recitation"/.test(HTML));
  ok("...with the dragon on the last level", /"dragon":\s*\["l5"\]/.test(HTML));
  ok("the theme's stylesheet came across", /mc-hud|--mc-/.test(HTML));
  ok("there is an All subjects link for the subject link to sit beside",
     /class="hublink"/.test(HTML));
  ok("nothing is fetched from anywhere",
     !/https?:\/\/(?!www\.w3\.org)|<link\b|\bfetch\(/i.test(HTML));

  const scripts = [...HTML.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  let parsed = 0;
  for (const s of scripts) { try { new vm.Script(s); parsed++; } catch (e) { console.log("      " + e.message); } }
  ok("all " + scripts.length + " inline scripts parse", parsed === scripts.length);
}

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);

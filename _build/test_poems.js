/* Every poem in Recitation, checked as a built app — and the newest one played.
 *
 *   node _build/test_poems.js
 *
 * test_recite.js drives the owl through all five levels and proves the shell
 * works. Every poem after it is that same shell with different data, so what
 * has to be checked for each new one is the data: that the ladder is intact,
 * that every line has a picture the app actually holds, and that a poem built
 * from the last one's shell does not go on wearing the last one's name.
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

const ROOT = path.join(__dirname, "..");
const POEMS = fs.readdirSync(path.join(ROOT, "recitation"))
  .filter(d => fs.existsSync(path.join(ROOT, "recitation", d, "index.html")))
  .map(d => {
    const html = fs.readFileSync(path.join(ROOT, "recitation", d, "index.html"), "utf8");
    const grab = name => {
      const i = html.indexOf("const " + name + " = ");
      const b = html.indexOf("{", i);
      let depth = 0;
      for (let j = b; j < html.length; j++) {
        if (html[j] === "{") depth++;
        else if (html[j] === "}" && !--depth)
          return vm.runInNewContext("(" + html.slice(b, j + 1) + ")");
      }
      throw new Error("unbalanced " + name + " in " + d);
    };
    return { dir: d, html, DATA: grab("DATA"), ART: grab("ART") };
  });

const MODES = "last,first,half,line,heart";

/* ====================================================================== */
G("what is on the shelf");
ok(POEMS.length + " poems built: " + POEMS.map(p => p.DATA.plain).join(", "),
   POEMS.length >= 2);
ok("each is in its own folder", new Set(POEMS.map(p => p.dir)).size === POEMS.length);

POEMS.forEach(P => {
  const D = P.DATA;
  G(D.plain + "  (recitation/" + P.dir + ")");

  ok("it carries everything the page prints",
     ["title", "plain", "eyebrow", "sub", "source"].every(k => D[k] && String(D[k]).trim()));
  ok(D.lines.length + " lines, none of them empty",
     D.lines.length >= 2 && D.lines.every(l => /[A-Za-z]/.test(l.t)));
  ok("the stanza breaks are marked on the line a stanza ends on",
     D.lines.every(l => l.gap === undefined || l.gap === true) &&
     !(D.lines[D.lines.length - 1] || {}).gap,
     "a gap on the last line would put space under nothing");

  G("...its pictures");
  ok("every line names a picture", D.lines.every(l => !!l.art));
  const missing = D.lines.filter(l => !P.ART[l.art]).map(l => l.art);
  ok("...and the app really holds every one of them", !missing.length, missing.join(", "));
  ok("every picture is an inline drawing, nothing fetched",
     Object.values(P.ART).every(s => /^<svg/.test(String(s).trim())) &&
     !/<image|https?:/.test(Object.values(P.ART).join("")));
  const unused = Object.keys(P.ART).filter(k => !D.lines.some(l => l.art === k));
  /* The Eagle is not an owl. A poem built from the last one's shell that kept
     its pictures would be carrying six drawings of the wrong bird. */
  ok("no picture is left over from another poem", !unused.length, unused.join(", "));

  G("...its ladder");
  ok("five levels, l1 to l5", D.levels.map(l => l.id).join() === "l1,l2,l3,l4,l5");
  ok("the ladder runs " + MODES, D.levels.map(l => l.mode).join() === MODES);
  ok("the last one is the boss, and only it",
     D.levels[4].boss === true && !D.levels.slice(0, 4).some(l => l.boss));
  ok("every level explains itself", D.levels.every(l => l.name && l.tag && l.blurb));

  G("...and it introduces itself as itself");
  const title = (P.html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  ok("the browser title is this poem", title.indexOf(D.plain) !== -1, title);
  const others = POEMS.filter(o => o !== P).map(o => o.DATA.plain);
  const borrowed = others.filter(name => title.indexOf(name) !== -1);
  ok("...and not another poem's", !borrowed.length, borrowed.join(", "));
  ok("the engine is configured, with the dragon on the last level",
     /MC\.config\(/.test(P.html) && /"dragon":\s*\["l5"\]/.test(P.html) &&
     /"subject":\s*"Recitation"/.test(P.html));
  const app = (P.html.match(/"app":\s*"([^"]+)"/) || [])[1];
  ok("...under its own app key (" + app + ")", !!app);
  P.app = app;
});

G("no two poems share an app key");
{
  const keys = POEMS.map(p => p.app);
  ok(keys.join(", ") + " are all different", new Set(keys).size === keys.length,
     "two apps sharing a key would share a score");
}

G("the hub lists every one of them");
{
  const hub = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  POEMS.forEach(P => {
    ok(P.DATA.plain + " is on the hub",
       hub.indexOf("recitation/" + P.dir + "/") !== -1 &&
       hub.indexOf('app:"' + P.app + '"') !== -1);
  });
}

/* ====================================================================== */
/* The shell is proved by test_recite.js against the owl. This plays the newest
   poem far enough to know its own data drives that shell properly. */
const NEWEST = POEMS.find(p => p.dir === "the-eagle") || POEMS[POEMS.length - 1];
G("playing " + NEWEST.DATA.plain);
{
  const { doc, body } = boot(["home", "play", "done", "eyebrow", "title", "sub",
    "fullpoem", "levels", "foot", "quit", "quit2", "lname", "ltag", "card",
    "dtag", "scorebox"], true);
  const calls = { right: 0, wrong: 0, note: 0, clear: [], chest: 0 };
  const MC = {
    config() {}, begin() {}, right() { calls.right++; }, wrong() { calls.wrong++; },
    note() { calls.note++; }, credit() {},
    clear(id, pct) { calls.clear.push({ id, pct }); return {}; },
    chest(h, pct, o) { calls.chest++; return MC.clear(o.id, pct, o); },
    bests() { return {}; }, state() { return { coins: 0, cleared: {} }; },
    ask(it) { return it.q; },
  };
  const ctx = { document: doc, console, MC, addEventListener() {}, scrollTo() {},
    setTimeout: fn => { fn(); return 0; }, clearTimeout() {},
    Math, JSON, Date, Number, String, Object, Array, Set, Map, isFinite, RegExp,
    parseInt, parseFloat };
  ctx.window = ctx;
  vm.createContext(ctx);
  [...NEWEST.html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1])
    .filter(b => !/Minecraft theme layer|__MC_PREFIX__|__MC_SFX__/.test(b))
    .forEach(b => vm.runInContext(b, ctx, { timeout: 20000 }));

  const $ = id => byId(body, id);
  const q = s => find(body, s);
  const card = () => byId(body, "card").innerHTML;

  ok("the poem is printed on the home page to read first",
     $("fullpoem").textContent.indexOf(NEWEST.DATA.lines[0].t) !== -1);
  ok("a card is drawn for each level", q(".lvl").length === 5);

  q(".lvl")[0].onclick();                       /* Last words */
  const bl = q(".bl");
  ok("Last words opens one gap per line", bl.length === NEWEST.DATA.lines.length);
  const BL = vm.runInContext("BL", ctx);
  ok("...and the gap is the last word of each line",
     BL.every((b, i) => {
       const ws = NEWEST.DATA.lines[b.li].t.split(" ");
       return b.w === ws[ws.length - 1];
     }));

  const first = bl[0];
  first.value = BL[0].w;
  first.onkeydown({ key: "Enter", preventDefault() {} });
  ok("a right answer is taken", calls.right === 1);
  ok("...and the word is printed into the poem", /class="w got"/.test(card()));

  const nowGap = q(".bl")[0];
  nowGap.value = "definitely wrong";
  nowGap.onkeydown({ key: "Enter", preventDefault() {} });
  ok("a wrong answer is counted", calls.wrong === 1);
  ok("...and its picture comes up as a clue", q(".artbox").length === 1);
  ok("...without giving the line away", q(".artline").length === 0);

  $("peek").onclick();
  ok("Show me this line is always there", calls.note === 1);

  let guard = 0;
  while (q(".bl").length && guard++ < 40) {
    const el = q(".bl")[0];
    el.value = BL[+el.getAttribute("data-b")].w;
    el.onkeydown({ key: "Enter", preventDefault() {} });
  }
  ok("the level plays through to the end", $("done").classList.contains("hide") === false);
  ok("...and is recorded against l1, once",
     calls.clear.length === 1 && calls.clear[0].id === "l1");
}

console.log("\n" + pass + " assertions passed" + (fails.length ? ", " + fails.length + " FAILED" : ""));
process.exit(fails.length ? 1 : 0);

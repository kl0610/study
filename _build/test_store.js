/* The Trading Post — economy tests.
 *
 * A shop that can charge twice, go overdrawn, or let something be worn that was
 * never bought is worse than no shop, because the currency stops being trusted.
 * And it has to hold the line the whole design rests on: nothing earned is ever
 * taken away. That is why there are two numbers — a spendable balance and a
 * lifetime total that only rises — and most of what follows is about keeping
 * the second one honest.
 *
 *   node test_store.js
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "store", "index.html"), "utf8");
const engine = fs.readFileSync(path.join(__dirname, "mc.js"), "utf8");

let pass = 0;
const fails = [];
function ok(what, cond) {
  if (cond) { pass++; console.log("  ok   " + what); }
  else { fails.push(what); console.log("  FAIL " + what); }
}
function group(n) { console.log("\n" + n); }

/* ---------- a browser, barely ---------- */
function fresh(seed) {
  const store = {};
  if (seed) store["mc.study.v1"] = JSON.stringify(seed);
  const el = () => ({
    style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {}, appendChild() {}, removeChild() {}, insertBefore() {},
    querySelector: () => null, querySelectorAll: () => [], addEventListener() {},
    attrs: {},
  });
  const root = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } };
  const ctx = {
    window: {}, console,
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
    },
    document: {
      documentElement: root,
      body: el(), head: el(),
      createElement: el, getElementById: () => null,
      querySelector: () => null, querySelectorAll: () => [],
      addEventListener() {}, readyState: "complete",
    },
    setTimeout: () => 0, clearTimeout() {}, Audio: function () { return { play() {} }; },
    Math, JSON, Date, isFinite, Number, String, Object, Array,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(engine, ctx);
  return { MC: ctx.window.MC, root, raw: () => JSON.parse(store["mc.study.v1"]) };
}

/* ---------- the catalogue, read out of the page ---------- */
const AISLES = (() => {
  const i = html.indexOf("const AISLES = [");
  const b = html.indexOf("[", i);
  let d = 0;
  for (let j = b; j < html.length; j++) {
    if (html[j] === "[") d++;
    else if (html[j] === "]") { d--; if (!d) return eval(html.slice(b, j + 1)); }
  }
  throw new Error("could not read AISLES");
})();
const ITEMS = AISLES.flatMap(a => a.items.map(it => ({ ...it, slot: a.slot })));
const PAID = ITEMS.filter(i => !i.free);

group("the catalogue");
ok("five aisles", AISLES.length === 5);
ok("every aisle has a slot and at least three things",
   AISLES.every(a => a.slot && a.items.length >= 3));
ok("every item has a unique id", new Set(ITEMS.map(i => i.id)).size === ITEMS.length);
ok("every item has a name and a description",
   ITEMS.every(i => i.name && i.desc));
ok("everything not free has a whole-number price above zero",
   PAID.every(i => Number.isInteger(i.cost) && i.cost > 0));
ok("nothing free has a price", ITEMS.filter(i => i.free).every(i => i.cost === undefined));
ok("three aisles start you with something free; ranks and capes start empty",
   AISLES.filter(a => a.items.some(i => i.free)).length === 3);
ok("capes are the aisle you can see on the character",
   AISLES.some(a => a.slot === "cape" && a.items.length >= 5));
ok("a fallback names a real free item in that aisle",
   AISLES.every(a => !a.fallback || a.items.some(i => i.id === a.fallback && i.free)));

group("prices — a small win most weeks, on a good week of 90 to 140 coins");
const costs = PAID.map(i => i.cost).sort((a, b) => a - b);
ok("the cheapest thing is reachable inside a week (" + costs[0] + ")", costs[0] <= 60);
ok("at least four things cost under 130", costs.filter(c => c < 130).length >= 4);
ok("there is something worth saving a month for", costs.some(c => c >= 700));
ok("the top of the shelf takes a term (" + costs[costs.length - 1] + ")",
   costs[costs.length - 1] >= 2500);
ok("every aisle has something under 170",
   AISLES.every(a => a.items.some(i => i.free || i.cost < 170)));

group("buying");
{
  const { MC } = fresh({ coins: 100, earned: 100 });
  ok("cannot buy what you cannot afford", MC.buy("x", 101) === false);
  ok("...and nothing was charged", MC.state().coins === 100);
  ok("can buy what you can afford", MC.buy("x", 90) === true);
  ok("...and the balance falls", MC.state().coins === 10);
  ok("...and the lifetime total does not", MC.state().earned === 100);
  ok("...and the thing is owned", MC.owns("x") === true);
  ok("buying it twice is refused", MC.buy("x", 90) === false);
  ok("...so a double tap cannot charge twice", MC.state().coins === 10);
  ok("a free thing costs nothing and is still owned",
     MC.buy("y", 0) === true && MC.state().coins === 10 && MC.owns("y"));
}

group("nothing earned is ever taken away");
{
  const { MC } = fresh({ coins: 0, earned: 0 });
  MC.config({ app: "t", hud: false });
  MC.begin({ id: "s1", total: 4 });
  for (let i = 0; i < 4; i++) MC.right("q" + i);
  MC.clear("s1", 100, { id: "s1", total: 4 });
  const after = MC.state();
  ok("a perfect run pays and both numbers rise together",
     after.coins > 0 && after.earned === after.coins);
  const paid = after.coins;
  MC.buy("spend", paid);
  ok("spending it all leaves nothing to spend", MC.state().coins === 0);
  ok("...but the year's total is untouched", MC.state().earned === paid);
  MC.clear("s1", 100, { id: "s1", total: 4 });
  ok("earning again adds to both", MC.state().earned > paid && MC.state().coins > 0);
  ok("earned is never below the balance", MC.state().earned >= MC.state().coins);
}

group("an old save, from before the shop existed");
{
  const { MC } = fresh({ coins: 240 });     // no `earned` key at all
  ok("their coins count as earned rather than vanishing", MC.state().earned === 240);
  ok("...and are still theirs to spend", MC.state().coins === 240);
}

group("wearing");
{
  const { MC, root } = fresh({ coins: 500, earned: 500 });
  ok("cannot wear what is not owned", MC.equip("theme", "nether") === false);
  ok("...and nothing was worn", MC.equipped("theme") === null);
  MC.buy("nether", 240);
  ok("can wear what is owned", MC.equip("theme", "nether") === true);
  ok("...and the root element says so", root.attrs["data-mc-theme"] === "nether");
  ok("taking it off is free and always allowed", MC.equip("theme", null) === true);
  ok("...and falls back to the default", root.attrs["data-mc-theme"] === "overworld");
  ok("wearing costs nothing", MC.state().coins === 260);
  ok("a purse writes its own attribute",
     MC.buy("gold", 50) && MC.equip("purse", "gold") &&
     root.attrs["data-mc-purse"] === "gold");
  ok("an unnamed slot is refused", MC.equip("", "gold") === false);
}

group("requirements — the two that coins alone cannot buy");
{
  const gated = ITEMS.filter(i => i.needs);
  ok("three things cannot be bought on coins alone", gated.length === 3);
  ok("all of them are at the expensive end", gated.every(i => i.cost >= 900));
  ok("each names a requirement the page knows how to test",
     gated.every(i => /dragon|beacon|elytra/.test(i.needs)));
  ok("the elytra still wants breadth across the subjects, as it always has",
     /subjectsCleared >= S\.elytraNeeds/.test(html));
  const { MC } = fresh({ coins: 5000, earned: 5000, dragon: 0 });
  const S = MC.state();
  ok("a fresh save has slain no dragon and lit no beacon",
     S.dragons === 0 && !S.beacon.lit);
  /* The gate is the page's, not the engine's: the engine will sell anything it
     is asked to. That is deliberate — the shelf is content — so what is checked
     here is that the page refuses first. */
  ok("the page checks the requirement before it calls buy",
     /if \(it\.needs && !NEEDS\[it\.needs\]\.test\(ST\)\) return/.test(html));
  ok("...and buy() is only reached through that check",
     /function buy\(id\)\{?[\s\S]{0,200}?const stop = blocked\(it\);[\s\S]{0,80}?if \(stop\)/.test(html));
}

group("resetting");
{
  const { MC } = fresh({ coins: 300, earned: 900, owned: { a: true }, equip: { theme: "end" } });
  MC.reset();
  const S = MC.state();
  ok("a reset empties the purse", S.coins === 0 && S.earned === 0);
  ok("...and the wardrobe with it", !MC.owns("a") && MC.equipped("theme") === null);
}

group("the hub's copy of the rank names");
{
  /* Two lists of the same thing is how they come apart, so the hub's map is
     checked against the shop's catalogue rather than trusted. */
  const hub = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const m = hub.match(/const RANKS = \{[\s\S]*?\};/);
  ok("the hub carries a rank map", !!m);
  const RANKS = m ? eval("(" + m[0].replace(/^const RANKS = /, "").replace(/;$/, "") + ")") : {};
  const titles = AISLES.find(a => a.slot === "title").items;
  ok("it names every rank on the shelf", titles.every(t => RANKS[t.id]));
  ok("...with the same wording", titles.every(t => RANKS[t.id] === t.name));
  ok("...and nothing that is not on the shelf",
     Object.keys(RANKS).every(id => titles.some(t => t.id === id)));
  ok("the hub reads what is worn rather than guessing",
     /MC\.equipped\("title"\)/.test(hub));
  ok("the hub sends you to the shop as well as the trophy room",
     /href="store\/index\.html"/.test(hub) && /href="trophy\/index\.html"/.test(hub));
}

group("the character");
{
  const { MC, root } = fresh({ coins: 4000, earned: 4000 });
  ok("the engine can draw one", typeof MC.hero === "function");
  const host = { innerHTML: "", parentNode: {} };
  MC.hero(host, "Prospector");
  ok("it draws a figure", /class="mc-hero"/.test(host.innerHTML));
  ok("...wearing no cape to begin with", /data-cape="none"/.test(host.innerHTML));
  ok("...with the rank under it", /Prospector/.test(host.innerHTML));
  ok("...and the purse on it", /mc-heropurse/.test(host.innerHTML));
  MC.buy("scarlet", 95);
  MC.equip("cape", "scarlet");
  ok("putting a cape on redraws it where it already was",
     /data-cape="scarlet"/.test(host.innerHTML));
  ok("...and the root element says so too", root.attrs["data-mc-cape"] === "scarlet");
  MC.equip("cape", null);
  ok("taking it off redraws it bare", /data-cape="none"/.test(host.innerHTML));
}

group("the three pages that show him");
{
  for (const [name, rel] of [["the hub", "index.html"],
                             ["the trophy room", "trophy/index.html"],
                             ["the shop", "store/index.html"]]) {
    const h = fs.readFileSync(path.join(ROOT, rel), "utf8");
    ok(name + " has somewhere to put the character and asks for one",
       /id="hero"/.test(h) && /MC\.hero\(document/.test(h));
    ok(name + " carries the styles that draw it", /\.mc-hero\{/.test(h));
  }
}

group("the page itself");
ok("the engine is inlined, not fetched", /<script>\/\* ===== Minecraft theme layer/.test(html));
ok("it carries the wardrobe styles", /MC-SKIN-CSS/.test(html));
ok("it links back to the hub and the trophy room",
   /href="\.\.\/index\.html"/.test(html) && /href="\.\.\/trophy\/index\.html"/.test(html));
ok("every link names a file, not a directory",
   ![...html.matchAll(/href="([^"#]+)"/g)].some(m => m[1].endsWith("/")));
ok("bought things go on straight away", /MC\.equip\(a\.slot, it\.id\);/.test(html));
ok("it says out loud that spending does not reduce what you earned",
   /the year's total stays where it is/i.test(html));

/* ---------- report ---------- */
console.log("");
if (fails.length) {
  console.log(fails.length + " FAILED:");
  fails.forEach(f => console.log("  - " + f));
  process.exit(1);
}
console.log(pass + " assertions passed");

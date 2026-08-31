/* ===== Minecraft theme layer — shared source =====
   Built once, injected into every app. Do not edit inside an app's
   index.html; edit theme/mc.js and rebuild, or the four copies drift.

   Contract:
     MC.config({app, shake, lift, dragon})  once, before anything else
     MC.begin(id)                           entering a level — refills hearts
     MC.right()                             a correct answer
     MC.wrong(missKey)                      a wrong answer — costs half a heart
     MC.note(missKey)                       record a miss without spending one
     MC.credit(missKey)                     count a fix without a burst
     MC.clear(id, pct, {boss})              level finished — may award a tool
     MC.chest(el, pct, {id})                paint the results reveal into el
     MC.bests()                             {id: bestPct} for this app
     MC.mute(on)                            sound off/on, remembered across apps
     MC.runs(id)                            every attempt at one activity
     MC.picker(el, items, cur, onPick)       a strip of level chips
     MC.state()                             read-only snapshot (used by the hub)

   No death, no game over. Hearts only shrink the loot. A kid who is stuck
   must never hit a wall — see HANDOFF.
*/
(function () {
  "use strict";

  var PREFIX = window.__MC_PREFIX__ || "../../assets/";
  var INLINE = window.__MC_INLINE__ || null;
  var HAS_BOSS = window.__MC_HAS_BOSS__ === true;
  var url = function (n) { return INLINE ? (INLINE[n] || "") : PREFIX + n + ".png"; };

  /* ---------- persistence (shared origin, so shared across all four apps) ---------- */
  var KEY = "mc.study.v1";
  var S;
  try { S = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { S = {}; }
  if (!S.cleared || typeof S.cleared !== "object") S.cleared = {};
  if (!S.misses || typeof S.misses !== "object") S.misses = {};
  if (typeof S.tool9 !== "boolean") S.tool9 = false;
  if (!S.ore || typeof S.ore !== "object") S.ore = {};
  if (!S.gem || typeof S.gem !== "object") S.gem = {};   // "app:id" -> diamond taken
  if (typeof S.dragon !== "number") S.dragon = 0;
  /* Every attempt, not just the best one: "app:id" -> [{p:pct, t:when, x:partial}].
     `cleared` keeps the high score because that is what the game rewards, but a
     parent wants the shape of the practice — three tries drifting down is worth
     knowing about even when the best of them was 90. Capped so a year of daily
     practice cannot fill localStorage. */
  if (!S.runs || typeof S.runs !== "object") S.runs = {};
  var RUNS_KEPT = 25;
  if (typeof S.mute !== "boolean") S.mute = false;

  /* ---------- sound ----------
     Every answer is heard: a coin when he is right, a soft glass note when he
     is not, and an unlock when a tool is earned. The wrong note is deliberately
     the gentlest of the three — it marks the moment without scolding, which is
     the same reason hearts shrink the loot instead of ending the run.

     All three arrive base64-inlined from the injector, like the sprites under
     --inline, so an app is still one file you can open from anywhere. They are
     small enough (about 18 KB of base64 between them) to inline on every build
     rather than only when asked. */
  var SFX = window.__MC_SFX__ || null;
  var VOL = 0.32;                       // quiet by default; this is a study aid
  /* The wrong note fires more often than either of the others, so it sits
     lower — audible, but never the loudest thing in the room. */
  var VOLS = { correct: 0.32, tool: 0.38, wrong: 0.20 };
  var clips = null, primed = false;

  function vol(k) { return VOLS[k] === undefined ? VOL : VOLS[k]; }

  function build_clips() {
    if (clips || !SFX) return;
    clips = {};
    for (var k in SFX) {
      try {
        var a = new Audio(SFX[k]);
        a.preload = "auto";
        a.volume = vol(k);
        clips[k] = a;
      } catch (e) { /* no Audio in this environment — stay silent */ }
    }
  }

  /* Browsers refuse to play audio until the user has interacted with the page,
     and the refusal is a rejected promise, not an error we would otherwise see.
     So on the first touch or key we start each clip muted and immediately stop
     it, which satisfies the policy and leaves them ready to fire instantly. */
  function unlock() {
    if (primed) return;
    primed = true;
    build_clips();
    for (var k in clips) prime_one(clips[k], vol(k));
    document.removeEventListener("pointerdown", unlock, true);
    document.removeEventListener("keydown", unlock, true);
  }
  function prime_one(a, v) {
    try {
      a.volume = 0;
      var p = a.play();
      var settle = function () { try { a.pause(); a.currentTime = 0; } catch (e) {} a.volume = v; };
      if (p && p.then) p.then(settle, settle); else settle();
    } catch (e) { a.volume = v; }
  }
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
  }

  function play(name) {
    if (S.mute || !SFX) return;
    build_clips();
    var a = clips && clips[name];
    if (!a) return;
    try {
      a.currentTime = 0;
      a.volume = vol(name);
      var p = a.play();
      if (p && p.catch) p.catch(function () { /* still locked; next one will land */ });
    } catch (e) { /* never let a missing speaker break a question */ }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  var TOOLS = ["wooden pickaxe", "stone pickaxe", "iron pickaxe", "diamond pickaxe",
               "sword", "torch", "shield", "bow", "elytra"];

  /* Tools 1-8 come from how many activities have been cleared anywhere on the
     site at 75%+. Tool 9, the elytra, only ever comes from spelling Challenge 2 —
     the one level where he writes his own sentences. */
  /* ---------- the mine ----------
     The tool bar was the whole ladder, and with twenty-odd activities on the
     site he fills it long before he runs out of work. So the tools are only
     the first age. Once all nine are held the mine opens, and from then on
     what a run is worth depends on how well it went rather than on whether it
     was new. Coal through gold are repeatable, so there is always something to
     dig; diamond is once per activity, so the only way to a pile of them is
     breadth AND mastery; emerald comes from the dragon alone. */
  var ORE = [
    { k: "coal",     name: "coal",     hex: "#2C2C30" },
    { k: "copper",   name: "copper",   hex: "#C1663F" },
    { k: "iron",     name: "iron",     hex: "#C6C2BC" },
    { k: "gold",     name: "gold",     hex: "#E4C04A" },
    { k: "redstone", name: "redstone", hex: "#B4262A" },
    { k: "lapis",    name: "lapis",    hex: "#2A5CB4" },
    { k: "diamond",  name: "diamond",  hex: "#40D5D1" },
    { k: "emerald",  name: "emerald",  hex: "#2FA84F" }
  ];
  var ORE_BY = {};
  for (var _o = 0; _o < ORE.length; _o++) ORE_BY[ORE[_o].k] = ORE[_o];

  /* A beacon is built from the four block types Minecraft actually accepts.
     Nine of a mineral makes a block. */
  var BEACON = ["iron", "gold", "diamond", "emerald"];

  function oreCount(k) { return S.ore[k] || 0; }
  function blocks(k) { return Math.floor(oreCount(k) / 9); }
  function beaconLit() {
    for (var i = 0; i < BEACON.length; i++) if (blocks(BEACON[i]) < 1) return false;
    return true;
  }

  function clearedCount() {
    var n = 0, k;
    for (k in S.cleared) if (S.cleared[k] >= 75) n++;
    return n;
  }
  function unlocked() {
    var n = Math.min(8, clearedCount());
    return { count: n, nine: !!S.tool9, all9: n >= 8 && !!S.tool9 };
  }
  function mineOpen() { return unlocked().all9; }
  function has(slot) { var u = unlocked(); return slot === 9 ? u.nine : slot <= u.count; }

  /* ---------- state ---------- */
  var cfg = { app: "app", shake: null, lift: null, burst: 320, hud: true,
              /* Which activities can summon the dragon. null = any level in this
                 app. An array restricts it to those ids — spelling passes ["l7"]
                 so only Challenge 2, the hardest level of whatever week's list
                 is loaded, can wake it. */
              dragon: null };
  var halves = 20;          // 10 hearts, tracked in halves
  var missedHere = {};      // keys missed during this level
  var fixedHere = 0;        // ...and later got right — the comeback count
  var partialRun = false;   // a correction round over just the missed items
  var hud, heartsEl, barEl, muteEl, lastNew = 0;
  var goodN = 0, badN = 0;  // cycle the sprites so it isn't the same one every time

  function drawMute() {
    if (!muteEl) return;
    muteEl.textContent = S.mute ? "♪̸" : "♪";
    muteEl.setAttribute("aria-label", S.mute ? "Sound off — tap for sound" : "Sound on — tap to mute");
    muteEl.setAttribute("aria-pressed", S.mute ? "true" : "false");
    muteEl.className = "mc-mute" + (S.mute ? " off" : "");
  }

  /* ---------- HUD ---------- */
  function build() {
    if (hud || cfg.hud === false) return;
    hud = document.createElement("div");
    hud.className = "mc-hud";
    hud.id = "mc-hud";
    hud.innerHTML = '<div class="mc-hearts" id="mc-hearts"></div>' +
                    '<div class="mc-bar" id="mc-bar"></div>' +
                    (SFX ? '<button class="mc-mute" id="mc-mute" type="button"></button>' : "");
    document.body.appendChild(hud);
    muteEl = hud.querySelector("#mc-mute");
    if (muteEl) {
      muteEl.addEventListener("click", function () { MC.mute(!S.mute); });
      drawMute();
    }
    heartsEl = hud.querySelector("#mc-hearts");
    barEl = hud.querySelector("#mc-bar");
    drawBar();
    drawHearts();
    fit();
    window.addEventListener("resize", fit);
    // the app's own bar can grow when feedback appears — ride above it
    if (cfg.lift && window.ResizeObserver) {
      var t = document.querySelector(cfg.lift);
      if (t) new ResizeObserver(function () { lift(); }).observe(t);
    }
    // the HUD is appended before the rest of the page parses, so its height
    // is not final yet; re-measure once the document is up
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", fit);
    else setTimeout(fit, 0);
    window.addEventListener("orientationchange", function () { setTimeout(fit, 120); });
  }

  /* The hotbar must never wrap and must never overflow. Size the slot from the
     viewport and let the hearts follow it. Checked 300-1024px. */
  function fit() {
    if (!hud) return;
    var vw = Math.max(280, document.documentElement.clientWidth || window.innerWidth);
    var vh = Math.max(320, document.documentElement.clientHeight || window.innerHeight);
    var bsz = Math.max(150, Math.min(cfg.burst, Math.round(vw * 0.55), Math.round(vh * 0.42)));
    var avail = Math.min(430, vw - 16);
    var ss = Math.max(24, Math.min(46, Math.floor(avail / 9)));
    var barw = ss * 9;
    hud.style.setProperty("--mc-ss", ss + "px");
    hud.style.setProperty("--mc-barw", barw + "px");
    hud.style.setProperty("--mc-hh", Math.max(13, Math.round(ss * 0.5)) + "px");
    hud.style.setProperty("--mc-burst", bsz + "px");
    document.documentElement.style.setProperty("--mc-burst", bsz + "px");
    lift();
    // keep app content clear of the HUD
    var h = hud.offsetHeight || 70;
    document.body.style.paddingBottom = (h + (cfg._liftpx || 0) + 10) + "px";
  }

  /* Only the vocabulary app has a persistent fixed bar of its own, and it grows
     when feedback appears. Ride above whatever height it currently is. */
  function lift() {
    if (!cfg.lift || !hud) return;
    var t = document.querySelector(cfg.lift);
    var px = (t && t.offsetParent !== null) ? t.offsetHeight : 0;
    cfg._liftpx = px;
    hud.style.setProperty("--mc-lift", px + "px");
  }

  function drawHearts() {
    if (!heartsEl) return;
    var out = "", i, v;
    for (i = 0; i < 10; i++) {
      v = Math.max(0, Math.min(2, halves - i * 2));
      out += '<img class="mc-heart" data-v="' + v + '" alt="" src="' +
             url(v === 2 ? "heart-full" : v === 1 ? "heart-half" : "heart-empty") + '">';
    }
    heartsEl.innerHTML = out;
  }

  /* Renders a mineral. The coloured block is CSS, so this works before any
     ore art exists; if the sprite is there it loads on top, and if it is not
     the broken image removes itself rather than showing a torn-page icon. */
  function oreChip(k, label, on) {
    var o = ORE_BY[k];
    return '<span class="mc-ore' + (on === false ? " mc-dim" : "") + '" title="' + o.name +
           '" style="--ore:' + o.hex + '">' +
           '<img alt="" src="' + url("ore-" + k) +
           '" onerror="this.parentNode.classList.add(\'mc-noart\');this.remove()">' +
           (label ? '<b>' + label + "</b>" : "") + "</span>";
  }

  /* A beacon slot. Earned slots show their block; an unearned one shows the
     plain stone stand-in, so the row reads as a pyramid under construction
     rather than as four mystery squares. Either falls back to a CSS block. */
  function blockChip(b) {
    var got = b.blocks >= 1;
    return '<span class="mc-blk' + (got ? "" : " mc-dim") + '" title="' + b.name +
           '" style="--ore:' + b.hex + '">' +
           '<img alt="" src="' + url(got ? "block-" + b.k : "block-locked") +
           '" onerror="this.parentNode.classList.add(\'mc-noart\');this.remove()">' +
           "<b>" + b.blocks + "/1</b></span>";
  }

  function drawBar() {
    if (!barEl) return;
    var out = "", i, on;
    for (i = 1; i <= 9; i++) {
      on = has(i);
      out += '<div class="mc-slot' + (i === lastNew ? " mc-new" : "") + '" data-n="' + i +
             '" style="background-image:url(' + url("slot") + ')" title="' +
             (on ? TOOLS[i - 1] : "locked") + '">' +
             '<img class="mc-frame" alt="" src="' + url("slot-frame") + '">' +
             (on ? '<img class="mc-tool" alt="' + TOOLS[i - 1] + '" src="' + url("tool-" + i) + '">' : "") +
             "</div>";
    }
    barEl.innerHTML = out;
  }

  /* ---------- sprite bursts ---------- */
  function burst(name, cls, narrow) {
    var old = document.querySelector(".mc-burst");
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var d = document.createElement("div");
    d.className = "mc-burst " + cls;
    if (narrow) d.setAttribute("data-w", "narrow");
    d.innerHTML = '<img alt="" src="' + url(name) + '">';
    document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 1600);
  }

  function shake() {
    if (!cfg.shake) return;                 // science already shakes its own card
    var t = document.querySelector(cfg.shake);
    if (!t) return;
    t.classList.remove("mc-shake");
    void t.offsetWidth;
    t.classList.add("mc-shake");
    setTimeout(function () { t.classList.remove("mc-shake"); }, 400);
  }

  /* ---------- public ---------- */
  var MC = {
    config: function (o) {
      for (var k in o) if (o.hasOwnProperty(k)) cfg[k] = o[k];
      if (document.body) build(); else
        document.addEventListener("DOMContentLoaded", build);
      return MC;
    },

    /* Entering a level. Pass {partial:true} for a correction round that
       replays only the missed items — those must not overwrite a best score
       or hand out the big rewards, since three words at 100% is not the same
       achievement as twelve. */
    begin: function (opts) {
      halves = 20; lastNew = 0;
      missedHere = {}; fixedHere = 0;
      partialRun = !!(opts && opts.partial);
      build(); drawHearts(); drawBar(); fit();
    },

    /* Credit a fix without any fanfare. The vocabulary sheet settles 26 words
       on a single check — that is one burst, not twenty-six. */
    credit: function (missKey) {
      if (missKey && missedHere[missKey]) { fixedHere++; delete missedHere[missKey]; }
    },

    /* Pass the same key you passed to wrong()/note() and the correction is
       counted — that is what earns the comeback badge. */
    right: function (missKey) {
      build();
      MC.credit(missKey);
      goodN = goodN % 4 + 1;
      burst("win-" + goodN, "mc-good");
      play("correct");
    },

    /* Record a miss without any cost. Used where one action covers several
       items, or where the answer is revealed after the miss already landed. */
    note: function (missKey) {
      if (!missKey) return;
      missedHere[missKey] = true;
      var a = cfg.app;
      if (!S.misses[a]) S.misses[a] = {};
      S.misses[a][missKey] = (S.misses[a][missKey] || 0) + 1;
      save();
    },

    wrong: function (missKey) {
      build();
      badN = badN % 4 + 1;
      burst("bad-" + badN, "mc-bad", badN === 2 || badN === 4);
      shake();
      play("wrong");
      if (halves > 0) {
        halves--;                            // floors at zero — never a game over
        drawHearts();
        var i = Math.floor(halves / 2);
        var h = heartsEl && heartsEl.children[Math.min(9, i)];
        if (h) h.classList.add("mc-hit");
      }
      MC.note(missKey);
    },

    /* Records the score, may award a tool. Returns what happened so the
       results screen can talk about it. */
    /* Records the score, may award a tool, and works out what he earned.
       Every band is a real Minecraft tier, because every one of them is a
       tool you are glad to have — there is no booby prize here. */
    clear: function (id, pct, opts) {
      opts = opts || {};
      pct = Math.round(pct);
      var key = cfg.app + ":" + id;
      var prev = S.cleared[key];
      var before = unlocked();
      var got = null;

      /* Log the try itself before anything else, so it is recorded whether or
         not it counted towards the game. A partial run is marked rather than
         dropped: it is still practice a parent may want to see. */
      if (!S.runs[key]) S.runs[key] = [];
      var run = { p: pct, t: Date.now() };
      if (partialRun) run.x = 1;
      S.runs[key].push(run);
      if (S.runs[key].length > RUNS_KEPT) S.runs[key] = S.runs[key].slice(-RUNS_KEPT);
      save();

      if (!partialRun) {
        S.cleared[key] = Math.max(prev || 0, pct);
        if (key === "spelling:l7" && pct >= 75) S.tool9 = true;
        save();
        var after = unlocked();
        if (after.nine && !before.nine) got = 9;
        else if (after.count > before.count) got = after.count;
        lastNew = got || 0;
        if (got) play("tool");             // a new tool is the one thing worth a fanfare
        drawBar();
      }

      var clean = pct >= 100 && halves === 20;
      var isBossLevel = cfg.dragon === null || cfg.dragon.indexOf(id) !== -1;
      /* The End portal stays shut until the whole tool set is his. A perfect
         run before that is still a perfect run — it just does not summon a
         dragon, and the chest says what is still missing rather than going
         quiet about it. */
      var ready = unlocked().all9;
      var dragon = clean && !partialRun && isBossLevel && ready;
      var portalShut = clean && !partialRun && isBossLevel && !ready;
      if (dragon) { S.dragon++; save(); }

      /* What the run was worth at the rock face. Coal through gold repeat, so
         there is always something to dig; diamond is once per activity, so a
         pile of them needs breadth AND mastery; emerald comes only from the
         dragon. Nothing is mined at all until the tool set is complete. */
      var mined = [];
      function dig(k, n) {
        S.ore[k] = (S.ore[k] || 0) + n;
        mined.push({ k: k, n: n, name: ORE_BY[k].name, hex: ORE_BY[k].hex });
      }
      if (mineOpen()) {
        if (partialRun) {
          if (pct >= 100) dig("lapis", 1);            // every miss put right
        } else {
          if (pct >= 75) dig("coal", 1);
          if (pct >= 85) dig("copper", 1);
          if (pct >= 95) dig("iron", 1);
          if (pct >= 100) dig("gold", 1);
          if (pct >= 75 && halves === 20) dig("redstone", 1);
          if (clean && !S.gem[key]) { S.gem[key] = true; dig("diamond", 1); }
        }
        if (dragon) dig("emerald", 1);
        if (mined.length) save();
      }

      var tier;
      if (partialRun)   tier = ["CORRECTIONS", "You went back and fixed them. That is the part that sticks."];
      else if (dragon)  tier = ["DRAGON SLAIN", "Perfect. Not one miss, not one heart."];
      else if (clean)   tier = ["NETHERITE", "Every single one right."];
      else if (pct >= 90) tier = ["DIAMOND", "So close to flawless."];
      else if (pct >= 75) tier = ["IRON", "Solid work \u2014 this one is holding."];
      else if (pct >= 50) tier = ["STONE", "You got through it. Now you know where to dig."];
      else                tier = ["WOOD", "You finished it, and that is where everyone starts."];

      /* Badges stack. They reward things accuracy alone does not see. */
      var badges = [];
      if (fixedHere)
        badges.push(fixedHere === 1 ? "TURNED ONE AROUND" : "TURNED " + fixedHere + " AROUND");
      if (!partialRun && prev != null && pct > prev)
        badges.push("NEW BEST \u2014 BEAT " + prev + "%");
      if (!partialRun && (prev == null || prev < 75) && pct >= 75)
        badges.push("FIRST CLEAR");
      if (halves > 0 && halves <= 4 && pct >= 50)
        badges.push("STUCK IT OUT");

      var bea = null;
      if (mineOpen()) {
        bea = { lit: beaconLit(), need: [] };
        for (var bi = 0; bi < BEACON.length; bi++)
          bea.need.push({ k: BEACON[bi], have: oreCount(BEACON[bi]),
                          blocks: blocks(BEACON[bi]), name: ORE_BY[BEACON[bi]].name,
                          hex: ORE_BY[BEACON[bi]].hex });
      }

      return {
        mined: mined, beacon: bea, portalShut: portalShut,
        toolsLeft: (8 - unlocked().count) + (S.tool9 ? 0 : 1),
        mineOpen: mineOpen(), dragons: S.dragon,
        tool: got,
        toolName: got ? TOOLS[got - 1] : null,
        loot: halves >= 20 ? 4 : halves >= 15 ? 3 : halves >= 8 ? 2 : 1,
        hearts: halves / 2,
        fixed: fixedHere,
        partial: partialRun,
        tier: tier[0], blurb: tier[1], badges: badges,
        boss: dragon
      };
    },

    /* Paints chest-closed, then opens it on tap or after a beat. */
    chest: function (host, pct, opts) {
      if (!host) return null;
      var r = MC.clear(opts.id, pct, opts);
      var box = document.createElement("div");
      box.className = "mc-chest";
      box.innerHTML = '<img class="mc-lid mc-shut" alt="Closed chest" src="' + url("chest-closed") + '">' +
                      '<div class="mc-loot"></div>' +
                      '<div class="mc-tier"></div>' +
                      '<div class="mc-cap">Tap the chest</div>';
      host.insertBefore(box, host.firstChild);
      var lid = box.querySelector(".mc-lid"),
          loot = box.querySelector(".mc-loot"),
          tierEl = box.querySelector(".mc-tier"),
          cap = box.querySelector(".mc-cap"),
          opened = false;

      function open() {
        if (opened) return;
        opened = true;
        lid.classList.remove("mc-shut");
        lid.src = url("chest-open");
        lid.alt = "Open chest";
        lid.style.cursor = "default";
        var html = "", i;
        for (i = 1; i <= r.loot; i++) html += '<img alt="" src="' + url("win-" + i) + '">';
        loot.innerHTML = html;
        tierEl.textContent = r.tier;
        tierEl.setAttribute("data-t", r.tier.split(" ")[0].toLowerCase());
        cap.textContent = r.blurb;
        if (r.badges.length) {
          box.insertAdjacentHTML("beforeend", '<div class="mc-badges">' +
            r.badges.map(function (b) { return '<span class="mc-badge">' + b + "</span>"; })
              .join("") + "</div>");
        }
        if (r.tool) {
          box.insertAdjacentHTML("beforeend",
            '<div class="mc-earned"><img alt="" src="' + url("tool-" + r.tool) + '">' +
            "<span>NEW &middot; " + r.toolName.toUpperCase() + "</span></div>");
        }
        if (r.mined && r.mined.length) {
          box.insertAdjacentHTML("beforeend",
            '<div class="mc-haul"><span class="mc-haullab">MINED</span>' +
            r.mined.map(function (m) { return oreChip(m.k, "+" + m.n); }).join("") +
            "</div>");
        }
        if (r.portalShut) {
          box.insertAdjacentHTML("beforeend",
            '<div class="mc-shutportal"><img class="mc-portal" alt="" src="' + url("portal") +
            '" onerror="this.remove()">THE PORTAL WILL NOT OPEN<small>A perfect run \u2014 ' +
            'but the End stays shut until all nine tools are yours. ' +
            (r.toolsLeft === 1 ? "One to go." : r.toolsLeft + " to go.") + "</small></div>");
        }
        if (r.beacon) {
          box.insertAdjacentHTML("beforeend",
            '<div class="mc-beacon' + (r.beacon.lit ? " mc-lit" : "") + '">' +
            '<span class="mc-haullab">' + (r.beacon.lit ? "BEACON LIT" : "BEACON") + "</span>" +
            r.beacon.need.map(function (b) { return blockChip(b); }).join("") +
            "<small>" + (r.beacon.lit
              ? "Iron, gold, diamond and emerald, a block of each. That is the whole pyramid."
              : "Nine of a mineral makes a block. Four blocks light the beacon.") +
            "</small></div>");
        }
        if (!r.boss && r.dragons > 0 && r.mineOpen) {
          box.insertAdjacentHTML("beforeend",
            '<div class="mc-egg"><img alt="" src="' + url("dragon-egg") +
            '" onerror="this.remove()"><span>' +
            (r.dragons === 1 ? "One dragon down" : r.dragons + " dragons down") +
            "</span></div>");
        }
        if (r.boss) {
          box.insertAdjacentHTML("beforeend", HAS_BOSS
            ? '<img class="mc-boss" alt="Ender dragon defeated" src="' + url("boss-defeated") + '">'
            : '<div class="mc-bossfall">DRAGON SLAIN<small>Perfect run \u2014 no misses, no hearts lost</small></div>');
        }
      }
      lid.addEventListener("click", open);
      setTimeout(open, 2600);                // opens itself if he doesn't tap
      return r;
    },

    /* Best score per activity for THIS app, keyed by bare id — lets an app's
       level picker show scores that survive a reload. The apps each kept their
       own in-memory `best` object, which forgot everything on refresh. */
    bests: function () {
      var out = {}, pre = cfg.app + ":", k;
      for (k in S.cleared) if (k.indexOf(pre) === 0) out[k.slice(pre.length)] = S.cleared[k];
      return out;
    },

    /* A strip of level chips, each showing whether it has been cleared.
       Reusable: any app with several parallel levels calls this rather than
       rolling its own, so history, and anything added later, look the same.

         MC.picker(hostEl, [{id:"set0", label:"1"}, ...], currentId, onPick)

       Chips colour themselves from MC.bests(): green cleared, amber attempted,
       plain untouched. Re-call it to repaint after a score changes. */
    picker: function (host, items, current, onPick) {
      if (!host) return;
      var best = MC.bests();
      host.className = "mc-picker";
      host.innerHTML = items.map(function (it) {
        var b = best[it.id];
        var cls = b == null ? "" : (b >= 75 ? " mc-cleared" : " mc-tried");
        if (it.id === current) cls += " mc-now";
        return '<button type="button" class="mc-chip' + cls + '" data-id="' + it.id +
               '" aria-pressed="' + (it.id === current) + '"' +
               ' title="' + (b == null ? "not tried yet" : "best " + b + "%") + '">' +
               '<span class="mc-chip-l">' + it.label + "</span>" +
               '<span class="mc-chip-s">' + (b == null ? "&mdash;" : b + "%") + "</span>" +
               "</button>";
      }).join("");
      var bs = host.querySelectorAll(".mc-chip");
      for (var i = 0; i < bs.length; i++) {
        bs[i].addEventListener("click", function () {
          onPick(this.getAttribute("data-id"));
        });
      }
    },

    state: function () {
      var u = unlocked();
      return {
        tools: u, toolNames: TOOLS,
        ore: JSON.parse(JSON.stringify(S.ore)), oreKinds: ORE,
        mineOpen: mineOpen(), dragons: S.dragon,
        beacon: { needs: BEACON, lit: beaconLit(),
                  blocks: BEACON.map(function (k) { return blocks(k); }) },
        cleared: JSON.parse(JSON.stringify(S.cleared)),
        misses: JSON.parse(JSON.stringify(S.misses)),
        runs: JSON.parse(JSON.stringify(S.runs)),
        url: url
      };
    },

    /* Every attempt at one activity, oldest first. The hub's report reads this;
       apps do not need it. */
    runs: function (id) {
      var key = cfg.app + ":" + id;
      return (S.runs[key] || []).slice();
    },

    /* Sound off/on. Kept in the same saved state as everything else, so the
       choice holds across every app and survives a reload. Call with no
       argument to read it. */
    mute: function (on) {
      if (on === undefined) return !!S.mute;
      S.mute = !!on;
      save();
      drawMute();
      return S.mute;
    },

    reset: function () {
      S = { cleared: {}, misses: {}, tool9: false, ore: {}, gem: {}, dragon: 0,
            runs: {}, mute: S.mute };   // muting is a preference, not progress
      save(); drawBar();
    },
    _relift: lift
  };

  window.MC = MC;
})();

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
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  var TOOLS = ["wooden pickaxe", "stone pickaxe", "iron pickaxe", "diamond pickaxe",
               "sword", "torch", "shield", "bow", "elytra"];

  /* Tools 1-8 come from how many activities have been cleared anywhere on the
     site at 75%+. Tool 9, the elytra, only ever comes from spelling Challenge 2 —
     the one level where he writes his own sentences. */
  function clearedCount() {
    var n = 0, k;
    for (k in S.cleared) if (S.cleared[k] >= 75) n++;
    return n;
  }
  function unlocked() {
    var n = Math.min(8, clearedCount());
    return { count: n, nine: !!S.tool9 };
  }
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
  var hud, heartsEl, barEl, lastNew = 0;
  var goodN = 0, badN = 0;  // cycle the sprites so it isn't the same one every time

  /* ---------- HUD ---------- */
  function build() {
    if (hud || cfg.hud === false) return;
    hud = document.createElement("div");
    hud.className = "mc-hud";
    hud.id = "mc-hud";
    hud.innerHTML = '<div class="mc-hearts" id="mc-hearts"></div>' +
                    '<div class="mc-bar" id="mc-bar"></div>';
    document.body.appendChild(hud);
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

      if (!partialRun) {
        S.cleared[key] = Math.max(prev || 0, pct);
        if (key === "spelling:l7" && pct >= 75) S.tool9 = true;
        save();
        var after = unlocked();
        if (after.nine && !before.nine) got = 9;
        else if (after.count > before.count) got = after.count;
        lastNew = got || 0;
        drawBar();
      }

      var clean = pct >= 100 && halves === 20;
      var dragon = clean && !partialRun &&
                   (cfg.dragon === null || cfg.dragon.indexOf(id) !== -1);

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

      return {
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

    state: function () {
      var u = unlocked();
      return {
        tools: u, toolNames: TOOLS,
        cleared: JSON.parse(JSON.stringify(S.cleared)),
        misses: JSON.parse(JSON.stringify(S.misses)),
        url: url
      };
    },

    reset: function () { S = { cleared: {}, misses: {}, tool9: false }; save(); drawBar(); },
    _relift: lift
  };

  window.MC = MC;
})();

"""Answer review and navigation, patched into the apps at build time.

Four changes, asked for after watching a ten-year-old get stuck:

  1. On a question with several parts — put the steps in order, build the
     answer, sort into bins, match the pairs — the marks now *stay* from the
     second miss. They were already being drawn and then wiped by a timeout
     about a second later, which is long enough to see that something is wrong
     and far too short to work out what.

  2. After a third miss, a button that shows the answer outright. Being stuck
     with no way forward is the one thing the whole design is supposed to avoid.

  3. Back and Skip on every question. Until now the mission and history apps
     would not let you past a question until you got it right, which is a wall —
     and HANDOFF says a child who is stuck must never hit one.

  4. Because a question can now be skipped, finishing checks for anything left
     unanswered and offers to go back to the first one.

Each patch is a no-op on a shell that does not contain its anchor, so the same
pass runs over every app.
"""
import re

# ---------------------------------------------------------------- history shell

H_ORDER_OLD = """    if(!wrong){ $("go").remove(); win(it); }
    else { setTimeout(()=>document.querySelectorAll(".row").forEach(r=>r.classList.remove("right","wrong")),900);
           miss(it, wrong===1?"One step is out of place.":wrong+" steps are out of place."); }"""

H_ORDER_NEW = """    if(!wrong){ $("go").remove(); win(it); }
    else {
      /* First miss flashes the marks and clears them. From the second they stay
         up, so he can see which rows are already right instead of permuting
         blindly. */
      if(tries >= 1) markOrder();
      else setTimeout(()=>document.querySelectorAll(".row").forEach(r=>r.classList.remove("right","wrong")),900);
      miss(it, wrong===1?"One step is out of place.":wrong+" steps are out of place."); }"""

H_BUILD_OLD = """    } else {
      setTimeout(()=>document.querySelectorAll(".tile").forEach(t=>{
        t.classList.remove("right","wrong"); }),1000);"""

H_BUILD_NEW = """    } else {
      if(tries >= 1) markBuild(tiles);
      else setTimeout(()=>document.querySelectorAll(".tile").forEach(t=>{
        t.classList.remove("right","wrong"); }),1000);"""

H_MARKERS = """
/* ---------- review marks ----------
   Green on what is already right, red on what is not, left on screen from the
   second miss so a wrong answer says what to change. */
function markOrder(){
  document.querySelectorAll(".row").forEach((r,n)=>{
    r.classList.remove("right","wrong");
    r.classList.add(order[n].i===n ? "right" : "wrong");
  });
}
function markBuild(tiles){
  document.querySelectorAll(".tile").forEach(el=>{
    const i = +el.dataset.i;
    el.classList.remove("right","wrong");
    if(chosen.has(i)) el.classList.add(tiles[i].a ? "right" : "wrong");
  });
}
/* Shows the answer outright. Offered only after a third miss, and it scores the
   question at the floor rather than zero — he still finished it. */
function revealHistory(it){
  const cur = S.items[idx];
  if(cur.type === "order"){
    order.sort((a,b)=>a.i-b.i); drawRows(); markOrder();
  } else if(cur.type === "build"){
    const B = DATA.build;
    document.querySelectorAll(".tile").forEach(el=>{
      const t = B.tiles.find(x=>x.t === el.textContent);
      el.classList.remove("right","wrong","sel");
      if(t && t.a) el.classList.add("right"); else el.style.opacity=".35";
    });
  } else {
    document.querySelectorAll(".opt").forEach(el=>{
      if(el.textContent.trim().slice(1).trim() === (cur.opts||[])[cur.a]) el.classList.add("right");
    });
  }
  shown = true;
}
"""

# Keeping the marks up made the tiles look frozen: a tile you deselected kept
# its red outline, so there was no sign anything had changed. Clear a tile's own
# mark the moment it is touched.
# Chapter 2 hard-codes its tile limit as `chosen.size<3` where the later
# chapters read it from the data as `<N`, so this matches on the shape rather
# than on one spelling of it.
H_TILE_RE = re.compile(
    r'(\s*)if\(chosen\.has\(i\)\)\{ chosen\.delete\(i\); b\.classList\.remove\("sel"\); \}\n'
    r'(\s*)else if\(chosen\.size<(\w+)\)\{ chosen\.add\(i\); b\.classList\.add\("sel"\); \}')


def _tile_sub(m):
    a, b, lim = m.group(1), m.group(2), m.group(3)
    return (a + 'if(chosen.has(i)){ chosen.delete(i); b.classList.remove("sel","right","wrong"); }\n'
            + b + 'else if(chosen.size<' + lim + '){ chosen.add(i); b.classList.add("sel");\n'
            + b + '                        b.classList.remove("right","wrong"); }')

# ...and an explicit way back to a clean slate, because working out that you can
# tap a red tile to release it is not something to make a child discover.
H_RETRY = """
/* Clears the marks and hands the question back. Offered as soon as a check
   fails on anything with several parts — the marks show what was wrong, this
   is how you act on it. */
function retryHere(){
  document.querySelectorAll(".tile").forEach(el=>{
    el.classList.remove("right","wrong","sel"); el.style.opacity="";
  });
  document.querySelectorAll(".row").forEach(el=>el.classList.remove("right","wrong"));
  chosen.clear();
  const go = $("go");
  if(go){
    go.disabled = S.items[idx].type === "build";
    if(S.items[idx].type === "build"){
      const N = DATA.build.tiles.filter(t=>t.a).length;
      go.textContent = "Pick " + N + " more";
    }
  }
  const b = $("retry"); if(b) b.remove();
  $("fb").innerHTML = "";
}
function offerRetry(){
  const t = S.items[idx].type;
  if(t !== "order" && t !== "build") return;
  if($("retry") || shown) return;
  $("act").insertAdjacentHTML("afterbegin",
    `<button class="btn o" id="retry">Clear these and try again</button>`);
  $("retry").onclick = retryHere;
}
"""

# ---------------------------------------------------- the Big Question reveal
#
# This block was written for Chapter 2 and then travelled to every chapter that
# was generated from it. Chapter 4 was telling a child "the three you picked"
# for a question that wants two, and showing him the Maya calendar's accuracy
# to the fourth decimal place under an answer about Tenochtitlán.
#
# The count now comes from the data, and the figures only appear where a chapter
# actually supplies them.
H_REVEAL_OLD = """    $("fb").innerHTML = `<div class="fb yes"><strong>That is the answer.</strong>
      The three you picked are exactly the three the Big Question needs.</div>
      <div class="reveal">
        <div class="lead">The Big Question, answered</div>
        <p>${esc(it.why)}</p>
        <div class="nums">
          <div class="num"><b>365.2420</b><span>Maya, by eye</span></div>
          <div class="num"><b>365.2422</b><span>Modern, by machine</span></div>
          <div class="num"><b>17 seconds</b><span>Apart, per year</span></div>
        </div>
        <p style="margin-top:10px">Seventeen seconds a year. At that rate the Maya calendar would not
        slip a single day for about <b>five thousand years</b>.</p>
        <cite style="display:block;font:600 11px var(--mono);color:var(--stone);margin-top:8px">${esc(it.cite)}</cite>
      </div>`;"""

H_REVEAL_NEW = """    const _n = DATA.build.tiles.filter(t=>t.a).length;
    const _w = ["no","one","two","three","four","five","six","seven","eight"][_n] || String(_n);
    const _f = DATA.build.figures;
    const _lead = DATA.build.lead || "The Big Question, answered";
    const _hit = DATA.build.hit ||
      `The ${_w} you picked are exactly the ${_w} the Big Question needs.`;
    $("fb").innerHTML = `<div class="fb yes"><strong>That is the answer.</strong>
      ${esc(_hit)}</div>
      <div class="reveal">
        <div class="lead">${esc(_lead)}</div>
        <p>${esc(it.why)}</p>
        ${_f ? `<div class="nums">${_f.nums.map(n=>
            `<div class="num"><b>${esc(n[0])}</b><span>${esc(n[1])}</span></div>`).join("")}</div>
          <p style="margin-top:10px">${_f.note}</p>` : ""}
        ${it.cite ? `<cite style="display:block;font:600 11px var(--mono);color:var(--stone);margin-top:8px">${esc(it.cite)}</cite>` : ""}
      </div>`;"""

# Matching one snapshot of the reveal is exactly the trap this module has fallen
# into before, so the revert takes whatever is between the marker and the close
# of the template and puts the bare shell back.
H_REVEAL_RE = re.compile(
    r'    const _n = DATA\.build\.tiles\.filter\(t=>t\.a\)\.length;.*?\n      </div>`;',
    re.S)


# -------------------------------------------------------------- getting back
#
# The header carried one link, out to the subject list. From inside a set that
# is the only way out, which makes "let me try a different set" a round trip
# through the hub. The second link goes back to this app's own start.

H_HUB_OLD = '  <a class="hublink" href="../../index.html">&lsaquo; All subjects</a>'

H_HUB_NEW = ('  <a class="hublink" href="../../index.html">&lsaquo; All subjects</a>\n'
             '  <a class="hublink back" id="tohome" href="#" hidden></a>')

H_SHOW_OLD = ('function show(w){ ["home","play","done"].forEach(x=>'
              '$(x).classList.toggle("hide",x!==w)); window.scrollTo(0,0); }')

H_SHOW_NEW = '''function show(w){
  ["home","play","done"].forEach(x=>$(x).classList.toggle("hide",x!==w));
  /* Only offered when there is somewhere to go back to. Wired here rather than
     once at load, because the label comes from the data and the link has to be
     hidden again the moment we are home. */
  const b = $("tohome");
  if(b){
    b.textContent = "\\u2039 " + (DATA.backLabel || "Back to the sets");
    b.hidden = (w === "home");
    b.onclick = e=>{ e.preventDefault(); Object.assign(best, MC.bests()); home(); };
  }
  window.scrollTo(0,0);
}'''

HUB_CSS = ("\n.hublink.back{margin-left:14px;color:var(--stone)}"
           "\n.hublink.back[hidden]{display:none}\n")


# ---------------------------------------------------------------- navigation
#
# `log` was a push-array, so a question could only ever be answered once and
# only in order. Keyed by index instead, a revisit overwrites rather than
# appending a second score for the same question.
H_LOG_OLD = "  log.push({pts,tries});"
H_LOG_NEW = "  log[idx] = {pts,tries};"

H_RENDER_OLD = """  if(it.type==="pick")  return rPick(it, head);
  if(it.type==="order") return rOrder(it, head);
  return rBuild(head);"""

H_RENDER_NEW = """  if(it.type==="pick")  rPick(it, head);
  else if(it.type==="order") rOrder(it, head);
  else rBuild(head);
  navBar();
  restoreState();"""

H_NEXTBTN_OLD = """  $("next").onclick=()=>{ if(last) finish(); else { idx++; render(); window.scrollTo(0,0); } };"""
H_NEXTBTN_NEW = """  $("next").onclick=()=>{ if(last) finish(); else { idx++; render(); window.scrollTo(0,0); } };
  navBar();
  saveState($("fb").innerHTML, true);"""

H_STATE = """
/* ---------- remembering each question ----------
   render() rebuilds a question from scratch, which was fine when the only way
   through was forward. With a Back button it meant leaving an answered question
   and finding it blank on return, as though the work had not happened.

   What is stored is what he did, not which button it was: options are reshuffled
   on every render, so a saved index would restore the wrong answer. Selections
   are kept by their text and found again after the shuffle. */
let saved = [];
function saveState(fbHTML, won){
  const it = S.items[idx];
  const st = { tries, shown, won, fb: fbHTML, type: it.type };
  if(it.type === "pick"){
    const sel = document.querySelector(".opt.sel, .opt.right, .opt.wrong");
    st.pick = sel ? sel.textContent.trim().slice(1).trim() : null;
  } else if(it.type === "order"){
    st.order = order.map(o=>o.i);
  } else {
    st.tiles = [...chosen].map(i=>{
      const el = document.querySelector(`.tile[data-i="${i}"]`);
      return el ? el.textContent : null;
    }).filter(Boolean);
  }
  saved[idx] = st;
}
function restoreState(){
  const st = saved[idx];
  if(!st) return;                       /* never checked — leave it blank */
  tries = st.tries; shown = st.shown;

  if(st.type === "pick" && st.pick){
    document.querySelectorAll(".opt").forEach(el=>{
      if(el.textContent.trim().slice(1).trim() !== st.pick) return;
      el.classList.add(st.won ? "right" : "wrong");
    });
  } else if(st.type === "order" && st.order){
    const by = {}; order.forEach(o=>{ by[o.i] = o; });
    const back = st.order.map(i=>by[i]).filter(Boolean);
    if(back.length === order.length){ order = back; drawRows(); }
    if(st.tries >= 1 || st.won) markOrder();
  } else if(st.type === "build" && st.tiles){
    document.querySelectorAll(".tile").forEach(el=>{
      if(st.tiles.indexOf(el.textContent) === -1) return;
      chosen.add(+el.dataset.i);
      el.classList.add("sel");
    });
    const B = DATA.build, need = B.tiles.filter(t=>t.a).length;
    if(st.tries >= 1 || st.won){
      document.querySelectorAll(".tile").forEach(el=>{
        if(!chosen.has(+el.dataset.i)) return;
        const t = B.tiles.find(x=>x.t === el.textContent);
        el.classList.remove("sel");
        el.classList.add(t && t.a ? "right" : "wrong");
      });
    }
    const g = $("go");
    if(g){
      g.disabled = chosen.size !== need;
      g.textContent = chosen.size === need ? "Build the answer" : `Pick ${need - chosen.size} more`;
    }
  }

  if(st.fb) $("fb").innerHTML = st.fb;
  if(st.won){
    /* already answered — offer the way onward rather than another check */
    const last = idx === S.items.length - 1;
    $("act").innerHTML =
      `<button class="btn g" id="next">${last ? "See how I did" : "Next question"}</button>`;
    $("next").onclick = ()=>{
      if(last) finish(); else { idx++; render(); window.scrollTo(0,0); }
    };
  }
  navBar();
}
"""

H_NAV = """
/* ---------- getting about ----------
   Back and Skip on every question. Until now there was no way past a question
   except to answer it correctly, which is a wall — and the whole design says a
   child who is stuck must never hit one. Skipping is not free: an unanswered
   question scores zero, and finishing stops to say so. */
let forceFinish = false;
function navBar(){
  const card = $("card"); if(!card || !S) return;
  let nav = document.getElementById("nav");
  if(!nav){
    nav = document.createElement("div");
    nav.id = "nav"; nav.className = "nav";
    card.appendChild(nav);
  }
  const last = idx === S.items.length - 1;
  const done = !!log[idx];
  nav.innerHTML =
    `<button class="navb" id="navback"${idx === 0 ? " disabled" : ""}>&lsaquo; Back</button>` +
    `<span class="navpos">${idx + 1} of ${S.items.length}</span>` +
    `<button class="navb" id="navnext">` +
      (last ? "Finish &rsaquo;" : (done ? "Next &rsaquo;" : "Skip &rsaquo;")) + `</button>`;
  $("navback").onclick = ()=>{ if(idx > 0){ idx--; render(); window.scrollTo(0,0); } };
  $("navnext").onclick = ()=>{
    if(last) finish();
    else { idx++; render(); window.scrollTo(0,0); }
  };
}
/* Nothing unanswered slips past without being noticed. The button goes to the
   first gap rather than just naming it, because a child told "question 4" still
   has to find question 4. */
function unanswered(){
  const out = [];
  for(let i = 0; i < S.items.length; i++) if(!log[i]) out.push(i);
  return out;
}
function skippedNotice(missing){
  const n = missing.length;
  $("card").innerHTML =
    `<div class="qnum">Before you finish</div>
     <div class="q">${n === 1 ? "One question is still unanswered." :
                                n + " questions are still unanswered."}</div>
     <p class="skipnote">Unanswered questions count as zero, so it is worth going back.
        You can still finish now if you would rather.</p>
     <div class="act" id="act">
       <button class="btn p" id="goback">Go to question ${missing[0] + 1}</button>
       <button class="btn o" id="anyway">Finish anyway</button>
     </div>`;
  $("goback").onclick = ()=>{ idx = missing[0]; render(); window.scrollTo(0,0); };
  $("anyway").onclick = ()=>{ forceFinish = true; finish(); };
}
"""

H_FINISH_OLD = """function finish(){
  const pct = Math.round(log.reduce((s,l)=>s+l.pts,0)/log.length);
  const first = log.filter(l=>l.tries===0).length;
  const att = log.reduce((s,l)=>s+l.tries,0)+log.length;"""

H_FINISH_NEW = """function finish(){
  const missing = unanswered();
  if(missing.length && !forceFinish){ skippedNotice(missing); return; }
  forceFinish = false;
  /* Scored over every question, not only the answered ones — otherwise
     skipping everything but one easy question would read as 100%. */
  const done = S.items.map((_,i)=>log[i]).filter(Boolean);
  const pct = Math.round(done.reduce((s,l)=>s+l.pts,0)/S.items.length);
  const first = done.filter(l=>l.tries===0).length;
  const att = done.reduce((s,l)=>s+l.tries,0)+done.length;"""

H_START_OLD = """  S = DATA.sets[i]; idx=0; log=[];"""
H_START_NEW = """  S = DATA.sets[i]; idx=0; log=[]; forceFinish=false; saved=[];"""

# ---------------------------------------------------------------- the reading
#
# Science and reading have had a passage drawer from the start. History never
# did — its questions carried an explanation and a page number but no text, so
# "Show me the page" could only name the page. With passages in the data it can
# now show the paragraph itself.
H_READ = """
/* The reading, in a panel over the question. Offered on the first miss, because
   the point is to go and read rather than to guess again. Closing it puts the
   question back exactly as it was. */
/* Highlights the sentence the question turns on. Opening the passage without
   pointing at anything just moves the problem: a child who could not answer the
   question is not obviously better placed to find the answer in four paragraphs
   of prose. The text is escaped first and the needle escaped the same way, so
   the match happens on the escaped string and no markup can be injected. */
function markUp(text, hi){
  let out = esc(text);
  const list = Array.isArray(hi) ? hi : (hi ? [hi] : []);
  list.forEach(h=>{
    const n = esc(h);
    if(n && out.indexOf(n) !== -1) out = out.split(n).join('<mark class="hl">' + n + '</mark>');
  });
  return out;
}
function openReading(key, hi){
  const P = (DATA.passages || {})[key];
  if(!P) return;
  let box = document.getElementById("readbox");
  if(!box){
    box = document.createElement("div");
    box.id = "readbox"; box.className = "readbox";
    document.body.appendChild(box);
  }
  box.innerHTML =
    `<div class="readinner" role="dialog" aria-modal="true" aria-label="${esc(DATA.readLabel || 'The reading')}">
       <div class="readhead">
         <div><div class="readtitle">${esc(P.title)}</div>
              <div class="readcite">${esc(P.cite)}</div></div>
         <button class="readx" id="readx" aria-label="Close the reading">&times;</button>
       </div>
       <div class="readbody">${P.text.map(t=>`<p>${markUp(t, hi)}</p>`).join("")}</div>
       ${(P.vocab && P.vocab.length) ? `<div class="readvocab">
         <div class="vlab">${esc(DATA.vocabLabel || "Vocabulary")}</div>
         ${P.vocab.map(v=>`<p><b>${esc(v[0])}</b> <i>${esc(v[1])}</i> ${markUp(v[2], hi)}</p>`).join("")}
       </div>` : ""}
       ${P.book ? `<p class="readbook">${esc(P.book)}</p>` : ""}
       <button class="btn p" id="readdone">Got it — back to the question</button>
     </div>`;
  box.hidden = false;
  document.body.style.overflow = "hidden";
  const shut = ()=>{ box.hidden = true; document.body.style.overflow = ""; };
  $("readx").onclick = shut;
  $("readdone").onclick = shut;
  box.onclick = e=>{ if(e.target === box) shut(); };
  document.addEventListener("keydown", function esc2(e){
    if(e.key === "Escape"){ shut(); document.removeEventListener("keydown", esc2); }
  });
  const first = box.querySelector("mark.hl");
  if(first) first.scrollIntoView({block:"center"});
  $("readdone").focus();
}
function offerReading(it){
  const key = it && it.p;
  if(!key || !(DATA.passages || {})[key]) return;
  if($("readbtn")) return;
  $("act").insertAdjacentHTML("afterbegin",
    `<button class="btn o" id="readbtn">${esc(DATA.readCta || "Show me the reading")}</button>`);
  $("readbtn").onclick = ()=>openReading(key, it.hi);
}
"""

READ_CSS = """
/* the reading panel */
.readbox{position:fixed;inset:0;z-index:80;background:rgba(10,14,13,.72);
  display:flex;align-items:flex-end;justify-content:center;padding:0}
.readbox[hidden]{display:none}
.readinner{background:var(--panel,#F4F1E9);color:var(--ink,#1A211F);
  width:100%;max-width:660px;max-height:86vh;overflow:auto;
  padding:18px 18px calc(18px + env(safe-area-inset-bottom));
  border-top:5px solid var(--jade,#2F8F76);
  animation:readup .22s ease}
@keyframes readup{from{transform:translateY(18px);opacity:.4}to{transform:none;opacity:1}}
@media (min-width:640px){
  .readbox{align-items:center}
  .readinner{border:4px solid var(--jade,#2F8F76);max-height:80vh}
}
.readhead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;
  padding-bottom:10px;border-bottom:2px solid rgba(0,0,0,.12)}
.readtitle{font:800 17px var(--disp,system-ui);line-height:1.25}
.readcite{font:600 11px var(--mono,monospace);letter-spacing:.05em;
  color:var(--stone,#8A9490);margin-top:3px}
.readx{background:none;border:0;font-size:26px;line-height:1;cursor:pointer;
  color:var(--stone,#8A9490);padding:0 4px}
.readx:hover{color:var(--ink,#1A211F)}
.readbody p{font-size:15.5px;line-height:1.65;margin:12px 0}
/* the sentence the question turns on */
/* the Core Vocabulary sidebar, kept visually apart from the prose the way the
   Reader keeps it apart on the page */
.readvocab{margin-top:16px;padding:12px 14px;background:rgba(47,143,118,.09);
  border-left:4px solid var(--jade,#2F8F76)}
.vlab{font:800 10px var(--mono,monospace);letter-spacing:.16em;text-transform:uppercase;
  color:var(--jade,#2F8F76);margin-bottom:6px}
.readvocab p{margin:6px 0;font-size:14.5px;line-height:1.55}
.readvocab i{color:var(--stone,#8A9490);font-size:13px}
.readbody mark.hl,.readvocab mark.hl{background:#FFE9A8;color:inherit;font-weight:600;
  box-shadow:0 0 0 3px #FFE9A8;border-radius:1px}
.readbook{margin:14px 0 0;padding:10px 12px;border-left:3px solid var(--gold);
  background:rgba(224,168,60,.09);font-size:13.5px;line-height:1.55;color:var(--stone)}
.readbox .btn{width:100%;margin-top:6px}
"""

H_MISS_OLD = """function miss(it,msg){
  tries++;
  MC.wrong(S.id+"-"+idx);
  $("fb").innerHTML = `<div class="fb no"><strong>Not yet.</strong>${esc(msg)}</div>`;"""

# The old "Show me the page" button never showed a page: it printed `it.why`,
# the explanation of the answer, under the heading "From the reader". With a real
# passage panel and a reveal button either side of it, it was the third of three
# overlapping offers — so it goes.
H_HINT_OLD = """  if(tries>=2 && !$("hint")){
    $("act").insertAdjacentHTML("afterbegin",`<button class="btn o" id="hint">Show me the page</button>`);
    $("hint").onclick=()=>{
      $("fb").innerHTML = `<div class="fb no"><strong>From the reader</strong>${esc(it.why)}
        <cite>${esc(it.cite)}</cite></div>`;
      $("hint").remove();
    };
  }
"""

# Buttons are inserted at the front of the row, so they are added in reverse of
# the order they should read in: help first, giving up last.
#   Show me the reading   → go and find it out
#   Clear these and try again
#   Show me the answer    → only after three misses
H_MISS_NEW = """function miss(it,msg){
  tries++;
  MC.wrong(S.id+"-"+idx);
  $("fb").innerHTML = `<div class="fb no"><strong>Not yet.</strong>${esc(msg)}</div>`;
  if(tries >= 3 && !shown && !$("reveal")){
    $("act").insertAdjacentHTML("afterbegin",
      `<button class="btn h" id="reveal">Show me the answer</button>`);
    $("reveal").onclick = ()=>{
      revealHistory(it); $("reveal").remove();
      const go = $("go"); if(go) go.remove();
      $("fb").innerHTML = `<div class="fb no"><strong>Here it is.</strong>${esc(it.why||"")}
        <cite>${esc(it.cite||"")}</cite>
        <p class="hintnote">Answer shown \\u2014 this question scores 25%. Read it through, then carry on.</p></div>`;
    };
  }
  offerRetry();
  offerReading(it);
  saveState($("fb").innerHTML, false);"""


NAV_CSS = """
/* the back / skip row, and the notice that stops a half-finished set */
.nav{display:flex;align-items:center;justify-content:space-between;gap:10px;
  margin-top:14px;padding-top:12px;border-top:2px solid rgba(0,0,0,.1)}
.navb{font:700 12px var(--mono);letter-spacing:.06em;text-transform:uppercase;
  background:none;border:2px solid currentColor;color:var(--stone);
  padding:7px 12px;cursor:pointer;border-radius:2px}
.navb:hover:not([disabled]){color:var(--ink)}
.navb[disabled]{opacity:.3;cursor:default}
.navb:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.navpos{font:700 11px var(--mono);letter-spacing:.1em;color:var(--stone)}
.skipnote{margin:10px 0 0;font-size:14px;line-height:1.6;color:var(--stone)}
"""


TG_RE = re.compile(r"""\s*[·;,]?\s*Teacher Guide[^"’']*""")

FOOT_RE = re.compile(r'"Student Reader and Teacher Guide, (Chapter \d+)\.')


def hide_teacher_guide(html):
    """Take the Teacher Guide out of the text a child reads.

    Building the questions from the guide is the whole point of having it — it is
    what says which parts of a chapter are actually assessed. But a citation
    reading "Teacher Guide, Chapter 4" names a book he does not have and cannot
    go and look at, which is the opposite of what a citation is for. Where a cite
    names both books the Student Reader half is kept; where it names only the
    guide the cite is dropped, and the reveal renders without one.

    The source comments in the app's own script are left alone. They are the
    record of where the questions came from, and no child reads them.
    """
    def fix(m):
        out = TG_RE.sub("", m.group(2)).strip(" ·,;-—")
        return '%s"%s"' % (m.group(1), out)
    html = re.sub(r'("?cite"?\s*:\s*)"([^"]*Teacher Guide[^"]*)"', fix, html)
    html = FOOT_RE.sub(r'"Student Reader, \g<1>.', html)
    # Chapter 1 is the older shell: its attribution is a <p> in the markup
    # rather than a string in the script, so it needs its own pass.
    return html.replace("Unit 2 Teacher Guide and Student Reader",
                        "Unit 2 Student Reader")


def history(html):
    """Chapters 2-4. Chapter 1 is an older shell with none of these render
    functions, so it is left alone — it is checked for explicitly rather than
    silently skipped."""
    if "function rOrder(" not in html or "function markOrder(" in html:
        return html
    # `shown` gates the reveal button; it has to exist before anything reads it
    old = "let S=null, idx=0, log=[], tries=0, picked=null, order=[], chosen=new Set();"
    if old in html:
        html = html.replace(old, old + "\nlet shown=false;", 1)
    html = html.replace("  tries=0; picked=null; chosen=new Set();",
                        "  tries=0; picked=null; chosen=new Set(); shown=false;", 1)
    html = html.replace(H_ORDER_OLD, H_ORDER_NEW, 1)
    html = html.replace(H_BUILD_OLD, H_BUILD_NEW, 1)
    html = H_TILE_RE.sub(_tile_sub, html, count=1)
    html = html.replace(H_REVEAL_OLD, H_REVEAL_NEW, 1)
    html = html.replace(H_HUB_OLD, H_HUB_NEW, 1)
    html = html.replace(H_SHOW_OLD, H_SHOW_NEW, 1)
    html = html.replace(H_MISS_OLD, H_MISS_NEW, 1)
    html = html.replace(H_HINT_OLD, "", 1)
    html = html.replace(H_LOG_OLD, H_LOG_NEW, 1)
    html = html.replace(H_RENDER_OLD, H_RENDER_NEW, 1)
    html = html.replace(H_NEXTBTN_OLD, H_NEXTBTN_NEW, 1)
    html = html.replace(H_FINISH_OLD, H_FINISH_NEW, 1)
    html = html.replace(H_START_OLD, H_START_NEW, 1)
    html = html.replace("</style>", NAV_CSS + READ_CSS + HUB_CSS + "</style>", 1)
    return html.replace("/* ---------- feedback ---------- */",
                        H_MARKERS + H_RETRY + H_STATE + H_NAV + H_READ +
                        "\n/* ---------- feedback ---------- */", 1)


def unpatch(html):
    """Strip this module's additions back out.

    A generator clones the previous chapter's file as its shell, and that file
    has already been patched. Without this, a new chapter inherits whatever the
    patch looked like on the day its predecessor was built — Chapter 4 arrived
    carrying a button that had been removed from Chapters 2 and 3 the same
    afternoon. Stripping first means every chapter is patched by today's rules.
    """
    import re as _re
    i = html.find("/* ---------- review marks ----------")
    if i >= 0:
        j = html.find("/* ---------- feedback ---------- */", i)
        if j > i:
            html = html[:i] + html[j:]
            # H_MARKERS is inserted with a newline in front of its own comment,
            # and the strip above starts *at* the comment — so that newline
            # survived every cycle and the history apps grew a blank line on
            # each --retheme. Nine of them accumulated in one afternoon. Put the
            # seam back to the single blank line the shell has there.
            html = _re.sub(r"\n{3,}(/\* ---------- feedback ---------- \*/)",
                           r"\n\n\1", html, count=1)
    html = html.replace("let shown=false;\n", "")
    html = html.replace("  tries=0; picked=null; chosen=new Set(); shown=false;",
                        "  tries=0; picked=null; chosen=new Set();")
    html = html.replace(H_LOG_NEW, H_LOG_OLD)

    # A file built while this revert did not exist yet carries the calc lines
    # more than once, and only the first copy sits under the line that anchors
    # them — so reverting the pair leaves the rest behind, and the file still
    # declares `miss` twice. Collapse the repeats before reverting anything.
    _one = ("  const miss = notClean();\n"
            "  const lead = miss.length ? leadUp(miss) : [];\n")
    while _one + _one in html:
        html = html.replace(_one + _one, _one)

    # The retake and excerpt layers, back out in the order they went in. Most of
    # these undo themselves, because applying one removes the text the next pass
    # would match. M_CALC_NEW does not: it keeps the line it anchors on, so a
    # second pass appended a second `const miss` and every mission app stopped
    # parsing. Reverting the lot is cheaper than reasoning about which need it.
    for _new, _old in ((M_ACT_NEW, M_ACT_OLD),
                       (M_CALC_NEW, M_CALC_OLD),
                       (M_BEST_NEW, M_BEST_OLD),
                       (M_FIRST_NEW, M_FIRST_OLD),
                       (M_FINISH_NEW, M_FINISH_OLD),
                       (M_WINLAST_NEW, M_WINLAST_OLD),
                       (M_LOG_NEW, M_LOG_OLD),
                       (M_NAV_NEW, M_NAV_OLD),
                       (M_RENDER_NEW, M_RENDER_OLD),
                       (M_RUN_STATE_NEW, M_RUN_STATE_OLD),
                       (D_EX_NEW, D_EX_OLD),
                       (K_MISS_NEW, K_MISS_OLD),
                       (K_READ1_NEW, K_READ1_OLD),
                       (K_REVIEW_NEW, K_REVIEW_OLD),
                       (K_RIGHT_NEW, K_RIGHT_OLD),
                       (K_READ2_NEW, K_READ2_OLD),
                       (D_VOCAB_NEW, D_VOCAB_OLD)):
        html = html.replace(_new, _old)
    # These two have grown a line at a time, so a file may still carry an older
    # shape of them. Reverting only the *current* shape left the earlier one in
    # place, and the next patch then found no anchor — silently skipping the very
    # line being added. Strip whatever trailing calls are there instead of
    # matching one snapshot of them.
    html = re.sub(r'  if\(it\.type==="pick"\)  rPick\(it, head\);\n'
                  r'  else if\(it\.type==="order"\) rOrder\(it, head\);\n'
                  r'  else rBuild\(head\);'
                  r'(?:\n  navBar\(\);)?(?:\n  restoreState\(\);)?',
                  lambda m: H_RENDER_OLD, html)
    html = re.sub(r'  \$\("next"\)\.onclick=\(\)=>\{ if\(last\) finish\(\); else \{ idx\+\+; render\(\); '
                  r'window\.scrollTo\(0,0\); \} \};'
                  r'(?:\n  navBar\(\);)?(?:\n  saveState\(\$\("fb"\)\.innerHTML, true\);)?',
                  lambda m: H_NEXTBTN_OLD, html)
    html = html.replace(H_FINISH_NEW, H_FINISH_OLD)
    html = html.replace(H_START_NEW, H_START_OLD)
    html = html.replace(H_ORDER_NEW, H_ORDER_OLD)
    html = html.replace(H_BUILD_NEW, H_BUILD_OLD)
    html = html.replace(H_HUB_NEW, H_HUB_OLD)
    html = html.replace(H_SHOW_NEW, H_SHOW_OLD)
    html = html.replace(H_MISS_NEW, H_MISS_OLD)
    html = H_REVEAL_RE.sub(lambda m: H_REVEAL_OLD, html)
    html = _re.sub(
        r'if\(chosen\.has\(i\)\)\{ chosen\.delete\(i\); b\.classList\.remove\("sel","right","wrong"\); \}\n'
        r'(\s*)else if\(chosen\.size<(\w+)\)\{ chosen\.add\(i\); b\.classList\.add\("sel"\);\n'
        r'\s*b\.classList\.remove\("right","wrong"\); \}',
        lambda m: ('if(chosen.has(i)){ chosen.delete(i); b.classList.remove("sel"); }\n'
                   + m.group(1) + 'else if(chosen.size<' + m.group(2)
                   + '){ chosen.add(i); b.classList.add("sel"); }'),
        html)
    i = html.find("/* ---------- remembering each question ----------")
    if i >= 0:
        j = html.find("/* ---------- getting about ----------", i)
        if j > i:
            html = html[:i] + html[j:]
    for block in (NAV_CSS, READ_CSS, HUB_CSS):
        html = html.replace(block, "")
    return html


# ------------------------------------------------- the mission drawer's marker
#
# Science and reading open the passage and, until now, pointed at nothing in it.
# The item's `hi` says which line answers the question; this marks it, exactly
# as the history and math panels do. Escaped first, and the needle escaped the
# same way, so the match happens on the escaped string and no markup from the
# data can reach the page as markup.

M_MARK = """
/* ---------- pointing at the line that answers it ----------
   Opening the page without marking anything just moves the problem. `hi` may be
   one string or several — a select-all is answered by several sentences, and a
   vocabulary match by the definitions rather than by any sentence at all. */
function markUp(text, hi){
  let out = esc(text);
  const list = Array.isArray(hi) ? hi : (hi ? [hi] : []);
  list.forEach(h=>{
    const n = esc(h);
    if(n && out.indexOf(n) !== -1) out = out.split(n).join('<mark class="hl">' + n + '</mark>');
  });
  return out;
}
"""

# The drawer is handed the passage key and never the item, so the highlight has
# to travel with it. Kept in a module-level variable rather than threaded
# through every caller, because the drawer is opened from five places.
M_DRAWER_OLD = """function drawer(key, exKey, mode){
  const p  = DATA.passages[key];"""

M_DRAWER_NEW = """let drawerHi = null;      /* the line to mark, set by whoever opens the drawer */
function drawer(key, exKey, mode, hi){
  if(hi !== undefined) drawerHi = hi;
  const p  = DATA.passages[key];"""

M_BODY_OLD = """       ${p.vocab.length?`<div class="vbox" style="margin-top:10px"><span class="vh">Vocabulary</span>`+
         p.vocab.map(([w,d])=>`<div><dt>${esc(w)}</dt> <dd>${esc(d)}</dd></div>`).join("")+`</div>`:""}
       ${p.text.map(t=>`<p>${esc(t)}</p>`).join("")}"""

M_BODY_NEW = """       ${p.vocab.length?`<div class="vbox" style="margin-top:10px"><span class="vh">Vocabulary</span>`+
         p.vocab.map(([w,d])=>`<div><dt>${esc(w)}</dt> <dd>${markUp(d, drawerHi)}</dd></div>`).join("")+`</div>`:""}
       ${p.text.map(t=>`<p>${markUp(t, drawerHi)}</p>`).join("")}"""

M_CSS = """
.morepg mark.hl,.vbox mark.hl{background:#FFF1B8;box-shadow:0 0 0 2px #FFF1B8;
  color:inherit;border-radius:2px}
"""


def mission(html):
    """Science and reading. A no-op on any shell without the drawer."""
    if "function drawer(" not in html or "function markUp(" in html:
        return html
    html = html.replace(M_DRAWER_OLD, M_DRAWER_NEW, 1)
    html = html.replace(M_BODY_OLD, M_BODY_NEW, 1)
    # every call site passes the current item's highlight
    html = re.sub(r"drawer\((it|cur|S\.items\[idx\])\.p\s*,\s*([^,)]+)\s*,\s*([^,)]+)\)",
                  lambda m: "drawer(%s.p, %s, %s, %s.hi)" % (m.group(1), m.group(2),
                                                             m.group(3), m.group(1)),
                  html)
    html = html.replace("</style>", M_CSS + "</style>", 1)
    return html.replace("function drawer(", M_MARK + "function drawer(", 1)


# ----------------------------------------------- the chapter 1 reader's marker
#
# Chapter 1 is the older shell: it builds its reader with document.createElement
# rather than from a template, and keeps each passage as one string instead of a
# list of paragraphs. Same idea as everywhere else, different plumbing — and it
# is the one app that was still opening the source and marking nothing on it.

H1_MARK = """
/* Marks the line that answers the question, in the reader panel. The text is
   escaped first and the needle escaped the same way, so the match happens on
   the escaped string and nothing in the data can reach the page as markup. */
function markUp(text, hi){
  let out = esc(text);
  const list = Array.isArray(hi) ? hi : (hi ? [hi] : []);
  list.forEach(h=>{
    const n = esc(h);
    if(n && out.indexOf(n) !== -1) out = out.split(n).join('<mark class="hl">' + n + '</mark>');
  });
  return out;
}
"""

H1_BODY_OLD = '    ex.appendChild(el("p",null,p.text));'
H1_BODY_NEW = """    const body = el("p");
    body.innerHTML = markUp(p.text, it.hi);   /* the line this question turns on */
    ex.appendChild(body);"""

H1_CSS = """
.reader mark.hl{background:#FFF1B8;box-shadow:0 0 0 2px #FFF1B8;
  color:inherit;border-radius:2px}
"""


def history1(html):
    """Chapter 1 only. A no-op anywhere else."""
    if "function openReader(" not in html or "function markUp(" in html:
        return html
    if H1_BODY_OLD not in html:
        return html
    html = html.replace(H1_BODY_OLD, H1_BODY_NEW, 1)
    html = html.replace("</style>", H1_CSS + "</style>", 1)
    return html.replace("function openReader(", H1_MARK + "function openReader(", 1)


# ------------------------------------------------------------ retake (mission)
#
# Getting a question wrong and being told the answer is not the same as being
# able to do it. Until now the only way back was "Run this mission again", all
# eight questions of it, which is too blunt to use on one miss — so in practice
# nothing was retried at all.
#
# Two ways back now. The first is the obvious one: just the questions he missed.
# The second is the one worth having — those questions *with their run-up*. A
# question rarely stands alone: it sits in a scene, and there is usually a
# question just before it that sets up the thing it turns on. Retrying the miss
# on its own tests whether he remembers being told. Retrying it after the two
# questions that lead into it tests whether he can get there.
#
# Both are correction rounds: MC.begin({partial:true}), so neither can overwrite
# a best score or pay out the full haul. Three questions at 100% is not the same
# achievement as eight.
#
# All of it hangs off RUN, an array of indices into M.items. A full run is every
# index in order; a correction round is a handful. Everything that indexed
# M.items by idx now goes through RUN, so one mechanism covers both cases and
# there is no second code path to keep in step.

M_RUN_STATE_OLD = """/* ---------- mission ---------- */
function start(i){
  M = DATA.missions[i]; idx=0; log=[]; snap=[]; triesAt=[]; forceFinish=false;
  MC.begin();
  $("mname").textContent = M.name; $("mtag").textContent = M.tag;
  show("play"); render();
}"""

M_RUN_STATE_NEW = """/* ---------- mission ---------- */
/* RUN holds indices into M.items: every one of them for a full run, a handful
   for a correction round. RUNPART says which of the two this is. */
let RUN = [], RUNPART = false;

/* The run-up to a question. Two things count: whatever else was asked about the
   same passage — the same scene — and the question immediately before it, which
   is the step he was standing on when he fell. Sorted back into story order so
   it plays forwards, and capped so a crowded scene cannot turn a correction
   round back into the whole mission. */
function leadUp(missed){
  const want = new Set();
  missed.forEach(i => {
    want.add(i);
    if (i > 0) want.add(i - 1);
    M.items.forEach((x, j) => { if (x.p && x.p === M.items[i].p) want.add(j); });
  });
  let out = [...want];
  if (out.length > 6) {
    const near = j => Math.min(...missed.map(i => Math.abs(i - j)));
    const keep = new Set(missed);
    out.filter(j => !keep.has(j)).sort((a, b) => near(a) - near(b))
       .slice(0, Math.max(0, 6 - keep.size)).forEach(j => keep.add(j));
    out = [...keep];
  }
  return out.sort((a, b) => a - b);
}

/* Which questions did not go in cleanly: missed, hinted, or never answered. */
function notClean(){
  const out = [];
  RUN.forEach((n, k) => {
    const l = log[k];
    if (!l || l.tries > 1 || l.hinted) out.push(n);
  });
  return out;
}

function startRun(list, partial){
  RUN = list.slice(); RUNPART = !!partial;
  idx=0; log=[]; snap=[]; triesAt=[]; forceFinish=false;
  MC.begin(partial ? {partial:true} : undefined);
  show("play"); render(); window.scrollTo(0,0);
}

function start(i){
  M = DATA.missions[i];
  $("mname").textContent = M.name; $("mtag").textContent = M.tag;
  startRun(M.items.map((_, n) => n), false);
}"""

M_RENDER_OLD = """  $("dots").innerHTML = M.items.map((_,i)=>
    `<span class="dot ${i<idx?"done":i===idx?"now":""}"></span>`).join("");
  const it = M.items[idx];
  const head = `<div class="qnum">Question ${idx+1} of ${M.items.length}</div><div class="q">${esc(MC.ask(it))}</div>`;"""

M_RENDER_NEW = """  $("dots").innerHTML = RUN.map((_,i)=>
    `<span class="dot ${i<idx?"done":i===idx?"now":""}"></span>`).join("");
  const it = M.items[RUN[idx]];
  const head = `<div class="qnum">Question ${idx+1} of ${RUN.length}${
      RUNPART?" &middot; second look":""}</div><div class="q">${esc(MC.ask(it))}</div>`;"""

M_NAV_OLD = """  const last = idx === M.items.length - 1;
  const answered = !!log[idx];
  nav.innerHTML =
    `<button class="navb" id="navback"${idx===0?" disabled":""}>&lsaquo; Back</button>` +
    `<span class="navpos">${idx+1} of ${M.items.length}</span>` +"""

M_NAV_NEW = """  const last = idx === RUN.length - 1;
  const answered = !!log[idx];
  nav.innerHTML =
    `<button class="navb" id="navback"${idx===0?" disabled":""}>&lsaquo; Back</button>` +
    `<span class="navpos">${idx+1} of ${RUN.length}</span>` +"""

# The log entry has to remember which question it was, not only where it sat in
# this run, or a correction round cannot be built out of a correction round.
M_LOG_OLD = """  log[idx] = {q:idx+1,tries,pts,p:it.p,hinted}; triesAt[idx] = tries;"""
M_LOG_NEW = """  log[idx] = {q:idx+1,i:RUN[idx],tries,pts,p:it.p,hinted}; triesAt[idx] = tries;"""

M_WINLAST_OLD = """  const last = idx===M.items.length-1;
  $("act").innerHTML = `<button class="btn o" id="read">See the book page or watch the video</button>"""
M_WINLAST_NEW = """  const last = idx===RUN.length-1;
  $("act").innerHTML = `<button class="btn o" id="read">See the book page or watch the video</button>"""

M_FINISH_OLD = """  const done = log.filter(Boolean);
  const skipped = M.items.length - done.length;
  const pct = Math.round(done.reduce((s,l)=>s+l.pts,0)/M.items.length);"""
M_FINISH_NEW = """  const done = log.filter(Boolean);
  const skipped = RUN.length - done.length;
  const pct = Math.round(done.reduce((s,l)=>s+l.pts,0)/RUN.length);"""

M_FIRST_OLD = """      <div class="stat"><b>${first} / ${M.items.length}</b><span>First try</span></div>"""
M_FIRST_NEW = """      <div class="stat"><b>${first} / ${RUN.length}</b><span>First try</span></div>"""

M_BEST_OLD = """  best[M.id] = Math.max(best[M.id]||0, pct);"""
M_BEST_NEW = """  /* A correction round is three questions out of eight. It is worth doing and
     it is not worth a best score. */
  if(!RUNPART) best[M.id] = Math.max(best[M.id]||0, pct);"""

M_ACT_OLD = """    <div class="act">
      <button class="btn p" id="again">Run this mission again</button>
      <button class="btn o" id="pick">Pick another mission</button>
    </div>`;
  $("again").onclick=()=>{ idx=0; log=[]; snap=[]; triesAt=[]; forceFinish=false; show("play"); render(); };"""

M_ACT_NEW = """    ${miss.length?`<div class="review"><b>Two ways to go again</b>
       <ul><li><b>Just those ${miss.length}</b> \u2014 the questions themselves, nothing else.</li>
       <li><b>With the run-up</b> \u2014 ${lead.length} questions: those ones, and the
       ones that lead into them, so you can see how you get there.</li></ul></div>`:""}
    <div class="act">
      ${miss.length?`<button class="btn p" id="justmiss">Just the ${miss.length} I missed</button>`:""}
      ${miss.length?`<button class="btn p" id="leadup">Those ${miss.length}, with the run-up (${lead.length})</button>`:""}
      <button class="btn ${miss.length?"o":"p"}" id="again">Run the whole thing again</button>
      <button class="btn o" id="pick">Pick another mission</button>
    </div>`;
  if($("justmiss")) $("justmiss").onclick=()=>startRun(miss, true);
  if($("leadup"))   $("leadup").onclick=()=>startRun(lead, true);
  $("again").onclick=()=>startRun(M.items.map((_,n)=>n), false);"""

# `miss` and `lead` have to exist before the template literal that reads them.
M_CALC_OLD = """  const pages = [...new Set(rough.map(l=>DATA.passages[l.p].cite))];"""
M_CALC_NEW = """  const pages = [...new Set(rough.map(l=>DATA.passages[l.p].cite))];
  const miss = notClean();
  const lead = miss.length ? leadUp(miss) : [];"""


def retake(html):
    """Two ways back into the questions that did not go in cleanly."""
    for old, new in ((M_RUN_STATE_OLD, M_RUN_STATE_NEW),
                     (M_RENDER_OLD, M_RENDER_NEW),
                     (M_NAV_OLD, M_NAV_NEW),
                     (M_LOG_OLD, M_LOG_NEW),
                     (M_WINLAST_OLD, M_WINLAST_NEW),
                     (M_FINISH_OLD, M_FINISH_NEW),
                     (M_FIRST_OLD, M_FIRST_NEW),
                     (M_BEST_OLD, M_BEST_NEW),
                     (M_CALC_OLD, M_CALC_NEW),
                     (M_ACT_OLD, M_ACT_NEW)):
        if old in html:
            html = html.replace(old, new, 1)
    return html


# ---------------------------------------------------- the excerpt on a miss
#
# Getting a question wrong opens the book at the place the answer is, with the
# line marked. That is the single most useful thing the app does, and in
# twenty-three of the twenty-six apps it was showing the wrong story.
#
# The excerpt came from a stored table, DATA.excerpts, keyed "m1-0", "m1-1" and
# so on. Every app is generated from another app's shell, and that table came
# across with the shell — so The Engineer's Thumb quoted the Speckled Band's
# inquest, all four Red-Headed League sections quoted it too, and seven of the
# science chapters quoted a chapter of a different unit. Only the three apps
# nobody had ever generated from were right. Nothing could see it: the table was
# well formed, the keys all resolved, and the text was real text from a real
# book.
#
# It is derived now. Every question already names the passage behind it and the
# line in that passage that answers it — the highlight, which test_highlights.js
# checks is really there for all 375 of them. The excerpt is simply the
# paragraphs of that passage carrying that line. It cannot point at another
# story, because it is built from the question's own passage; and it cannot go
# stale, because there is nothing left to copy.

D_EX_OLD = """function drawer(key, exKey, mode, hi){
  if(hi !== undefined) drawerHi = hi;
  const p  = DATA.passages[key];
  const ex = DATA.excerpts[exKey];
  const v  = DATA.vidFor[key];"""

D_EX_NEW = """/* The part of the passage the answer is actually in: whichever paragraphs carry
   this question's highlighted line. Built from the question's own passage, so it
   cannot be another story's. */
function excerptFor(key, hi){
  const p = DATA.passages[key];
  if(!p || !p.text) return null;
  const marks = [].concat(hi === undefined || hi === null ? (drawerHi || []) : hi)
                  .filter(Boolean);
  if(!marks.length) return null;
  const hit = p.text.filter(t => marks.some(h => t.indexOf(h) !== -1));
  if(hit.length) return hit;
  /* Some questions turn on a definition rather than on a sentence of the text,
     and the line they mark is in the passage's vocabulary list. Quote that. */
  const vocab = (p.vocab||[]).filter(v =>
    marks.some(h => String(v[1]).indexOf(h) !== -1 || String(v[0]).indexOf(h) !== -1));
  return vocab.length ? vocab.map(v => v[0] + " \\u2014 " + v[1]) : null;
}

function drawer(key, exKey, mode, hi){
  if(hi !== undefined) drawerHi = hi;
  const p  = DATA.passages[key];
  const ex = excerptFor(key, hi !== undefined ? hi : drawerHi);
  const v  = DATA.vidFor ? DATA.vidFor[key] : null;"""

# The key that identifies a question to the engine has to be the question, not
# where it happens to sit in this run. A correction round of three asks them at
# positions 0, 1 and 2, so the miss log was filing them against whatever three
# questions happened to open the full run.
K_MISS_OLD = """  MC.wrong(M.id+"-"+idx); triesAt[idx] = tries;"""
K_MISS_NEW = """  MC.wrong(M.id+"-"+RUN[idx]); triesAt[idx] = tries;"""

K_READ1_OLD = """  $("read").onclick=()=>drawer(it.p, M.id+"-"+idx, "retry", it.hi);
  if(tries===1) setTimeout(()=>drawer(it.p, M.id+"-"+idx, "retry", it.hi), 420);"""
K_READ1_NEW = """  $("read").onclick=()=>drawer(it.p, M.id+"-"+RUN[idx], "retry", it.hi);
  /* Auto-opened on the first miss of a question, in a correction round exactly
     as in a full one: a retake starts every question's count at zero. */
  if(tries===1) setTimeout(()=>drawer(it.p, M.id+"-"+RUN[idx], "retry", it.hi), 420);"""

K_REVIEW_OLD = """  if(r){ r.disabled = false; r.onclick = ()=>drawer(it.p, M.id+"-"+idx, "review", it.hi); }"""
K_REVIEW_NEW = """  if(r){ r.disabled = false; r.onclick = ()=>drawer(it.p, M.id+"-"+RUN[idx], "review", it.hi); }"""

K_RIGHT_OLD = """  MC.right(M.id+"-"+idx);"""
K_RIGHT_NEW = """  MC.right(M.id+"-"+RUN[idx]);"""

K_READ2_OLD = """  $("read").onclick=()=>drawer(it.p, M.id+"-"+idx, "review", it.hi);"""
K_READ2_NEW = """  $("read").onclick=()=>drawer(it.p, M.id+"-"+RUN[idx], "review", it.hi);"""

# A reading passage has a title, a citation and its text. It has no vocabulary
# list -- that is a science thing -- and the drawer read p.vocab.length without
# checking, so opening the book threw a TypeError and the panel never appeared
# at all. On all four Red-Headed League sections, on the Engineer's Thumb, and
# on the passages of two science chapters that happen to have no vocabulary.
# Which is to say: on the apps he has actually been reading, the one thing that
# helps when he is stuck has been dead.
D_VOCAB_OLD = """       ${p.vocab.length?`<div class="vbox" style="margin-top:10px"><span class="vh">Vocabulary</span>`+
         p.vocab.map(([w,d])=>`<div><dt>${esc(w)}</dt> <dd>${markUp(d, drawerHi)}</dd></div>`).join("")+`</div>`:""}"""
D_VOCAB_NEW = """       ${(p.vocab||[]).length?`<div class="vbox" style="margin-top:10px"><span class="vh">Vocabulary</span>`+
         p.vocab.map(([w,d])=>`<div><dt>${esc(w)}</dt> <dd>${markUp(d, drawerHi)}</dd></div>`).join("")+`</div>`:""}"""


def excerpt(html):
    """Derive the excerpt from the question's own passage, and key by question."""
    for old, new in ((D_EX_OLD, D_EX_NEW),
                     (K_MISS_OLD, K_MISS_NEW),
                     (K_READ1_OLD, K_READ1_NEW),
                     (K_REVIEW_OLD, K_REVIEW_NEW),
                     (K_RIGHT_OLD, K_RIGHT_NEW),
                     (K_READ2_OLD, K_READ2_NEW),
                     (D_VOCAB_OLD, D_VOCAB_NEW)):
        if old in html:
            html = html.replace(old, new, 1)
    return html


def patch(html):
    """Run every shell patch. Each is a no-op where its anchor is absent.

    Strip first. `history()` bails out the moment it sees its own marks, so
    on an already-patched file every later change to this module was skipped
    in silence: the Big Question fix landed on Chapter 4, which had just been
    regenerated, and never reached Chapters 2 and 3, which had not. Reverting
    to the bare shell and patching that means a rebuild always applies today's
    version rather than whatever was current when the file was last written.
    """
    return excerpt(retake(hide_teacher_guide(history1(mission(history(unpatch(html)))))))

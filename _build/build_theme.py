#!/usr/bin/env python3
"""
Injects the Minecraft theme layer (theme/mc.css + theme/mc.js) into all four
study apps and patches their call sites.

    python3 build_theme.py [--inline]

Default links sprites by relative path (../../assets/) so the 264 KB of art is
downloaded once and browser-cached across all four apps. --inline base64s the
sprites into each file instead, which keeps every app a single offline file at
a cost of roughly +360 KB each.

Idempotent: re-running on already-themed files is a no-op for the injection and
the patches are all exact-match, so a second run reports "already themed".
"""

import base64, json, pathlib, re, sys

# Runs either from a folder holding study/ + theme/, or from inside study/_build/.
HERE   = pathlib.Path(__file__).resolve().parent
if (HERE / "study").is_dir():
    STUDY, THEME = HERE / "study", HERE / "theme"
elif HERE.name == "_build":
    STUDY, THEME = HERE.parent, HERE
else:
    sys.exit("run me from the folder holding study/, or from study/_build/")
ASSETS = STUDY / "assets"

INLINE = "--inline" in sys.argv

# ---------------------------------------------------------------- call sites

def sci(s):
    p = Patcher(s, "science")
    # the picker's "best X%" badges were in-memory only and forgot everything
    # on reload; MC has been persisting the same numbers all along
    p.at('const best = {};', after__raw='const best = MC.bests();')
    p.at('<button class="mission" style="--c:${COLORS[i]}" data-m="${i}"',
         after__raw='<button class="mission ${best[m.id]==null?\'\':'
                    '(best[m.id]>=75?\'mc-cleared\':\'mc-tried\')}"'
                    ' style="--c:${COLORS[i]}" data-m="${i}"')
    p.at('${best[m.id]!=null?`<span class="badge">best ${best[m.id]}%</span>`:""}',
         after__raw='${best[m.id]!=null?`<span class="badge mc-best'
                    '${best[m.id]>=75?" mc-done":""}">${best[m.id]>=75?"CLEARED &middot; ":""}'
                    'best ${best[m.id]}%</span>`:""}')
    p.at('function start(i){\n  M = DATA.missions[i]; idx=0; log=[];',
         after='\n  MC.begin();')
    p.at('function miss(it,msg){\n',
         after='  MC.wrong(M.id+"-"+idx);\n')
    p.at('function win(it){\n',
         after='  MC.right(M.id+"-"+idx);\n')
    # results: chest goes in above the score ring
    p.at('  $("pick").onclick=home;\n  show("done");',
         before='  MC.chest($("scorebox"), pct, {id:M.id,\n'
                '    boss: DATA.missions.indexOf(M)===DATA.missions.length-1});\n')
    return p


def spell(s):
    p = Patcher(s, "spelling")
    p.at('const best={};', after__raw='const best = MC.bests();')
    # ring the card itself, so status survives a glance mid-scroll
    p.at('<button class="lv" style="--c:${COLORS[i]}" data-l="${i}">',
         after__raw='<button class="lv ${best[l.id]==null?\'\':'
                    '(best[l.id]>=75?\'mc-cleared\':\'mc-tried\')}"'
                    ' style="--c:${COLORS[i]}" data-l="${i}">')
    # the badge only ever said "best X%" — say plainly whether it is cleared
    p.at('${best[l.id]!=null?`<span class="badge">best ${best[l.id]}%</span>`:""}',
         after__raw='${best[l.id]!=null?`<span class="badge mc-best'
                    '${best[l.id]>=75?" mc-done":""}">${best[l.id]>=75?"CLEARED &middot; ":""}'
                    'best ${best[l.id]}%</span>`:""}')
    p.at('function start(l,subset){\n  LV=l;',
         after='\n  MC.begin({partial: !!(subset && subset.length)});')
    p.at('function good(revealed){\n  const w=DATA.words[order[idx]];\n'
         '  log[idx] = revealed ? false : (tries===1);',
         after='\n  if(revealed) MC.note(w.w); else MC.right(w.w);')
    # the three wrong-answer branches inside checkNow
    p.at('    if(problem){\n      $("typed").classList.add("bad");',
         after='\n      MC.wrong(w.w);')
    p.at('  if(free){\n    /* say nothing about length',
         after__raw='  if(free){\n    MC.wrong(w.w);\n'
                    '    /* say nothing about length')
    p.at('  } else {\n    const wrong=[...typed].filter((c,i)=>c!==w.w[i]).length;',
         after='\n    MC.wrong(w.w);')
    p.at('  $("chart2").onclick=()=>{ lastScreen="done"; chart(); };',
         before='  MC.chest($("scorebox"), pct, {id:LVL().id, boss: !!LVL().boss});\n')
    return p


def vocab(s):
    p = Patcher(s, "vocabulary")
    p.at('function build(){\n  tries=0; hinted=false;',
         after__raw='function build(){\n  MC.begin();\n  tries=0; hinted=false;')
    p.at('  if(!w.length && done===all){ win(); return; }',
         after__raw='  if(!w.length && done===all){'
                    ' slots.forEach(s=>MC.credit(s.word)); MC.right(); win(); return; }')
    p.at('  if(!w.length){                       /* everything finished so far is right */',
         after='\n    MC.right();')
    # one wrong check = one miss, however many lines it covers
    p.at('  tries++;\n  $("fb").innerHTML=`<div class="fb no">',
         after__raw='  tries++;\n'
                    '  w.forEach(n=>{const s=slots.find(x=>x.n===n); if(s) MC.note(s.word);});\n'
                    '  MC.wrong();\n'
                    '  $("fb").innerHTML=`<div class="fb no">')
    # BUG FIX: tries only increments on a *wrong* check, so a flawless sheet
    # ends on tries===0 and falls through the chain to 25%. Floor it at 1.
    p.at('  const pts = hinted?25:(tries===1?100:tries===2?75:tries===3?50:25);',
         after__raw='  const _t = Math.max(1, tries);\n'
                    '  const pts = hinted?25:(_t===1?100:_t===2?75:_t===3?50:25);')
    p.at('  $("again").onclick=build;\n  $("list2").onclick=openList;',
         before='  MC.chest($("scorebox"), pts, {id:"sheet", boss:true});\n')
    return p


def sci2(s):
    """CKSci Chapter 2 — written theme-aware; config only."""
    return Patcher(s, "science2")


def vtest(s):
    """Wordly Wise List 1 unit test — theme-aware; config only. It runs with
    hud:false, because a test should not have hearts draining while it is being
    taken: nothing is marked until Finish. Misses go in through MC.note(), so
    they still land in the shared miss log, and a clean sheet still leaves
    halves at 20 — which is exactly the condition the dragon wants."""
    return Patcher(s, "vocabtest")


def read(s):
    """Sherlock, The Speckled Band pp.1-13 — written theme-aware; config only."""
    return Patcher(s, "reading")


def hist2(s):
    """CKHG Chapter 2 — written already knowing about the theme, so it needs
    only the config; every hook is in the source."""
    return Patcher(s, "history2")


def hist(s):
    p = Patcher(s, "history")
    # without viewport-fit=cover, env(safe-area-inset-*) resolves to 0, so the
    # HUD's bottom padding does nothing on a notched iPhone
    p.at('content="width=device-width, initial-scale=1"',
         after__raw='content="width=device-width, initial-scale=1, viewport-fit=cover"')
    p.at('S.set = Math.random()*DATA.sets.length|0;\nrender();',
         after__raw='S.set = Math.random()*DATA.sets.length|0;\nMC.begin();\nrender();')
    p.at('  next.onclick = ()=>{ S.set=(S.set+1)%DATA.sets.length; S.idx=0; S.results=[]; render(); };',
         after__raw='  next.onclick = ()=>{ S.set=(S.set+1)%DATA.sets.length; S.idx=0; S.results=[];'
                    ' MC.begin(); render(); };')
    p.at('  again.onclick = ()=>{ S.idx=0; S.results=[]; render(); };',
         after__raw='  again.onclick = ()=>{ S.idx=0; S.results=[]; MC.begin();'
                    ' paintPicker(); render(); };')
    p.at('function solved(text, extra){\n',
         after='  MC.right(DATA.sets[S.set].label+"-"+S.idx);\n')
    p.at('function sendToReader(it, note){\n',
         after='  MC.wrong(DATA.sets[S.set].label+"-"+S.idx);\n')
    # a strip of the five practice sets, above the stairway — history dealt one
    # at random and never showed the other four or which were cleared
    p.at('    <div class="stairs" id="stairs" role="img"',
         before='    <div id="setpick"></div>\n')
    p.at('S.set = Math.random()*DATA.sets.length|0;\nMC.begin();\nrender();',
         after__raw='S.set = Math.random()*DATA.sets.length|0;\n'
                    'function paintPicker(){\n'
                    '  MC.picker(document.getElementById("setpick"),\n'
                    '    DATA.sets.map((s,i)=>({id:"set"+i, label:String(i+1)})),\n'
                    '    "set"+S.set,\n'
                    '    id=>{ const n=+id.slice(3); if(n===S.set) return;\n'
                    '          S.set=n; S.idx=0; S.results=[]; MC.begin();\n'
                    '          paintPicker(); render();\n'
                    '          window.scrollTo({top:0,behavior:"smooth"}); });\n'
                    '}\nMC.begin();\npaintPicker();\nrender();')
    p.at('  st.appendChild(el("p","hint", advice));',
         after='\n  MC.chest(st, pct, {id:"set"+S.set, boss: S.set===DATA.sets.length-1});'
               '\n  paintPicker();')
    return p


# `dragon` lists the activities whose perfect run can summon the ender dragon.
# One per subject: its toughest run. History is the exception — its five sets
# are parallel forms of the same seven-item test, not a difficulty ramp, so any
# of them being perfect is the full challenge.
APPS = {
    "science/g5-matter-ch1":  (sci,   dict(app="science",    shake=None,      lift=None,
                                           dragon=["m4"])),
    "spelling/list2":         (spell, dict(app="spelling",   shake="#card",   lift=None,
                                                   dragon=["l7"])),
    "vocabulary/ww6-lesson1": (vocab, dict(app="vocabulary", shake="#sheet",  lift=".bar",
                                           dragon=["sheet"])),
    "history/g5-maya-ch1":    (hist,  dict(app="history",    shake="#stela",  lift=None,
                                           dragon=None)),
    # Ch2's three sets are distinct sections of the chapter, not parallel forms,
    # so the dragon sits on the last one — the hardest run.
    "history/g5-maya-ch2":    (hist2, dict(app="history2",   shake="#card",   lift=None,
                                           dragon=["s3"])),
    "vocabulary/ww6-lesson1-test": (vtest, dict(app="vocabtest", shake=None, lift=None,
                                           hud=False, dragon=["p2"])),
    # The three sections are consecutive stretches of one story, not parallel
    # forms, so the dragon sits on the last — the night Julia died.
    "reading/sherlock-speckled-1": (read, dict(app="reading", shake="#card", lift=None,
                                           dragon=["s3"])),
    # m4 "Be the Engineer" is the capstone — the dragon lives there.
    "science/g5-matter-ch2":  (sci2,  dict(app="science2",   shake="#card",   lift=None,
                                           dragon=["m4"])),
}

# ---------------------------------------------------------------- machinery

class Patcher:
    """Exact-match string patching that shouts instead of silently missing."""
    def __init__(self, text, name):
        self.out, self.name, self.misses = text, name, []

    def at(self, anchor, after=None, before=None, after__raw=None):
        if anchor not in self.out:
            self.misses.append(anchor.split("\n")[0][:60])
            return
        if self.out.count(anchor) != 1:
            self.misses.append("AMBIGUOUS: " + anchor.split("\n")[0][:60])
            return
        if after__raw is not None:
            rep = after__raw
        elif after is not None:
            rep = anchor + after
        else:
            rep = before + anchor
        self.out = self.out.replace(anchor, rep, 1)


def assets_map():
    out = {}
    for f in sorted(ASSETS.glob("*.png")):
        out[f.stem] = "data:image/png;base64," + base64.b64encode(f.read_bytes()).decode()
    return out


def inject(html, cfg):
    css = (THEME / "mc.css").read_text()
    js  = (THEME / "mc.js").read_text()
    has_boss = (ASSETS / "boss-defeated.png").exists()

    if INLINE:
        head = "window.__MC_INLINE__=" + json.dumps(assets_map()) + ";"
    else:
        head = 'window.__MC_PREFIX__="../../assets/";'
    head += "\nwindow.__MC_HAS_BOSS__=%s;" % ("true" if has_boss else "false")

    block = (
        "\n<!-- Minecraft theme layer — generated by build_theme.py, do not hand-edit -->\n"
        "<script>%s</script>\n<script>%s</script>\n"
        "<script>MC.config(%s);</script>\n" % (head, js, json.dumps(cfg))
    )

    if "mc-hud" in html:
        return None                                    # already themed
    html = html.replace("</head>", "<style>\n%s</style>\n</head>" % css, 1)
    return re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + block, html, count=1)


def hub():
    """The hub gets the engine inlined too, so it doesn't fetch from _build/
    at runtime — and it reads state only, with no HUD of its own."""
    path = STUDY / "index.html"
    src = path.read_text()
    tag = '<script src="_build/mc.js"></script>'
    if tag not in src:
        return "hub                      already inlined — skipped"
    js = (THEME / "mc.js").read_text()
    if INLINE:
        head = "window.__MC_INLINE__=" + json.dumps(assets_map()) + ";"
        src = src.replace('window.__MC_PREFIX__="assets/";', head)
    src = src.replace(tag, "<script>%s</script>" % js)
    src = src.replace('window.__MC_HAS_BOSS__=true;',
                      'window.__MC_HAS_BOSS__=%s;'
                      % ("true" if (ASSETS / "boss-defeated.png").exists() else "false"))
    path.write_text(src)
    return "hub                      %6.1f KB -> %6.1f KB" % (len(path.read_text())/1024, len(src)/1024)


def main():
    if not (THEME / "mc.js").exists():
        sys.exit("theme/mc.js missing")
    print("sprites: %s\n" % ("base64-inlined" if INLINE else "linked ../../assets/"))
    bad = 0
    for rel, (patch, cfg) in APPS.items():
        path = STUDY / rel / "index.html"
        src  = path.read_text()

        staged = inject(src, cfg)
        if staged is None:
            print("  %-24s already themed \u2014 skipped" % rel)
            continue

        p = patch(staged)
        if p.misses:
            bad += len(p.misses)
            print("  %-24s FAILED" % rel)
            for m in p.misses:
                print("        no anchor: %s" % m)
            continue

        path.write_text(p.out)
        print("  %-24s %6.1f KB -> %6.1f KB" % (rel, len(src)/1024, len(p.out)/1024))

    print("  " + hub())

    if bad:
        sys.exit("\n%d anchor(s) missed \u2014 nothing written for those apps." % bad)
    if not (ASSETS / "boss-defeated.png").exists():
        print("\n  note: boss-defeated.png absent \u2014 a CSS banner stands in for now.")


if __name__ == "__main__":
    main()

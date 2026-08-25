# _build — the Minecraft theme source

Lives in the repo so it survives between sessions. Nothing in here is served;
GitHub Pages ignores it apart from serving the raw files, which is harmless.

```
mc.css          the theme's styles
mc.js           the theme engine — hearts, hotbar, sprites, chest, localStorage
build_theme.py  injects both into the four apps and patches their call sites
test_theme.js   node test for the engine's logic (no browser needed)
```

## Rebuilding

```
cd study/_build
python3 build_theme.py          # sprites linked from ../../assets/
python3 build_theme.py --inline # sprites base64'd in, +~360 KB per app
node test_theme.js              # 22 assertions on hearts / tools / persistence
```

The script is idempotent — running it on already-themed files reports
"already themed" and writes nothing. To rebuild after editing `mc.js`, restore
the four `index.html` files from git first (`git checkout -- .`), then re-run.

## How the injection works

`build_theme.py` inlines `mc.css` before `</head>`, inlines `mc.js` right after
`<body>`, then makes a handful of exact-match string patches at each app's
existing seams:

| app | correct | wrong | level start | results |
|---|---|---|---|---|
| science | `win()` | `miss()` | `start()` | `finish()` |
| spelling | `good()` | 3 branches in `checkNow()` | `start()` | `finish()` |
| vocabulary | `$("go")` handler | same handler | `build()` | `win()` |
| history | `solved()` | `sendToReader()` | boot + both replay buttons | `renderSummary()` |

The hub (`index.html`) is handled separately: the engine is inlined in place of
its `<script src="_build/mc.js">` tag, with the prefix set to `assets/` and
`hud:false`, so the hub reads `MC.state()` for gear and progress without
growing a HUD of its own. That also means the published site never fetches
anything out of `_build/` at runtime.

Every patch is exact-match and single-occurrence. If an anchor moves because an
app was edited by hand, the build **fails loudly and writes nothing** for that
app rather than silently skipping the hook — the error names the anchor it
couldn't find.

**Don't hand-edit the theme inside an app's `index.html`.** Four copies drift.
Edit `mc.js` / `mc.css` and rebuild.

## Engine contract

```js
MC.config({app, shake, lift})  // once, injected automatically
MC.begin()                     // entering a level — refills hearts to 10
MC.right()                     // win sprite bursts
MC.wrong(missKey)              // bad sprite + shake + half a heart, records the miss
MC.note(missKey)               // records a miss with no heart cost
MC.chest(el, pct, {id})        // paints the results reveal, may award a tool
MC.state()                     // { tools, cleared, misses } — for the hub
```

`shake` is a selector for the element to shake on a wrong answer; science passes
`null` because it already shakes its own card. `lift` is a selector for a fixed
bottom bar the HUD must sit above — only vocabulary needs it, and a
ResizeObserver keeps up as that bar grows.

## The dragon

`boss: pct >= 100 && halves === 20` in `clear()`. Any level, played perfectly —
full score and not a single heart lost — drops the ender dragon into the chest
reveal. It repeats every time it's earned; it is not a one-time unlock and it is
not tied to specific levels. The `{boss:true}` arguments still sitting at some
call sites are vestigial and ignored.

If you add an app, check what a zero-mistake run actually scores before trusting
this. The vocabulary app scored a flawless sheet at 25% because its `tries`
counter only moved on wrong answers — see the fix in `build_theme.py`.

## Storage

One key, `mc.study.v1`, shared across all four apps because they're one origin:

```json
{ "cleared": { "spelling:l1": 100 }, "misses": { "spelling": { "committee": 2 } }, "tool9": false }
```

Corrupt or absent JSON falls back to an empty state rather than throwing.
`MC.reset()` clears it from the console.

## Preparing sprites

The delivered art arrives as large lossy renders on a solid colour field, not as
clean transparent PNGs. `boss-defeated.png` needed this treatment and any
replacement will too:

1. **Find the native grid.** Measure horizontal runs of similar colour — they
   cluster at the block size (6px for the boss, so 474×340 was really 79×57).
2. **Snap to it,** taking the *median* colour of each block's interior. This is
   what kills the compression noise; a plain resize keeps it.
3. **Key out the background** on the snapped image, generous tolerance. The
   subjects are dark and the fields are bright, so they're far apart in colour
   space — but keying the *raw* file leaves fringing, because the noise smears
   the background across thousands of near-shades.
4. **Quantize** the result to ~20 colours, despeckle orphaned pixels, crop to
   the bounding box, and upscale nearest-neighbour to an integer multiple.

The current boss came in at 256×92 with 3,861 colours and 1,131 antialiased edge
pixels — real transparency this time, but still "pixel-art look" rather than a
clean integer upscale, so block scoring found no sharp minimum and block-2 was
the faithful read. Cleaned to 125×44 native → 2× → 250×88, 24 colours, 5 KB.

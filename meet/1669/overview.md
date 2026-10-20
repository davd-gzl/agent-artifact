# A test bench for the camera effects, in `src/frontend-tools`
PR: [suitenumerique/meet#1669](https://github.com/suitenumerique/meet/pull/1669)

## TLDR

Meet can redraw the camera picture before it leaves the browser: blur the
background, replace it, draw glasses on a face. Nobody could say which of the
four effects costs the most. After this change a developer runs a separate
small app from the source tree, ticks the effects, and gets one table measuring
each of them over the same camera, one after another.

## How an effect starts in the app

This is the before, and the change leaves it as it is. The effects panel builds
a processor through
[`getProcessor`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend/src/features/rooms/livekit/components/blur/index.ts#L53-L59),
the `@livekit/track-processors` library where the browser supports it and
Meet's own canvas blur where it does not, and hands it to the camera with
`setProcessor`, as
[`FunnyEffects.tsx`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend/src/features/rooms/livekit/components/effects/FunnyEffects.tsx#L56)
does for the glasses. `setProcessor` starts the processor against an empty
video element and attaches the camera only afterwards. The order matters:
Meet's processors begin drawing on the element's `loadeddata` event, in
[`BackgroundCustomProcessor.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend/src/features/rooms/livekit/components/blur/BackgroundCustomProcessor.ts#L145)
and
[`FaceLandmarksProcessor.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend/src/features/rooms/livekit/components/blur/FaceLandmarksProcessor.ts#L118),
and an element that already holds data never fires it again, so the effect
sends black pictures. Nothing in the app measures any of it.

## A second app beside the frontend

After, `src/frontend-tools` is its own Vite app, served on port 3001 by
[`make run-frontend-tools`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/Makefile#L240-L242).
It ships nowhere: the production frontend gains no route and no code. It
imports the real processors from `src/frontend` through the same `@/` alias,
and reuses that tree's `public/` for models and background pictures, per
[`vite.config.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/vite.config.ts#L87-L90).
[`main.tsx`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/main.tsx#L6-L12)
renders the page with none of Meet's providers, analytics or translations, so
they cannot skew the numbers.

## Measuring the library production runs

A number taken on another `livekit-client` says nothing about production, so
the config
[refuses to start](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/vite.config.ts#L55-L65)
when a package installed in the bench's `node_modules` carries another version
than the one
[production's lockfile](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/vite.config.ts#L26-L30)
records. It compares what is installed, so a stale install fails as well as a
wrong pin. It looks at the top level of each `node_modules` for every package
both apps declare, and
[one level down](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/vite.config.ts#L45-L53)
each runtime package's own dependencies: `jose` and `loglevel` arrive through
`livekit-client`. The bench holds those transitive packages at production's
versions through its
[`overrides`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/package.json#L31-L39),
seven entries, each equal to the version in `src/frontend/package-lock.json`.
Dev tools both apps declare are checked too, which is why the bench's
[`vitest`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/package.json#L29)
reads 5.0.2, the
[frontend's](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend/package.json#L76).
Then
[`dedupe`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/vite.config.ts#L91-L94)
makes the imported processors load the bench's single copy of each package.

## How a run works, in 5 steps

After, as
[`runBenchmark`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L371)
drives it, with the defaults from
[`types.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/types.ts#L64-L72):
720p at 30 fps, 2 passes.

1. The camera opens once for the whole session, while the page reads
   [Opening the camera and collecting machine specs](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchPage.tsx#L69-L71).
2. Each effect gets
   [a copy of the camera track](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L92)
   and two fresh video elements, since the library's fast path consumes the
   track it is handed and a reused element already holds data.
3. [`initThenAttach`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/sequencing.ts#L24-L30)
   starts the effect, then attaches and plays the copy, the order
   `setProcessor` uses.
4. The bench waits for the first redrawn picture, settles 3 s, measures 15 s,
   stops the effect and rests 2 s. A pass during which the tab was hidden
   at any moment is
   [discarded](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L234-L238)
   with a message asking to keep the tab in front. The code's comment gives
   the reason, a hidden tab slowing the browser's callbacks, which this
   overview did not measure.
5. The second pass
   [runs the list backwards](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L398),
   so a machine warming up favours neither end. One row per effect averages
   the passes that did not fail.

The page shows an estimate,
[settle plus measure plus rest, times effects, times passes](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchPage.tsx#L210-L217).
Mirrored in python at the defaults, it reads 40 s for one effect, 80 s for the
two LiveKit effects
[ticked on load](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchPage.tsx#L182-L184)
and 160 s for all four. Opening the camera and each effect's start-up are
extra.

## What the table measures

After, the counters in `collectors.ts` watch two costs. Fewer redrawn pictures
reach the other people in the meeting, counted
[per picture shown](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/collectors.ts#L34).
And the effect runs on the thread that draws the page, so the bench times
[the page's own drawing loop](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/collectors.ts#L161)
and
[the long tasks](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/collectors.ts#L195)
the browser reports.

**Gaps count the window's edges.** The pictures and the drawing loop are
reported as gaps between timestamps, and
[`summarizeWindow`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/stats.ts#L50-L56)
adds the start and the end of the measuring window as two more. An effect that
stops sending halfway then shows the stall in its slowest gaps, and one that
never sends reports the whole window as one gap.

**Start-up is cold, then warm.** It runs from `init()` to the first redrawn
picture. Cold is
[pass 0's](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L312),
which downloads the model unless an earlier effect of the same pass fetched
it, and stays empty when pass 0 failed. Warm
[averages every later pass](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L313-L315).

**Long tasks are empty where the browser reports none.** The three long-task
columns
[average only the passes](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L303-L305)
whose browser supports them, since averaging the zeroes another browser yields
would read as an effect that never blocks.

**Memory takes the worst pass.** The column shows the
[highest heap](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L317)
across passes, since a leak grows in the later ones. The
[README](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/README.md?plain=1#L71-L74)
says Chromium coarsens that figure unless launched with
`--enable-precise-memory-info`.

**The camera size is stated above the table.** The size is only
[asked for as an ideal](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L355-L357),
so a camera without that mode runs at its own size with no error.
[`describeSource`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchPage.tsx#L42-L56)
prints the size and rate the camera delivered, and the requested size beside
it when the two differ.

## Graphics chip or main processor

After, two columns say where an effect ran, and they are not equally strong.
Rendering is observed: during a run the bench
[wraps `getContext`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/collectors.ts#L274-L278)
and records each drawing surface the browser granted, `webgl` on the chip, `2d`
off it. Inference is declared: it repeats the MediaPipe setting each entry of
[`contenders.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/contenders.ts#L37-L39)
states, since MediaPipe never reports a fallback.

To take the chip away,
[`make run-frontend-tools-nogpu`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/Makefile#L244-L264)
opens Chrome with
[three flags](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/Makefile#L257-L259)
on a
[throwaway profile](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/Makefile#L80-L83).
`--disable-gpu` takes the chip away. `--enable-unsafe-swiftshader` gives the
page a software WebGL, which the
[README](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/README.md?plain=1#L114-L116)
says Chrome 137 and later no longer fall back to on their own.
`--enable-precise-memory-info` makes the memory column usable. The profile is
needed because a Chrome already running on the usual profile takes a second
launch as a new tab and drops the flags. The machine panel then
[flags software rendering](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/systemSpecs.ts#L53-L54)
when the chip's name matches SwiftShader or llvmpipe.

## The parts, at a glance

After, all new.

| Part | File | Job |
| --- | --- | --- |
| Page | [`ProcessorBenchPage.tsx`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchPage.tsx#L177) | machine panel, controls, previews, camera line, table |
| Run loop | [`ProcessorBenchmark.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L371) | one camera, each effect in turn, the report |
| Effects | [`contenders.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/contenders.ts#L27) | the four shipped effects; a fifth is one more entry |
| Counters | [`collectors.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/collectors.ts#L34) | pictures, drawing loop, long tasks, memory, surfaces |
| Statistics | [`stats.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/stats.ts#L50-L56) | gaps, percentiles, pictures per second |
| Machine | [`systemSpecs.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/systemSpecs.ts#L223) | cores, memory, browser, graphics chip, battery |
| Start order | [`sequencing.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/sequencing.ts#L24-L30) | start then attach, giving up on Stop |
| Settings | [`options.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/options.ts#L6-L7) | measuring 3 to 120 s, 1 to 6 passes |
| Version guard | [`vite.config.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/vite.config.ts#L55-L65) | installed versions against production's lockfile |
| CI | [`test-front-tools`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/.github/workflows/ci.yml#L226-L254) | prettier, build, vitest on the three camera-free modules |

## What it leaves open

- Which chip MediaPipe ran a model on: declared only, and nothing reads it.
- Long tasks and memory outside Chromium: the counters
  [check support](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/collectors.ts#L14-L16)
  and leave the cells empty where the browser offers neither.
- Memory on a run with the chip: only the no-GPU target passes
  `--enable-precise-memory-info`, and the
  [README](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/README.md?plain=1#L73-L74)
  asks the developer to launch Chrome with it by hand.
- The page and the counters: no test reaches them, since they need a camera.

## Words used here

| Name | What it is |
| --- | --- |
| track processor | an object that redraws each camera picture and hands on the redrawn stream |
| long task | a stretch over 50 ms the page's thread spent on one job; blocking time sums the part past 50 ms, [per task](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/collectors.ts#L225) |
| rAF | `requestAnimationFrame`, the browser calling the page once per screen refresh, about 16.7 ms at 60 Hz |
| `requestVideoFrameCallback` | the browser calling the page once per video picture shown |
| pass | one sweep over every ticked effect; a run is one effect in one pass |
| measuring window | the 15 s by default during which the counters record, after the 3 s of settling |
| cold, warm start-up | the start-up of pass 0, and the mean over the passes after it |
| `overrides` | the `package.json` field forcing the version of a package another package pulls in |
| MediaPipe delegate | `GPU` or `CPU`, the chip MediaPipe is asked to use, which it can quietly overrule |
| software rendering | the browser imitating a graphics chip in ordinary code, so its numbers say nothing about a real chip |
| SwiftShader | Chrome's own software rendering |

<details><summary>Read the code in this order</summary>

`hot` is the risky code to read closely, `warm` other code, `cold` a test or a
generated file.

### 1. `hot` · The version guard, [`src/frontend-tools/vite.config.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/vite.config.ts#L55-L65)
Stops the bench when an installed package drifts from what production locks.
**If wrong:** the table measures a library production does not run.
```ts
for (const name of checked) {
  const tools = installedVersion(toolsModules, name)
  const shipped = shippedPackages[`node_modules/${name}`]?.version
  if (tools && shipped && tools !== shipped) {
```

### 2. `warm` · The start order, [`src/frontend-tools/src/processor-bench/sequencing.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/sequencing.ts#L24-L30)
Starts the effect before the camera reaches its element.
**If wrong:** every effect measures black pictures.
```ts
  await steps.init()
  steps.attach()
  await steps.play()
```

### 3. `hot` · One run, [`src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L92)
Gives each effect its own copy of the camera.
**If wrong:** the second effect starts on a consumed track.
```ts
  const sourceClone = ctx.sourceTrack.clone()
```

### 4. `hot` · One row, [`src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts#L303-L315)
Folds an effect's passes into the table's row.
**If wrong:** a warm start-up reads as cold, or a browser without long tasks
reads as an effect that never blocks.
```ts
  const longTaskRuns = good.filter((run) => run.longTasks.supported)
  // ...
    coldStartupMs: ordered[0]?.pass === 0 ? ordered[0].startupMs : null,
    warmStartupMs: averageOf(
      ordered.filter((run) => run.pass > 0).map((run) => run.startupMs)
    ),
```

### 5. `warm` · The window's edges, [`src/frontend-tools/src/processor-bench/stats.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/stats.ts#L50-L56)
Counts the wait before the first picture and after the last as gaps.
**If wrong:** an effect that stalls reports only the gaps before the stall.
```ts
  return summarizeIntervals([startMs, ...timestamps, endMs])
```

### 6. `warm` · The counters, [`src/frontend-tools/src/processor-bench/collectors.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/collectors.ts#L225)
Turn browser callbacks into the table's columns.
**If wrong:** a column reports a number the browser never measured.
```ts
      (sum, d) => sum + Math.max(0, d - LONG_TASK_THRESHOLD_MS),
```

### 7. `warm` · The effects, [`src/frontend-tools/src/processor-bench/contenders.ts`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/src/frontend-tools/src/processor-bench/contenders.ts#L27)
Builds each shipped processor the way the app does.
**If wrong:** the bench measures an effect configured unlike production.

### 8. `hot` · The launcher without a chip, [`Makefile`](https://github.com/suitenumerique/meet/blob/ac2bdf2d43bcac26f7b2db4f6b7eb32655554997/Makefile#L257-L260)
Opens Chrome with no graphics chip, a software WebGL and exact memory figures.
**If wrong:** a run meant to lack the chip measures the chip, or no WebGL at
all.
```make
		--disable-gpu \
		--enable-unsafe-swiftshader \
		--enable-precise-memory-info \
		--user-data-dir="$(BENCH_NOGPU_PROFILE)" \
```

</details>

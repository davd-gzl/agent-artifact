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
[`getProcessor`](https://github.com/Villaquiranm/meet/blob/5166d8904c41a65b467c234e3f7e164c8cd6dede/src/frontend/src/features/rooms/livekit/components/blur/index.ts#L53-L59),
the `@livekit/track-processors` library where the browser supports it and
Meet's own canvas blur where it does not, and hands it to the camera with
`setProcessor`, as
[`FunnyEffects.tsx`](https://github.com/Villaquiranm/meet/blob/5166d8904c41a65b467c234e3f7e164c8cd6dede/src/frontend/src/features/rooms/livekit/components/effects/FunnyEffects.tsx#L56)
does for the glasses. `setProcessor` starts the processor against an empty
video element and attaches the camera only afterwards. The order matters:
Meet's processors begin drawing on the element's `loadeddata` event, in
[`BackgroundCustomProcessor.ts`](https://github.com/Villaquiranm/meet/blob/5166d8904c41a65b467c234e3f7e164c8cd6dede/src/frontend/src/features/rooms/livekit/components/blur/BackgroundCustomProcessor.ts#L139)
and
[`FaceLandmarksProcessor.ts`](https://github.com/Villaquiranm/meet/blob/5166d8904c41a65b467c234e3f7e164c8cd6dede/src/frontend/src/features/rooms/livekit/components/blur/FaceLandmarksProcessor.ts#L118),
and an element that already holds data never fires it again, so the effect
sends black pictures. Nothing in the app measures any of it.

## A second app beside the frontend

After, `src/frontend-tools` is its own Vite app, served on port 3001 by
[`make run-frontend-tools`](https://github.com/suitenumerique/meet/pull/1669/files#diff-76ed074a9305c04054cdebb9e9aad2d818052b07091de1f20cad0bbac34ffb52R241-R243).
It ships nowhere: the production frontend gains no route and no code. It
imports the real processors from `src/frontend` through the same `@/` alias,
and reuses that tree's `public/` for models and background pictures, per
[`vite.config.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-1686ea23277dea5e3d2d0a179538d631816a0bc665c869c0cb314621b0705995R56-R59).
Two guards keep the measurement honest. The config
[refuses to start](https://github.com/suitenumerique/meet/pull/1669/files#diff-1686ea23277dea5e3d2d0a179538d631816a0bc665c869c0cb314621b0705995R20-R33)
when a package both apps declare carries two different versions, since a number
taken on another `livekit-client` says nothing about production. And
[`dedupe`](https://github.com/suitenumerique/meet/pull/1669/files#diff-1686ea23277dea5e3d2d0a179538d631816a0bc665c869c0cb314621b0705995R60-R63)
makes the imported processors load the bench's single copy of each package.
[`main.tsx`](https://github.com/suitenumerique/meet/pull/1669/files#diff-4441dc0fc58d20ba8a7f8503b49f3a1a25fbe643067fa68fab6f3bdd3cce8598R6-R12)
renders the page with none of Meet's providers, analytics or translations, so
they cannot skew the numbers.

## How a run works, in 5 steps

After, as
[`runBenchmark`](https://github.com/suitenumerique/meet/pull/1669/files#diff-865a4ce256ca02a1065b3431bcafdd4f013a80727f187851b7cfe8ab292aa783R341)
drives it, with the defaults from
[`types.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-0325b5aa086a9d410a7db34fa50018ce3435841ece5fd857bc33791d86e20f05R64-R72):
720p at 30 fps, 2 passes.

1. The camera opens once for the whole session.
2. Each effect gets
   [a copy of the camera track](https://github.com/suitenumerique/meet/pull/1669/files#diff-865a4ce256ca02a1065b3431bcafdd4f013a80727f187851b7cfe8ab292aa783R90-R92)
   and two fresh video elements, since the library's fast path consumes the
   track it is handed and a reused element already holds data.
3. [`initThenAttach`](https://github.com/suitenumerique/meet/pull/1669/files#diff-3bff1ee65edf1973cd96c1ac4303edb04a0f5376394669eacb71095c21ee694fR24-R30)
   starts the effect, then attaches and plays the copy, the order
   `setProcessor` uses.
4. The bench waits for the first redrawn picture, settles 3 s, measures 15 s,
   stops the effect and rests 2 s.
5. The second pass
   [runs the list backwards](https://github.com/suitenumerique/meet/pull/1669/files#diff-865a4ce256ca02a1065b3431bcafdd4f013a80727f187851b7cfe8ab292aa783R367),
   so a machine warming up favours neither end. One row per effect averages
   the passes that did not fail.

The page shows an estimate,
[settle plus measure plus rest, times effects, times passes](https://github.com/suitenumerique/meet/pull/1669/files#diff-494c081d6200e3090a6ace71088469c018fd25648817947325aecbf1401579b6R187-R194).
Mirrored in python at the defaults, it reads 40 s for one effect, 80 s for the
two LiveKit effects
[ticked on load](https://github.com/suitenumerique/meet/pull/1669/files#diff-494c081d6200e3090a6ace71088469c018fd25648817947325aecbf1401579b6R159-R161)
and 160 s for all four. Each effect's start-up is extra.

## What the table measures

After, the counters in
[`collectors.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-68d5b4dc6806c3e4c5a6fe43e98444590e503bf48fb5f32ca0dd688e09773fa1R28-R62)
watch two costs. Fewer redrawn pictures reach the other people in the meeting,
counted per picture shown. And the effect runs on the thread that draws the
page, so the bench times the page's own drawing loop and the long tasks the
browser reports. Start-up is reported cold, the first run, which downloads the
model, and warm, the second. Memory takes the
[worst pass](https://github.com/suitenumerique/meet/pull/1669/files#diff-865a4ce256ca02a1065b3431bcafdd4f013a80727f187851b7cfe8ab292aa783R291),
since a leak grows in the later ones.

## Graphics chip or main processor

After, two columns say where an effect ran, and they are not equally strong.
Rendering is observed: during a run the bench
[wraps `getContext`](https://github.com/suitenumerique/meet/pull/1669/files#diff-68d5b4dc6806c3e4c5a6fe43e98444590e503bf48fb5f32ca0dd688e09773fa1R262-R270)
and records each drawing surface the browser granted, `webgl` on the chip, `2d`
off it. Inference is declared: it repeats the MediaPipe setting each entry of
[`contenders.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-cd03dde81a101873071d9104459dab13ee4deeb4b6b1b348d2bcd3bad435521aR27)
states, since MediaPipe never reports a fallback. To take the chip away,
[`make run-frontend-tools-nogpu`](https://github.com/suitenumerique/meet/pull/1669/files#diff-76ed074a9305c04054cdebb9e9aad2d818052b07091de1f20cad0bbac34ffb52R245-R263)
opens Chrome with `--disable-gpu` on a
[throwaway profile](https://github.com/suitenumerique/meet/pull/1669/files#diff-76ed074a9305c04054cdebb9e9aad2d818052b07091de1f20cad0bbac34ffb52R79-R83):
a Chrome already running on the usual profile takes a second launch as a new
tab and drops the flag. The machine panel then
[flags software rendering](https://github.com/suitenumerique/meet/pull/1669/files#diff-c92cf997bd7afcbc6e84d96c7822eb5c8e2a41fd48d3d498fcc9a6bc3faa8cb5R54)
when the chip's name matches SwiftShader or llvmpipe.

## The parts, at a glance

After, all new.

| Part | File | Job |
| --- | --- | --- |
| Page | [`ProcessorBenchPage.tsx`](https://github.com/suitenumerique/meet/pull/1669/files#diff-494c081d6200e3090a6ace71088469c018fd25648817947325aecbf1401579b6) | machine panel, controls, previews, table |
| Run loop | [`ProcessorBenchmark.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-865a4ce256ca02a1065b3431bcafdd4f013a80727f187851b7cfe8ab292aa783) | one camera, each effect in turn, the report |
| Effects | [`contenders.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-cd03dde81a101873071d9104459dab13ee4deeb4b6b1b348d2bcd3bad435521a) | the four shipped effects; a fifth is one more entry |
| Counters | [`collectors.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-68d5b4dc6806c3e4c5a6fe43e98444590e503bf48fb5f32ca0dd688e09773fa1) | pictures, drawing loop, long tasks, memory, surfaces |
| Machine | [`systemSpecs.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-c92cf997bd7afcbc6e84d96c7822eb5c8e2a41fd48d3d498fcc9a6bc3faa8cb5R223) | cores, memory, browser, graphics chip, battery |
| Start order | [`sequencing.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-3bff1ee65edf1973cd96c1ac4303edb04a0f5376394669eacb71095c21ee694f) | start then attach, giving up on Stop |
| Settings | [`options.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-7a2ba7d950890f95f980d98d5d017b96974b9842ab8fad27ed01aa593ab1c8cfR6-R7) | measuring 3 to 120 s, 1 to 6 passes |
| CI | [`test-front-tools`](https://github.com/suitenumerique/meet/pull/1669/files#diff-b803fcb7f17ed9235f1e5cb1fcd2f5d3b2838429d4368ae4c57ce4436577f03fR199-R220) | prettier, build, vitest on the three camera-free modules |

## What it leaves open

- Which chip MediaPipe ran a model on: declared only, and nothing reads it.
- Long tasks and memory outside Chromium: the counters
  [check support](https://github.com/suitenumerique/meet/pull/1669/files#diff-68d5b4dc6806c3e4c5a6fe43e98444590e503bf48fb5f32ca0dd688e09773fa1R14)
  and mark the result unsupported where the browser offers neither.
- The page and the counters: no test reaches them, since they need a camera.

## Words used here

| Name | What it is |
| --- | --- |
| track processor | an object that redraws each camera picture and hands on the redrawn stream |
| long task | a stretch over 50 ms the page's thread spent on one job; blocking time sums the part past 50 ms, [per task](https://github.com/suitenumerique/meet/pull/1669/files#diff-68d5b4dc6806c3e4c5a6fe43e98444590e503bf48fb5f32ca0dd688e09773fa1R213) |
| rAF | `requestAnimationFrame`, the browser calling the page once per screen refresh, about 16.7 ms at 60 Hz |
| `requestVideoFrameCallback` | the browser calling the page once per video picture shown |
| pass | one sweep over every ticked effect; a run is one effect in one pass |
| MediaPipe delegate | `GPU` or `CPU`, the chip MediaPipe is asked to use, which it can quietly overrule |
| software rendering | the browser imitating a graphics chip in ordinary code, so its numbers say nothing about a real chip |

<details><summary>Read the code in this order</summary>

`hot` is the risky code to read closely, `warm` other code, `cold` a test or a
generated file. This change has no `hot` file.

### 1. `warm` · The version guard, [`src/frontend-tools/vite.config.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-1686ea23277dea5e3d2d0a179538d631816a0bc665c869c0cb314621b0705995R20-R33)
Stops the bench when a shared package drifts from what production ships.
**If wrong:** the table measures a library production does not run.
```ts
for (const field of ['dependencies', 'devDependencies'] as const) {
  for (const [name, version] of Object.entries(toolsPackage[field])) {
    const shipped =
      frontendPackage.dependencies[name] ??
      frontendPackage.devDependencies[name]
    if (shipped && shipped !== version) {
```

### 2. `warm` · The start order, [`src/frontend-tools/src/processor-bench/sequencing.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-3bff1ee65edf1973cd96c1ac4303edb04a0f5376394669eacb71095c21ee694fR24-R30)
Starts the effect before the camera reaches its element.
**If wrong:** every effect measures black pictures.
```ts
  await steps.init()
  steps.attach()
  await steps.play()
```

### 3. `warm` · One run, [`src/frontend-tools/src/processor-bench/ProcessorBenchmark.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-865a4ce256ca02a1065b3431bcafdd4f013a80727f187851b7cfe8ab292aa783R90-R92)
Gives each effect its own copy of the camera.
**If wrong:** the second effect starts on a consumed track.
```ts
  const sourceClone = ctx.sourceTrack.clone()
```

### 4. `warm` · The counters, [`src/frontend-tools/src/processor-bench/collectors.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-68d5b4dc6806c3e4c5a6fe43e98444590e503bf48fb5f32ca0dd688e09773fa1R213)
Turn browser callbacks into the table's columns.
**If wrong:** a column reports a number the browser never measured.
```ts
      (sum, d) => sum + Math.max(0, d - LONG_TASK_THRESHOLD_MS),
```

### 5. `warm` · The effects, [`src/frontend-tools/src/processor-bench/contenders.ts`](https://github.com/suitenumerique/meet/pull/1669/files#diff-cd03dde81a101873071d9104459dab13ee4deeb4b6b1b348d2bcd3bad435521aR27)
Builds each shipped processor the way the app does.
**If wrong:** the bench measures an effect configured unlike production.

</details>

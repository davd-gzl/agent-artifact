# Review: [#1378](https://github.com/suitenumerique/meet/pull/1378)
Event: REQUEST_CHANGES
Verify: [10f83ed4836deaf6cd932ef4b5d23487d9fcaead](https://github.com/alexandrebayssiere7-cmd/meet/commit/10f83ed4836deaf6cd932ef4b5d23487d9fcaead)

## Body
The pipeline is a step up; what surrounds it is not ready.

## src/frontend/src/features/rooms/livekit/components/blur/AdvancedMattingProcessor.ts:242-251 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/AdvancedMattingProcessor.ts#L242-L251)
Critical: the published track drops to the size of the model being timed, 256x256 or 256x144, because the render loop starts at L186 ahead of `_loadSegmenter` at L189 and `RenderLoopRunner` resizes the output canvas to each calibration bitmap. These pairs also carry `procW: this.processingWidth`, still the 256x144 default from L61-62, so multiclass's 65536-value mask uploads as 256x144.

## src/frontend/src/features/rooms/livekit/components/blur/renderers/Canvas2dRenderer.ts:159 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/Canvas2dRenderer.ts#L159)
Critical: `pair.source` arrives vertically flipped, built as `createImageBitmap(snapshot, { imageOrientation: 'flipY' })` at [SegmenterLoopRunner.ts:120-122](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/segmenters/SegmenterLoopRunner.ts#L120-L122) for WebGL2's bottom-up texture space, and [the WebGL2 renderer undoes it](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/WebGl2Renderer.ts#L357) where this `drawImage` and the one at L174 do not, so the fallback publishes an upside-down picture from the first mask onward.

<details><summary>repro</summary>

```js
// in the browser console, on any page:
const snap = document.createElement('canvas'); snap.width = 4; snap.height = 4
const sc = snap.getContext('2d')
sc.fillStyle = 'red';  sc.fillRect(0, 0, 4, 2)   // top half
sc.fillStyle = 'blue'; sc.fillRect(0, 2, 4, 2)   // bottom half
const bmp = await createImageBitmap(snap, { imageOrientation: 'flipY' })
const out = document.createElement('canvas'); out.width = 4; out.height = 4
const oc = out.getContext('2d')
oc.drawImage(bmp, 0, 0, 4, 4)                    // Canvas2dRenderer.render()
console.log('snapshot top row', sc.getImageData(0, 0, 1, 1).data.slice(0, 3).join(','))
console.log('output   top row', oc.getImageData(0, 0, 1, 1).data.slice(0, 3).join(','))
```

The output's top row is the snapshot's bottom row:

```
snapshot top row 255,0,0
output   top row 0,0,255
```

`_drawPassthrough` hands the `<video>` element itself to the renderer rather than a bitmap, so the picture is the right way up until the first mask lands and flips from then on.
</details>

## src/frontend/src/features/rooms/livekit/components/blur/AdvancedMattingProcessor.ts:281-299 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/AdvancedMattingProcessor.ts#L281-L299)
Critical: both renderers are handed `this.outputCanvas!`, and [`WebGl2Renderer.init` takes the webgl2 context on its first statement](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/WebGl2Renderer.ts#L105-L107) before the `try` that builds the programs and textures, so every failure except a missing context leaves the canvas claimed and [the fallback's `getContext('2d')`](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/Canvas2dRenderer.ts#L39) returns null; the throw reaches the outer catch at L190-197 and `processedTrack = this.source` sends the room the unprocessed camera.

<details><summary>repro</summary>

```js
// in the browser console, on any page:
const a = document.createElement('canvas')
console.log('webgl2 then 2d:', !!a.getContext('webgl2'), a.getContext('2d'))
const b = document.createElement('canvas')
console.log('2d then webgl2:', !!b.getContext('2d'), b.getContext('webgl2'))
```

The second call returns null in both orders, so the fallback needs its own canvas:

```
webgl2 then 2d: true null
2d then webgl2: true null
```
</details>

## src/frontend/src/features/rooms/livekit/components/blur/AdvancedMattingProcessor.ts:190-197 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/AdvancedMattingProcessor.ts#L190-L197)
This push overwrites the `error` entry [the renderer already made](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/Canvas2dRenderer.ts#L41-L44), since `pushMattingError` replaces by code and [the panel renders `error` only](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/effects/EffectsConfiguration.tsx#L626-L627), and the catch covers the video wait, canvas creation, virtual background init, renderer init and `captureStream` under the one code.

## src/frontend/src/features/rooms/livekit/components/blur/segmenters/Segmenter.ts:76-77 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/segmenters/Segmenter.ts#L76-L77)
The runtime here, and the weights at [LandscapeSegmenter.ts:5](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/segmenters/LandscapeSegmenter.ts#L4-L5) and [MulticlassSegmenter.ts:5](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/segmenters/MulticlassSegmenter.ts#L4-L5), come from jsDelivr and Google with no version on any of the three addresses, while [`vite.config.ts`](https://github.com/suitenumerique/meet/blob/main/src/frontend/vite.config.ts#L49-L50) already copies that runtime out of `node_modules` into a version-stamped path and [throws at config load](https://github.com/suitenumerique/meet/blob/main/src/frontend/vite.config.ts#L19-L24) if the installed version drifts from what `@livekit/track-processors` declares, and `public/assets/mediapipe/models/` already holds the landscape weights byte for byte; with both hosts unreachable the segmenter never initialises and [the passthrough mask](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/preprocessing/MattingCanvasManager.ts#L122-L127) composites the camera unblurred.

<details><summary>what the AUTO path fetches</summary>

```bash
# from any shell:
for u in \
  https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm \
  https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite \
  https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite ; do
  curl -s -o /dev/null -w '%{size_download}\t%{url_effective}\n' -L "$u"
done
```

```
11756954	https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm
250177	https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite
16371837	https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite
```

28.4 MB from two third-party hosts before the first composited frame. `data.jsdelivr.com` resolves the unversioned path to 1.0.1 today; `npm ls @mediapipe/tasks-vision` in `src/frontend` installs 0.10.14. Loading 0.10.14's JS against the 1.0.1, 0.10.35 and 0.10.20 runtimes in Chromium initialised an `ImageSegmenter` in all three, so the skew breaks nothing today and nothing in the repository holds it still.
</details>

## src/frontend/src/features/rooms/livekit/components/blur/AdvancedMattingProcessor.ts:383 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/AdvancedMattingProcessor.ts#L383)
`AUTO` is the only value the app produces, so every join downloads the 16.4 MB multiclass model, and benchmarks it wherever the GPU delegate probe succeeds, before `_calibrateMulticlass` may destroy it for the 250 KB landscape one, and the verdict reaches `this.currentModel` at L421 and nowhere else. Google serves that model with `cache-control: public, max-age=3600`, so a machine already measured as too slow re-benchmarks on every join and re-downloads an hour after the last one.

## src/frontend/src/features/rooms/livekit/components/blur/preprocessing/MattingCanvasManager.ts:97-113 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/preprocessing/MattingCanvasManager.ts#L97-L113)
`createCanvas` at L139-145 never inserts the canvas into the document, so this `querySelector` always misses and `sizeSource` allocates a fresh canvas and 2D context on every inference at L65, though the class keeps and reuses `_snapshotCanvas` and `_motionCanvas` the same way.

## src/frontend/src/features/rooms/livekit/components/effects/EffectsConfiguration.tsx:39-41 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/effects/EffectsConfiguration.tsx#L39-L41)
Renumbering these two values orphans what the shipped build already wrote to `lk-user-choices`, because `deriveIdFromProcessorConfig` keys the selection on `blur-${blurRadius}` at L76-78.

- A stored 5 lights nothing, and the blur keeps running. Clearing an effect needs a click on the selected tile at L219-222, so the first click applies `blur-10` instead of turning it off.
- A stored 10 lights the light tile where the user chose strong.

The two old values would map in [the normalisation block this branch adds](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/stores/userChoices.ts#L39-L51).

## CHANGELOG.md:13 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/CHANGELOG.md?plain=1#L13)
This hunk also removes the released `## [1.18.0] - 2026-06-03` section with its five entries, plus one more under `[Unreleased]`, and [L44](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/CHANGELOG.md?plain=1#L44) files a second entry for this work inside the released `## [1.16.0] - 2026-05-13`.

## src/frontend/src/features/rooms/livekit/components/blur/segmenters/SegmenterLoopRunner.ts:37-40 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/segmenters/SegmenterLoopRunner.ts#L37-L40)
`stop()` clears a flag that `start()` sets again, so an iteration parked in `await seg.segment(...)` at L125 resumes, re-tests `while (this._segLoopActive)` at L46 and keeps going alongside the loop `restart()` just started; the parked iteration can check a generation number captured in `start()`. `_destroyed` has the same shape: [`init()` clears it at L111](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/AdvancedMattingProcessor.ts#L111) and `_loadSegmenter` re-arms `_pendingModel` to the value it was already cancelling on.

## src/frontend/src/features/rooms/livekit/components/blur/renderers/RenderLoopRunner.ts:53 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/RenderLoopRunner.ts#L53)
A throw from `_renderFrame()` reaches nothing before the tail call to `_scheduleRender()`, so one throw ends rendering for the rest of the session while `captureStream` keeps sending the last composited picture, and `Canvas2dRenderer` throws on a null 2D context from both calls `_renderFrame` makes, `_ensureScratchCanvases` inside `render()` and `_allocMaskBuffers` inside `uploadMask`.

## src/frontend/src/features/rooms/livekit/components/blur/renderers/RenderLoopRunner.ts:38 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/RenderLoopRunner.ts#L38)
This `requestAnimationFrame` callback paints every frame the room receives, and [MDN records that rAF is paused in background tabs](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame), so a participant who switches away freezes on their last composited frame for everyone else in the meeting. The path this replaces kept running on Chrome and Edge, where `ProcessorWrapper` drives a `MediaStreamTrackProcessor` whenever `hasModernApiSupport` is true and reaches `requestAnimationFrame` only in its fallback.

<details><summary>what else is on the same clock</summary>

[`VideoFrameTracker`](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/preprocessing/VideoFrameTracker.ts#L94-L96) drives on `requestVideoFrameCallback` and [`SegmenterLoopRunner`](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/segmenters/SegmenterLoopRunner.ts#L60-L65) paces its other branch on `setTimeout`, so all three loops behind the published canvas stop together. [`TimerWorker.ts:45-47`](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/TimerWorker.ts#L44-L47), in this same directory and in this diff, states the premise: the worker exists "to enable use of setInterval that is not throttled when tab is inactive".

Not measured here: headless Chromium reports every page `visible`, so the throttling itself could not be exercised.
</details>

## src/frontend/src/features/rooms/livekit/components/blur/renderers/WebGl2Renderer.ts:347 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/WebGl2Renderer.ts#L347)
Nothing in the branch listens for `webglcontextlost` or checks `gl.isContextLost()`, so a GPU-process crash or driver reset leaves this method drawing into a dead context while the room watches a still frame.

<details><summary>repro</summary>

```js
// in the browser console, on any page:
const c = document.createElement('canvas'); c.width = 640; c.height = 360
const gl = c.getContext('webgl2')
const track = c.captureStream(30).getVideoTracks()[0]
gl.getExtension('WEBGL_lose_context').loseContext()
await new Promise(r => setTimeout(r, 200))
let threw = null
try { gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3) } catch (e) { threw = e.name }
console.log('isContextLost', gl.isContextLost(), 'threw', threw, 'getError', gl.getError())
console.log('track', track.readyState, 'muted', track.muted)
```

Nothing throws, so the section above on a throw ending the loop does not reach this; the loop keeps calling and the track keeps sending:

```
isContextLost true threw null getError 37442
track live muted false
```

`37442` is `CONTEXT_LOST_WEBGL`. `destroy()` at L464 deletes the textures, framebuffers and programs and never releases the context, though 24 create-and-drop cycles produced no `webglcontextlost` event, so contexts do not pile up across restarts.
</details>

## src/frontend/src/features/rooms/livekit/components/blur/renderers/WebGl2Shaders.ts:183 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/WebGl2Shaders.ts#L183)
`texture(uBg, vUv)` samples the background across the whole output and [the Canvas2D path does the same](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/Canvas2dRenderer.ts#L209), so a background whose shape is not the camera's is stretched to fit where `@livekit/track-processors` cropped it with `resizeImageToCover`. The eight presets are all 2048x1152, so this reaches only the upload at [`handleNewBackgroundFilePicked`](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/effects/EffectsConfiguration.tsx#L305), where a portrait phone photo comes out about 2.4 times too wide.

## src/frontend/src/features/rooms/livekit/components/blur/renderers/WebGl2Renderer.ts:420-439 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/WebGl2Renderer.ts#L420-L439)
The catch leaves `this.gf` null and the guard above it is `if (!this.gf)`, so a device missing `EXT_color_buffer_float` rebuilds the filter and pushes an error on every rendered frame, and each push writes into the valtio proxy an open effects panel subscribes to.

## src/frontend/src/features/rooms/livekit/components/blur/errors/MattingErrorStore.ts:43-46 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/errors/MattingErrorStore.ts#L43-L46)
The store is module-level and `dismissMattingError` has one caller, [for `WEBGL2_INIT_FAILED` alone](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/AdvancedMattingProcessor.ts#L296), so a `MEDIAPIPE_INIT_FAILED` from one failed fetch outlives `destroy()`, `restart()` and every later success, and the store is never reset, so the banner stays for the life of the page.

## src/frontend/src/features/rooms/livekit/components/blur/segmenters/SegmenterLoopRunner.ts:53 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/segmenters/SegmenterLoopRunner.ts#L53)
`getSegmenterFrameSkip()` is read only inside the `hasRvfc` branch, so the `FALLBACK_MS` path at L60-65 discards the skip the benchmark spent twenty inferences computing and paces on a 60 Hz timer instead, which is the path Firefox before 132 and Safari before 15.4 take per [MDN](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback#browser_compatibility).

## src/frontend/src/features/rooms/livekit/components/blur/renderers/WebGl2Renderer.ts:541 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/WebGl2Renderer.ts#L541)
This reads `blurRadius` as `Math.max(1, blurRadius / 2)` at half output resolution while [Canvas2D applies it](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/renderers/Canvas2dRenderer.ts#L172) as `blur(${blurRadius}px)` at full resolution, and both are handed the same stored number, so the same setting blurs by different amounts on the two paths.

## src/frontend/src/locales/de/rooms.json:568 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/locales/de/rooms.json#L568)
These 158 lines nest twelve existing top-level blocks a second time under `admin`, though the twelve keys the change needs are already in all four locales.

<details><summary>the key sets</summary>

```bash
# from a local clone of suitenumerique/meet:
git fetch origin pull/1378/head && git checkout FETCH_HEAD
cd src/frontend/src/locales
python3 -c "
import json
def walk(o,p=''):
    if isinstance(o,dict):
        for k,v in o.items(): yield from walk(v,p+'.'+k if p else k)
    else: yield p
ks={l:set(walk(json.load(open(f'{l}/rooms.json')))) for l in ('en','fr','de','nl')}
for l,s in ks.items(): print(l, len(s))
print('de-only:', len(ks['de']-ks['en']))
d=json.load(open('de/rooms.json'))
print('en.admin', sorted(json.load(open('en/rooms.json'))['admin']))
print('de.admin', sorted(d['admin']))
print('de.admin.participants == de.participants:', d['admin']['participants']==d['participants'])
"
```

```
en 437
fr 437
de 533
nl 437
de-only: 96
en.admin ['access', 'description', 'moderation']
de.admin ['access', 'authenticationMessage', 'confirmationMessage', 'description', 'fullScreenWarning', 'moderation', 'openFeedback', 'participantMenu', 'participantTile', 'participantTileFocus', 'participants', 'pinAnnouncements', 'rating', 'recordingStateToast', 'shortcutsPanel']
de.admin.participants == de.participants: True
```

`main`'s `de/rooms.json` holds the same key count as the other three, and nothing under `src/` reads any of the 96.
</details>

## src/frontend/src/features/rooms/livekit/components/blur/index.ts:11-15 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/index.ts#L11-L15)
Nit: `SegmentationModel` is referenced by no `.tsx` file, so `AUTO` is the only value the app can produce and the unknown-value case [the normalisation block guards](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/stores/userChoices.ts#L39-L51) cannot arise. That block still writes `model: "auto"` into the stored choices of every user who had an effect on.

## src/frontend/src/features/rooms/livekit/components/blur/index.ts:60-62 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/index.ts#L60-L62)
Nit: returning the literal makes the second conjunct at [EffectsConfiguration.tsx:227](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/effects/EffectsConfiguration.tsx#L227) always false and the `stopProcessor()` at [L236](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/effects/EffectsConfiguration.tsx#L236) unreachable, under [a comment](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/effects/EffectsConfiguration.tsx#L231-L234) that still cites livekit/track-processors-js#85 as the reason it has to run.

## src/frontend/src/features/rooms/livekit/components/blur/README.md:257 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/README.md?plain=1#L257)
Nit: the multiclass foreground here is `1 − bg_prob`, and [the code sums the five person classes](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/segmenters/MulticlassSegmenter.ts#L21-L29). [L376](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/README.md?plain=1#L376) says a WebGL2 failure passes the raw track through, and it builds a `Canvas2dRenderer` the document never names.

## src/frontend/src/features/rooms/livekit/components/blur/preprocessing/RoiCropper.ts:25-82 [gh](https://github.com/alexandrebayssiere7-cmd/meet/blob/blur-pr/src/frontend/src/features/rooms/livekit/components/blur/preprocessing/RoiCropper.ts#L25-L82)
Missing test: the crop the model sees comes from these two functions, which take a `Float32Array` and plain objects and need no DOM. The test added in f1d8abca was deleted in 590833b4, and the runner with it in bceeb06a.

<details><summary>test cases</summary>

Replaying the deleted file against the head source fails three of its eight cases: it asserts 5% padding where `BBOX_PADDING` is `0.08`, and 0.5 EMA smoothing on both position and size where `stabilizeBbox` hard-snaps with no smoothing term. So the cases worth keeping are not the ones it had:

```ts
import { describe, expect, it } from 'vitest'
import { computePersonBbox, stabilizeBbox } from './RoiCropper'

const mask = (w: number, h: number, fill: (x: number, y: number) => number) => {
  const m = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = fill(x, y)
  return m
}

describe('computePersonBbox', () => {
  it('returns null when nothing is above the threshold', () => {
    expect(computePersonBbox(mask(10, 10, () => 0), 10, 10)).toBeNull()
  })

  it('treats the threshold as strict, so a uniform 0.5 mask is nothing', () => {
    expect(computePersonBbox(mask(10, 10, () => 0.5), 10, 10)).toBeNull()
  })

  it('pads a centred box by 8 percent of the frame', () => {
    const m = mask(10, 10, (x, y) => (x >= 4 && x < 6 && y >= 4 && y < 6 ? 1 : 0))
    expect(computePersonBbox(m, 10, 10)).toMatchObject({ x: 0.32, width: 0.36 })
  })

  it('keeps x + width inside the frame at the right edge', () => {
    const m = mask(10, 10, (x) => (x >= 8 ? 1 : 0))
    const b = computePersonBbox(m, 10, 10)!
    expect(b.x + b.width).toBeLessThanOrEqual(1)
  })
})

describe('stabilizeBbox', () => {
  const cur = { x: 0.4, y: 0.4, width: 0.2, height: 0.2 }

  it('keeps the current box inside the dead zone', () => {
    const next = { ...cur, x: 0.41 }
    expect(stabilizeBbox(cur, next)).toBe(cur)   // same reference, no blend
  })

  it('snaps to the new box outside it', () => {
    const next = { ...cur, x: 0.6 }
    expect(stabilizeBbox(cur, next)).toEqual(next)   // a new object, equal by value
  })
})
```

`vitest.config.ts` needs `panda codegen` to have run, since 150 files import the generated `@/styled-system`, and these two import nothing from it.
</details>

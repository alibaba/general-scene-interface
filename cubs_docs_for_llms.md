# 🐯 Cubs.js – Guide for LLMs and Coding Bots

Lightweight, zero-dependency canvas scene-graph and interaction utilities. Cubs.js does not wrap or replace the Canvas API; it provides a thin layer for scene management, event handling, drawing/editing helpers, and small charting primitives.

- **Design principles**
  - Minimal, modern, composable. Prefer native Canvas API and small helpers.
  - DOM-like events and styles on shapes; familiar ergonomics for web devs.
  - Scene-graph with local coordinates; transforms are composed down the tree.
  - Explicit, cancellable helpers; no hidden global state.

- **Core ideas**
  - A `Scene` owns a `canvas` and renders a tree of `Shape` nodes.
  - A `Shape` has local position/scale; its final transform is computed each frame.
  - Events bubble along the shape tree. Hit-testing is per shape (`hit`).
  - Styles mimic Canvas 2D context properties with a few extensions.
  - Helpers are opt‑in: drawing tools, edit tools, pointer/zoom, FPS control, etc.

## Install

```ts
// ESM
import {
  Scene,
  RectShape,
  // ... other exports
} from 'cubs.js'
```

Outputs (package.json):

- module: `./lib/cubs.js`
- umd: `./lib/cubs.umd.cjs`
- types: `./lib/cubs.d.ts`

## Quick start

```ts
const scene = new Scene(document.querySelector('canvas')!)

const rect = new RectShape(50, 50, 200, 120)
rect.style.fillStyle = 'tomato'
rect.hoverStyle.stroke = true
rect.hoverStyle.strokeStyle = 'black'
rect.hoverStyle.lineWidth = 2

rect.addEventListener('pointerdown', (e) => {
  console.log('down on rect', e.hitResult)
})

scene.add(rect)
```

---

## Core API

### Scene

Constructor and fields

- `new Scene(canvas: HTMLCanvasElement)`
- `canvas: HTMLCanvasElement`
- `ctx: CanvasRenderingContext2D`
- `scale: number` – world scale (default 1)
- `translate: { x: number, y: number }` – world translation (px)
- `cursor: string` – canvas CSS cursor per frame
- `maxFPS: number` – soft cap for render loop (default 60)
- `disposed: boolean`
- `userData: any`

Tree ops (from `Node`)

- `add(child: Shape | Shape[])`
- `remove(child: Shape | Shape[])`
- `removeAll()`
- `children: Set<Shape>`

Rendering and lifecycle

- `render()` – called by internal RAF tick; re-computes transforms and draws
- `fit(contentWidth: number, contentHeight: number, padding: number)` – center-fit world into canvas
- `reset()` – remove all shapes and clear active/hover refs
- `dispose()` – stop RAF and emit `dispose`

Events on `Scene`

- Pointer: `pointerdown|pointerup|pointermove|pointerenter|pointerleave`
- Lifecycle: `beforeRender`, `dispose`
- Add/remove: `add`, `remove` (emitted with shape target)

Event payloads follow `events.ts` and always include:

- `type`, `target`, `currentTarget`, `srcEvent?`, `hitResult?`

### Shape (base class for all shapes)

Constructor and fields

- `class Shape` (abstract)
- Local transform: `x: number`, `y: number`, `scale: number`
- Visibility: `visible: boolean`
- Styles:
  - `style: Partial<ExtendedCanvasStyles>` – base style
  - `hoverStyle: Partial<CanvasStyles>` – applied when hovered
  - `activeStyle: Partial<CanvasStyles>` – applied when active/dragging
- `userData: any`

Coordinate helpers

- `localToView(x: number, y: number) => { x, y }` – world→canvas mapping with composed transform
- `viewToLocal(x: number, y: number) => { x, y }` – inverse mapping

Tree ops (from `Node`)

- `add(child: Shape | Shape[])`, `remove(child)`, `removeAll()`
- `traverse(fn)`, `traverseUp(fn)`
- `bubbleEvent(event)` – dispatch and bubble up ancestors

Rendering contract

- `hit(x: number, y: number, ctx: CanvasRenderingContext2D): boolean | object | void`
  - Implement per-shape hit-testing. Return truthy or a detailed object to populate `hitResult`.
- `draw(ctx: CanvasRenderingContext2D): void`
  - Implement actual canvas drawing. Respect `_fill/_stroke` computed by `Scene`.

Events on `Shape`

- Pointer: `pointerdown|pointerup|pointermove|pointerenter|pointerleave`
- Lifecycle: `beforeRender`, `add`, `remove`

Styling

- `CanvasStyles` mirrors Canvas 2D styles plus:
  - `fill: boolean`, `stroke: boolean`
  - `cursor: string`
- `ExtendedCanvasStyles` extends with:
  - `zIndex: number` (draw order; ascending)
  - `pointerEvents: 'auto' | 'none'`
  - `fillOpacity: number`, `strokeOpacity: number`
  - `lineDash: number[]`

Notes

- Internals like `_scale`, `_translate`, `_hover`, `_active` are managed by `Scene` and read-only for consumers.
- Shapes sort by `style.zIndex` each frame.

### Custom shapes

```ts
class MyShape extends Shape {
  hit(x: number, y: number, ctx: CanvasRenderingContext2D) {
    const p = this.viewToLocal(x, y)
    // return boolean or detailed object
    return Math.hypot(p.x, p.y) < 50
  }
  draw(ctx: CanvasRenderingContext2D) {
    const c = this.localToView(0, 0)
    ctx.arc(c.x, c.y, 50 * this._scale, 0, Math.PI * 2)
    this._fill && ctx.fill()
    this._stroke && ctx.stroke()
  }
}
```

---

## Built-in shapes

- `RectShape(x = 0, y = 0, width = 100, height = 100)`
  - `hit`: axis-aligned rect in view space
  - `draw`: rect with `fillOpacity/strokeOpacity`

- `CircleShape(x = 0, y = 0, radius = 100)`
  - `fixedRadius: boolean` – if true, radius is in pixels (no world scale)

- `SegmentShape(x = 0, y = 0, dx = 100, dy = 100)`
  - Vector-defined line segment; default `style.stroke = true`

- `PolylineShape(x = 0, y = 0, points = [], closed = false)`
  - Default stroked polyline; `hit` returns `{ index, t, distance }` when near an edge

- `PolygonShape(x = 0, y = 0, points = [])` – filled polygon with point-in-polygon `hit`

- `ImageShape(image: HTMLImageElement, x?, y?, width?, height?)`

- `MaskShape()` – full-canvas overlay; default semi-transparent fill

- `PathShape(path: Path2D)` – draw/fill a `Path2D` directly

- `TextShape(x = 0, y = 0, text = '', maxWidth?)`
  - `fixedSize: boolean` – keep text size in pixels
  - `hit` uses measured bounding box

---

## Interaction utilities (extra)

- `draggable(shape: Shape, onDrag?, onChange?, ignoreChildren = true) => () => void`
  - Makes a shape draggable. `onDrag` receives `{ type: 'drag', x, y, dx, dy, srcEvent }` (can mutate `x/y`).
  - `onChange` receives `{ type: 'afterDrag' }` after mouse up.
  - Sets `shape.hoverStyle.cursor = 'move'`.

- `scenePointerControl(scene: Scene, options?: { lockX?: boolean; lockY?: boolean; lockScale?: boolean }) => () => void`
  - RMB drag to pan; wheel to zoom around pointer.

- `addAxis(scene: Scene) => () => void`
  - Adds screen-space X/Y axes, pointer crosshair, and coordinate readouts.

- `autoFPS(scene: Scene, minFPS = 5, maxFPS?: number) => () => void`
  - Lowers FPS when idle; restores on interaction.

- `showFPS(scene: Scene) => () => void`
  - Displays an on-canvas FPS overlay (DOM node appended to canvas parent).

- `point(size = 20) => CircleShape`
  - Convenience fixed-radius point with random fill/stroke.

---

## Drawing tools (mouse-driven creators)

All tools add temporary listeners and return a cancel function to uninstall.

- `drawPoint(scene, onAdd?, radius = 5, styles?) => () => void`
  - Click empty area to create a fixed-radius `CircleShape`; `onAdd({ target })` receives the point.

- `drawRect(scene, onAdd?, styles?) => () => void`
  - LMB drag to create a `RectShape`. Zero-size rects are discarded. Uses world coordinates.

- `drawSegment(scene, onAdd?, styles?) => () => void`
  - LMB drag to create a `SegmentShape` from start to end.

- `drawPolyline(scene, onAdd?, styles?, pointStyles?) => () => void`
  - Click to start, click to add vertices; click last point to finish open, or first point to close.
  - Adds a low-opacity `MaskShape` to capture events during drawing.
  - `onAdd({ target })` receives the `PolylineShape`.

- `drawPolygon(scene, onAdd?, styles?, pointStyles?) => () => void`
  - Wraps `drawPolyline`, converts to `PolygonShape` on finish, then calls `onAdd({ target })`.

---

## Edit tools (interactive controllers)

Each edit tool attaches controller points and returns a cancel function. They also set `target.userData.__controllers` and `target.userData.__cancelEdit` for bookkeeping.

- `editRect(rect, onBeforeEdit?, onEdit?, pointRadius = 10, pointStyles?, pointHoverStyles?, pointActiveStyles?) => () => void`
  - Four corner points; dragging updates rect. Emits `beforeRectEdit` before changes and `rectEdit` after.

- `editSegment(segment, onBeforeEdit?, onEdit?, pointRadius = 10, pointStyles?, pointHoverStyles?, pointActiveStyles?) => () => void`
  - Two endpoints; drag either or the entire segment.

- `editPolyline(polyline, onBeforeEdit?, onEdit?, pointRadius = 10, pointStyles?, pointHoverStyles?, pointActiveStyles?, disableDrag?) => () => void`
  - Controller point per vertex. Drag to move. Add point: Ctrl/Cmd + click on edge. Remove point: Ctrl/Cmd + click on vertex.

- `editPolygon(polygon, onBeforeEdit?, onEdit?, pointRadius = 10, pointStyles?, pointHoverStyles?, pointActiveStyles?) => () => void`
  - Internally edits a closed `PolylineShape` shadow; dragging polygon moves it.

---

## Utilities

General

- `randomID(existingIDs?: string[]) => string`
- `loadImage(src: string, crossOrigin?: string) => Promise<HTMLImageElement>`
- `minmax(value, min, max) => number`
- `fixRect(rect)` – normalize negative width/height

Constraints

- `constrainPoint(point, bbox)` – clamp point to bbox
- `constrainRect(rect, bbox)` – clamp rect to bbox (auto-fixes orientation)
- `constrainSegment(segment, bbox)` – clamp start and delta to bbox
- `constrainPoly(polylineOrPolygon, bbox)` – clamp each vertex to bbox in local space

Geometry helpers

- `getBbox(points) => [minX, minY, maxX, maxY]`
- `getCenter(points) => { x, y }`
- `getCentroid(points) => { x, y }`
- `findNearestPolygon(multiPolygon, point) => polygon | undefined`
- `findNearestPolygonBbox(multiPolygon, point) => bbox | undefined`
- `randomColor(alpha = 1, seed = Math.random()) => string`
- `findLast(array, predicate)` – Array.prototype.findLast polyfill

Audio

- `loadAudio(src: string) => Promise<{ audio: HTMLAudioElement, blob: Blob, duration: number }>`
- `decode(audioData: ArrayBuffer, sampleRate: number) => Promise<AudioBuffer>`

---

## Chart primitives (Cartesian)

### Coordinator and axes

- `class CartesianCoordinator extends EventDispatcher<{ update: { type: 'update' } }>`
  - Data domain: `xStart/xEnd/yStart/yEnd`
  - Viewport rect in canvas space: `viewportX/viewportY/viewportWidth/viewportHeight`
  - `indicator: RectShape` – shows the viewport bounds
  - `project(x, y) => [xInView, yInView]`
  - `unproject(xInView, yInView) => [x, y]`

- `coordinatorPointerControl(scene, coordinator, options?) => () => void`
  - RMB pan and wheel zoom on the data domain; supports min/max bounds for X.

- `class CartesianAxes extends Shape`
  - Visual X/Y axes inside coordinator viewport; options `{ followOrigin?: boolean; arrow?: boolean; arrowExtend?: number }`

- `tick(coordinator, config?) => Shape`
  - Generates ticks and labels with adaptive spacing. Options include `minDistance`, label formatters.

### Plots

All plot creators return a `Shape` group suitable for `scene.add(...)` and recompute on `beforeRender`.

- `scatterPlot(coordinator, data: { x, y, color?, size? }[], config?: { color?, size? }) => Shape`
- `linePlot(coordinator, data: { x, y }[], config?: { lineWidth?, color? }) => Shape`
- `barPlot(coordinator, data: { x, y, color? }[], config?: { barWidth?, color? }) => Shape`
- `candlestickPlot(coordinator, data: { x, open, close, high, low }[], config?: { barWidth? }) => Shape`

### Marker

- `class XRange extends RectShape`
  - Fields: `xStart`, `xEnd`, and an associated `CartesianCoordinator`.
  - Config: `{ color?, borderColor?, borderHoverColor?, editable?, onEdit?, min?, max? }`
  - When `editable`, draggable borders update `xStart/xEnd`; `onEdit` is invoked after change.

- `drawXRange(scene, coordinator, config?) => () => void`
  - LMB drag within viewport to create an `XRange` and add to `scene`.

---

## Events reference (types)

Pointer events: `PointerEvents<TTarget>`

- `pointerdown/up/move/enter/leave` with `{ target, currentTarget, srcEvent, hitResult? }`

Shape lifecycle: `ShapeLifeCycleEvents`

- `beforeRender` – on every `Scene.render()` before drawing
- `add`/`remove` – when a shape is added/removed

Scene events: `SceneEvents`

- `add`/`remove` – when a shape is added/removed to the scene
- `beforeRender`, `dispose`

Notes

- Events bubble through the shape tree via `bubbleEvent` and `traverseUp`.
- `hitResult` is the return value from `shape.hit` for the hovered/active shape.

---

## Patterns and best practices

- **Coordinate math**: Use `viewToLocal` for hit-tests in your own shapes; use `localToView` for drawing when you need explicit coordinates.
- **Z-ordering**: Set `shape.style.zIndex`. Higher values draw later.
- **Pointer hit**: Set `shape.style.pointerEvents = 'none'` for passive visuals like axes, masks, and helpers.
- **Performance**: Use `autoFPS(scene, min)` to lower background CPU; avoid large `lineDash` and complex `Path2D` if not needed.
- **Cleanup**: Every helper returns a cancel function. Always call cancels and `scene.dispose()` on teardown.

---

## Examples

Pan/zoom, axis, and draggable shapes

```ts
const scene = new Scene(canvas)
scenePointerControl(scene, { lockY: true })
addAxis(scene)

const seg = new SegmentShape(100, 120, 180, 40)
seg.style.stroke = true
seg.style.lineWidth = 6
seg.style.strokeStyle = '#333'
scene.add(seg)

// Make segment draggable and editable
const cancelDrag = draggable(seg)
const cancelEdit = editSegment(seg)

// Teardown
// cancelDrag(); cancelEdit(); scene.dispose()
```

Constrain a polygon while drawing/editing

```ts
const cancelDraw = drawPolygon(scene, (e) => {
  constrainPoly(e.target, [100, 100, 700, 500])
  editPolygon(e.target, (evt) => constrainPoly(evt.target, [100, 100, 700, 500]))
})
```

Simple chart

```ts
const scene = new Scene(canvas)
const coord = new CartesianCoordinator()
coord.viewportX = 80; coord.viewportY = 40
coord.viewportWidth = 600; coord.viewportHeight = 360

scene.add(coord.indicator)
scene.add(new CartesianAxes(coord, { followOrigin: false }))
scene.add(tick(coord))

const data = Array.from({ length: 100 }, (_, i) => ({ x: i, y: Math.random() * 100 }))
scene.add(barPlot(coord, data, { barWidth: 0.8 }))
scene.add(linePlot(coord, data))
scene.add(scatterPlot(coord, data, { size: 4 }))

coordinatorPointerControl(scene, coord, { lockY: true })
```

---

## Non-goals and scope

- Not a full graphics framework (no retained GPU scene, no layout engine).
- No new drawing primitives beyond Canvas; shapes are thin wrappers you can extend.
- SVG parsing utilities exist internally, but only the Canvas API is used publicly.

---

## Version

This document targets `cubs.js@0.3.5`.

This file is generated from the source code by AI. Update this to reflect the latest version.

import { SegmentShape, TextShape } from '.'
import { Scene, Shape, ShapeGroup } from './core'
import type { PointerEvents } from './events'

type BeforeDragEvent = {
	type: 'drag'
	/**
	 * 新的 x，可以修改
	 */
	x: number
	/**
	 * 新的 y，可以修改
	 */
	y: number
	srcEvent: PointerEvent
	target: Shape
	currentTarget: Shape
}

type AfterDragEvent = {
	type: 'afterDrag'
	srcEvent: PointerEvent
	target: Shape
	currentTarget: Shape
}

/**
 * make a shape draggable
 */
export function draggable(
	shape: Shape,
	onDrag?: (e: BeforeDragEvent) => void,
	onChange?: (e: AfterDragEvent) => void
) {
	let startPointerX = 0
	let startPointerY = 0
	let isDragging = false

	let startShapeX = 0
	let startShapeY = 0

	shape.hoverStyles.cursor = 'move'

	function onPointerDown(e: PointerEvents['pointerdown']) {
		if (e.srcEvent.button !== 0) return

		startPointerX = e.srcEvent.offsetX
		startPointerY = e.srcEvent.offsetY
		startShapeX = shape.x
		startShapeY = shape.y
		isDragging = true
	}

	function onPointerMove(e: PointerEvents['pointermove']) {
		if (isDragging) {
			const dx = e.srcEvent.offsetX - startPointerX
			const dy = e.srcEvent.offsetY - startPointerY

			const newX = startShapeX + dx / shape._scale
			const newY = startShapeY + dy / shape._scale

			const event = {
				type: 'drag',
				x: newX,
				y: newY,
				srcEvent: e.srcEvent,
				target: shape,
				currentTarget: shape,
			} as const

			onDrag?.(event)

			shape.x = event.x
			shape.y = event.y
		}
	}

	function onPointerUp(e: PointerEvents['pointerup']) {
		isDragging = false

		onChange?.({
			type: 'afterDrag',
			srcEvent: e.srcEvent,
			target: shape,
			currentTarget: shape,
		})
	}

	shape.addEventListener('pointerdown', onPointerDown)
	shape.addEventListener('pointermove', onPointerMove)
	shape.addEventListener('pointerup', onPointerUp)

	return function cancelDrag() {
		shape.removeEventListener('pointerdown', onPointerDown)
		shape.removeEventListener('pointermove', onPointerMove)
		shape.removeEventListener('pointerup', onPointerUp)
	}
}

/**
 * 使用鼠标控制场景的缩放和平移，滚轮缩放，右键平移，缩放时以鼠标位置为中心
 * @return 取消监听函数
 */
export function scenePointerControl(scene: Scene) {
	const handlePointerDown = (event: PointerEvents['pointerdown']) => {
		const e = event.srcEvent

		if (e.button !== 2) return

		e.preventDefault()

		scene.cursor = 'grabbing'

		const { left, top } = scene.canvas.getBoundingClientRect() || { left: 0, top: 0 }

		const startX = e.clientX - left
		const startY = e.clientY - top

		const startTranslateX = scene.translate.x
		const startTranslateY = scene.translate.y

		const handlePointerMove = (event: PointerEvents['pointermove']) => {
			const e = event.srcEvent

			const x = e.clientX - left
			const y = e.clientY - top

			scene.translate.x = startTranslateX + x - startX
			scene.translate.y = startTranslateY + y - startY
		}

		// @note: 只监听了 Pointer up，所以鼠标移出了 canvas 也会继续平移，如果需要处理移出页面需要额外逻辑
		const handlePointerUp = (event: PointerEvents['pointerup']) => {
			scene.cursor = 'default'
			scene.removeEventListener('pointermove', handlePointerMove)
			scene.removeEventListener('pointerup', handlePointerUp)
		}

		scene.addEventListener('pointermove', handlePointerMove)
		scene.addEventListener('pointerup', handlePointerUp)
	}

	const handleWheel = (e: WheelEvent) => {
		// 操作安全
		if (e.buttons !== 0) return

		e.preventDefault()

		const scale = Math.pow(1.1, -e.deltaY / 50)

		scene.scale *= scale

		const { left, top } = scene.canvas.getBoundingClientRect() || { left: 0, top: 0 }

		const x = e.clientX - left
		const y = e.clientY - top

		const dx = x - scene.translate.x
		const dy = y - scene.translate.y

		scene.translate.x += dx - dx * scale
		scene.translate.y += dy - dy * scale
	}

	const disableContextMenu = (e: any) => {
		e.preventDefault()
	}

	scene.addEventListener('pointerdown', handlePointerDown)
	scene.canvas.addEventListener('wheel', handleWheel)
	scene.canvas.addEventListener('contextmenu', disableContextMenu)

	return function cancelControl() {
		scene.removeEventListener('pointerdown', handlePointerDown)
		scene.canvas.removeEventListener('wheel', handleWheel)
		scene.canvas.removeEventListener('contextmenu', disableContextMenu)
	}
}

/**
 * 想场景中添加全屏坐标轴，标出 x 和 y 轴的方向，x 轴为红色向右，y 轴为绿色向下
 * @return 取消函数
 */
export function addAxis(scene: Scene): () => void {
	const group = new ShapeGroup()

	const xAxis = new SegmentShape()
	group.add(xAxis)
	xAxis.styles.strokeStyle = 'red'
	xAxis.styles.lineWidth = 2
	xAxis.dx = 0
	xAxis.dy = 0

	const xArrowUp = new SegmentShape()
	group.add(xArrowUp)
	xArrowUp.styles.strokeStyle = 'red'
	xArrowUp.styles.lineWidth = 2
	xArrowUp.dx = -10
	xArrowUp.dy = -10

	const xArrowDown = new SegmentShape()
	group.add(xArrowDown)
	xArrowDown.styles.strokeStyle = 'red'
	xArrowDown.styles.lineWidth = 2
	xArrowDown.dx = -10
	xArrowDown.dy = 10

	xAxis.addEventListener('beforeDraw', (e) => {
		xAxis.dx = scene.canvas.width / scene.scale
		xAxis.x = -scene.translate.x / scene.scale

		xArrowUp.x = xAxis.x + xAxis.dx
		xArrowUp.dx = -10 / scene.scale
		xArrowUp.dy = -10 / scene.scale

		xArrowDown.x = xAxis.x + xAxis.dx
		xArrowDown.dx = -10 / scene.scale
		xArrowDown.dy = 10 / scene.scale
	})

	const yAxis = new SegmentShape()
	group.add(yAxis)
	yAxis.styles.strokeStyle = 'green'
	yAxis.styles.lineWidth = 2
	yAxis.dx = 0
	yAxis.dy = 0

	const yArrowLeft = new SegmentShape()
	group.add(yArrowLeft)
	yArrowLeft.styles.strokeStyle = 'green'
	yArrowLeft.styles.lineWidth = 2
	yArrowLeft.dx = -10
	yArrowLeft.dy = -10

	const yArrowRight = new SegmentShape()
	group.add(yArrowRight)
	yArrowRight.styles.strokeStyle = 'green'
	yArrowRight.styles.lineWidth = 2
	yArrowRight.dx = 10
	yArrowRight.dy = -10

	yAxis.addEventListener('beforeDraw', (e) => {
		yAxis.dy = scene.canvas.height / scene.scale
		yAxis.y = -scene.translate.y / scene.scale

		yArrowLeft.y = yAxis.y + yAxis.dy
		yArrowLeft.dx = -10 / scene.scale
		yArrowLeft.dy = -10 / scene.scale

		yArrowRight.y = yAxis.y + yAxis.dy
		yArrowRight.dx = 10 / scene.scale
		yArrowRight.dy = -10 / scene.scale
	})

	const pointerLineY = new SegmentShape()
	group.add(pointerLineY)
	pointerLineY.styles.strokeStyle = 'green'
	pointerLineY.styles.strokeOpacity = 0.5
	pointerLineY.styles.lineDash = [5, 5]
	pointerLineY.styles.lineWidth = 2
	pointerLineY.dx = 0
	pointerLineY.dy = 0

	const pointerLineX = new SegmentShape()
	group.add(pointerLineX)
	pointerLineX.styles.strokeStyle = 'red'
	pointerLineX.styles.strokeOpacity = 0.5
	pointerLineX.styles.lineDash = [5, 5]
	pointerLineX.styles.lineWidth = 2
	pointerLineX.dx = 0
	pointerLineX.dy = 0

	const textX = new TextShape()
	group.add(textX)
	textX.styles.fillStyle = 'red'
	textX.styles.fillOpacity = 0.7
	textX.styles.font = '15px monospace'
	textX.fixedSize = true

	const textY = new TextShape()
	group.add(textY)
	textY.styles.fillStyle = 'green'
	textY.styles.fillOpacity = 0.7
	textY.styles.font = '15px monospace'
	textY.fixedSize = true

	scene.addEventListener('pointermove', (e) => {
		const x = e.srcEvent.offsetX
		const y = e.srcEvent.offsetY

		const xWorld = (x - scene.translate.x) / scene.scale
		const yWorld = (y - scene.translate.y) / scene.scale

		pointerLineX.x = xWorld
		pointerLineX.dy = yWorld

		pointerLineY.y = yWorld
		pointerLineY.dx = xWorld

		const margin = 5 / scene.scale

		textX.x = xWorld + margin
		// textX.y = yWorld
		textX.styles.textBaseline = yWorld > 0 ? 'top' : 'bottom'
		textX.y = yWorld > 0 ? margin : -margin
		textX.text = xWorld.toFixed(2)

		// textY.x = xWorld
		textY.y = yWorld - margin
		textY.styles.textAlign = xWorld > 0 ? 'left' : 'right'
		textY.x = xWorld > 0 ? margin : -margin
		textY.text = yWorld.toFixed(2)
	})

	group.shapes.forEach((shape) => {
		shape.styles.pointerEvents = 'none'
		shape.styles.zIndex = -1
	})

	scene.add(group)

	return () => {
		scene.remove(group)
	}
}

/**
 * 无交互时自动降低 FPS，有交互时恢复 FPS
 * @return 取消函数
 */
export function autoFPS(scene: Scene, minFPS = 5, maxFPS?: number): () => void {
	const originalFPS = maxFPS || scene.maxFPS

	scene.maxFPS = minFPS

	let isPointerDown = false
	let isPointerHovering = false

	const handlePointerDown = () => {
		isPointerDown = true
		scene.maxFPS = originalFPS
	}

	const handlePointerUp = () => {
		isPointerDown = false
		if (!isPointerHovering) scene.maxFPS = minFPS
	}

	const handlePointerEnter = () => {
		isPointerHovering = true
		scene.maxFPS = originalFPS
	}

	const handlePointerLeave = () => {
		isPointerHovering = false
		if (!isPointerDown) scene.maxFPS = minFPS
	}

	const handlePointerMove = () => {
		isPointerHovering = true
		scene.maxFPS = originalFPS
	}

	scene.addEventListener('pointerdown', handlePointerDown)
	scene.addEventListener('pointerup', handlePointerUp)
	scene.addEventListener('pointerenter', handlePointerEnter)
	scene.addEventListener('pointerleave', handlePointerLeave)
	scene.addEventListener('pointermove', handlePointerMove)

	return () => {
		scene.removeEventListener('pointerdown', handlePointerDown)
		scene.removeEventListener('pointerup', handlePointerUp)
		scene.removeEventListener('pointerenter', handlePointerEnter)
		scene.removeEventListener('pointerleave', handlePointerLeave)
		scene.removeEventListener('pointermove', handlePointerMove)
	}
}

/**
 * 在画布上显示 FPS 数值
 * @return 取消函数
 */
export function showFPS(scene: Scene): () => void {
	let lastTime = 0
	let lastFPS = 0

	const div = document.createElement('div')
	div.style.position = 'absolute'
	div.style.right = '0'
	div.style.bottom = '0'
	div.style.textShadow = 'white'
	div.style.color = 'black'
	div.style.fontFamily = 'monospace'

	const listener = () => {
		const now = performance.now()
		const dt = now - lastTime
		lastTime = now

		const fps = Math.round(1000 / dt)

		if (fps !== lastFPS) {
			lastFPS = fps

			div.innerText = `${fps} FPS`
		}
	}

	scene.addEventListener('beforeRender', listener)
	scene.canvas.parentElement?.appendChild(div)

	return () => {
		scene.removeEventListener('beforeRender', listener)
		div.remove()
	}
}

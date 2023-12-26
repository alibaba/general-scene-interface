import { randomColor } from '../..'
import { EventDispatcher } from '../EventDispatcher'
import { Scene, Shape } from '../core'
import { PointerEvents } from '../events'
import { PolygonShape, RectShape, SegmentShape, TextShape } from '../shapes'

/**
 * 笛卡尔数据坐标系坐标映射器
 */
export class CartesianCoordinator extends EventDispatcher<{ update: { type: 'update' } }> {
	xStart = 0
	xEnd = 100
	yStart = 0
	yEnd = 100

	viewportX = 100
	viewportY = 100
	viewportWidth = 400
	viewportHeight = 200

	indicator = new RectShape()

	get top() {
		return this.viewportY
	}
	get bottom() {
		return this.viewportY + this.viewportHeight
	}
	get left() {
		return this.viewportX
	}
	get right() {
		return this.viewportX + this.viewportWidth
	}

	constructor() {
		super()
		this.indicator.style.stroke = true
		this.indicator.style.fill = false
		this.indicator.style.pointerEvents = 'none'
		this.indicator.style.strokeStyle = randomColor(0.5)
		this.indicator.addEventListener('beforeRender', (e) => {
			this.indicator.x = this.viewportX
			this.indicator.y = this.viewportY
			this.indicator.width = this.viewportWidth
			this.indicator.height = this.viewportHeight
		})
	}

	project(x: number, y: number) {
		const xInViewport = (x - this.xStart) / (this.xEnd - this.xStart)
		const yInViewport = (y - this.yStart) / (this.yEnd - this.yStart)

		const xInView = xInViewport * this.viewportWidth + this.viewportX
		const yInView = -yInViewport * this.viewportHeight + this.viewportY + this.viewportHeight
		return [xInView, yInView]
	}

	unproject(xInView: number, yInView: number) {
		const xInViewport = (xInView - this.viewportX) / this.viewportWidth
		const yInViewport = -(yInView - this.viewportY - this.viewportHeight) / this.viewportHeight

		const x = xInViewport * (this.xEnd - this.xStart) + this.xStart
		const y = yInViewport * (this.yEnd - this.yStart) + this.yStart
		return [x, y]
	}
}

/**
 * 使用鼠标控制场景的缩放和平移，滚轮缩放，右键平移，缩放时以鼠标位置为中心
 * @return 取消监听函数
 */
export function coordinatorPointerControl(
	scene: Scene,
	coordinator: CartesianCoordinator,
	options?: {
		lockX?: boolean
		lockY?: boolean
		lockScale?: boolean
		/**
		 * x 轴的移动范围
		 */
		xStartMin?: number
		xEndMax?: number
	}
) {
	const { lockX = false, lockY = false, lockScale = false } = options || {}
	const xStartMin = options?.xStartMin ?? -Infinity
	const xEndMax = options?.xEndMax ?? Infinity

	const handlePointerDown = (event: PointerEvents['pointerdown']) => {
		const e = event.srcEvent

		if (e.button !== 2) return

		e.preventDefault()

		scene.cursor = 'grabbing'

		const { left, top } = scene.canvas.getBoundingClientRect() || { left: 0, top: 0 }

		const startX = e.clientX - left
		const startY = e.clientY - top

		const initXStart = coordinator.xStart
		const initXEnd = coordinator.xEnd

		const handlePointerMove = (event: PointerEvents['pointermove']) => {
			const e = event.srcEvent

			const x = e.clientX - left
			const y = e.clientY - top

			const coordinatorScaleX = (coordinator.xEnd - coordinator.xStart) / coordinator.viewportWidth
			const coordinatorScaleY = (coordinator.yEnd - coordinator.yStart) / coordinator.viewportHeight

			if (!lockX) {
				const newXStart = initXStart - (x - startX) * coordinatorScaleX
				const newXEnd = initXEnd - (x - startX) * coordinatorScaleX

				if (newXStart < xStartMin) {
					// -Infinity 不会进入这个分支
					coordinator.xStart = xStartMin
				} else if (newXEnd > xEndMax) {
					// Infinity 不会进入这个分支
					coordinator.xEnd = xEndMax
				} else {
					coordinator.xStart = newXStart
					coordinator.xEnd = newXEnd
				}
			}

			if (!lockY) {
				coordinator.yStart = coordinator.yStart + (y - startY) * coordinatorScaleY
				coordinator.yEnd = coordinator.yEnd + (y - startY) * coordinatorScaleY
			}

			coordinator.dispatchEvent({ type: 'update' })
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
		if (lockScale) return

		// 操作安全
		if (e.buttons !== 0) return

		e.preventDefault()

		const scale = Math.pow(1.1, e.deltaY / 50)

		// scene.scale *= scale

		const { left, top } = scene.canvas.getBoundingClientRect() || { left: 0, top: 0 }

		const x = e.clientX - left
		const y = e.clientY - top

		const [xInView, yInView] = coordinator.unproject(x, y)

		if (!lockX) {
			coordinator.xStart = (coordinator.xStart - xInView) * scale + xInView
			coordinator.xEnd = (coordinator.xEnd - xInView) * scale + xInView
			coordinator.xStart = Math.max(coordinator.xStart, options?.xStartMin ?? -Infinity)
			coordinator.xEnd = Math.min(coordinator.xEnd, options?.xEndMax ?? Infinity)
		}
		if (!lockY) {
			coordinator.yStart = (coordinator.yStart - yInView) * scale + yInView
			coordinator.yEnd = (coordinator.yEnd - yInView) * scale + yInView
		}

		coordinator.dispatchEvent({ type: 'update' })
	}

	const disableContextMenu = (e: MouseEvent) => {
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
 * 笛卡尔坐标系坐标轴
 */
export class CartesianAxes extends Shape {
	constructor(
		public coordinator: CartesianCoordinator,
		public config?: {
			followOrigin?: boolean
			arrow?: boolean
			arrowExtend?: number
		}
	) {
		super()

		const followOrigin = config?.followOrigin ?? true
		const arrow = config?.arrow ?? true
		const arrowExtend = (config?.arrowExtend ?? 20) * (arrow ? 1 : 0)

		const xAxis = new SegmentShape()
		this.add(xAxis)
		xAxis.style.strokeStyle = 'red'
		xAxis.style.lineWidth = 2
		xAxis.dx = 100
		xAxis.dy = 0

		const xArrow = new PolygonShape()
		xArrow.points = [
			{ x: 10, y: 0 },
			{ x: 0, y: -7 },
			{ x: 0, y: 7 },
		]
		arrow && this.add(xArrow)
		xArrow.style.fillStyle = 'red'

		const yAxis = new SegmentShape()
		this.add(yAxis)
		yAxis.style.strokeStyle = 'green'
		yAxis.style.lineWidth = 2
		yAxis.dx = 0
		yAxis.dy = -100

		const yArrow = new PolygonShape()
		yArrow.points = [
			{ x: 0, y: -10 },
			{ x: 7, y: 0 },
			{ x: -7, y: 0 },
		]
		arrow && this.add(yArrow)
		yArrow.style.fillStyle = 'green'

		this.addEventListener('beforeRender', (e) => {
			const right = this.coordinator.viewportX + this.coordinator.viewportWidth
			const top = this.coordinator.viewportY

			const left = this.coordinator.viewportX
			const bottom = this.coordinator.viewportY + this.coordinator.viewportHeight

			const origin = followOrigin ? this.coordinator.project(0, 0) : [left, bottom]

			xAxis.x = origin[0]
			xAxis.y = origin[1]
			xAxis.dx = right - xAxis.x + arrowExtend

			xArrow.x = right + arrowExtend
			xArrow.y = origin[1]

			yAxis.x = origin[0]
			yAxis.y = origin[1]
			yAxis.dy = top - yAxis.y - arrowExtend

			yArrow.x = origin[0]
			yArrow.y = top - arrowExtend
		})
	}
}

/**
 * 生成坐标轴刻度
 */
export function tick(
	coordinator: CartesianCoordinator,
	config?: {
		xColor?: string
		yColor?: string
		minDistance?: number
		disableX?: boolean
		disableY?: boolean
		xToString?: (x: number) => string
		yToString?: (y: number) => string
	}
) {
	const group = new Shape()

	const {
		minDistance = 100,
		xToString = (x: number) => x.toFixed(2),
		yToString = (y: number) => y.toFixed(2),
	} = config || {}

	const update = () => {
		group.removeAll()

		// x
		if (!config?.disableX) {
			const tickX = new Shape()

			// 计算一个合适的取整方案，使得刻度间距大于 minDistance
			const pixelLen = coordinator.viewportWidth
			const valueLen = coordinator.xEnd - coordinator.xStart
			const pixelPerValue = pixelLen / valueLen

			const minValueGap = Math.pow(10, Math.floor(Math.log10(valueLen / 10)))

			// console.log('minValueGap', minValueGap)

			let valueGap = minValueGap
			let distance = pixelPerValue * valueGap
			if (distance < minDistance) valueGap = minValueGap * 2
			distance = pixelPerValue * valueGap
			if (distance < minDistance) valueGap = minValueGap * 5
			distance = pixelPerValue * valueGap
			if (distance < minDistance) valueGap = minValueGap * 10
			distance = pixelPerValue * valueGap

			// console.log('valueGap', valueGap, 'distance', distance)

			const startX = Math.ceil(coordinator.xStart / valueGap) * valueGap

			for (let x = startX; x <= coordinator.xEnd; x += valueGap) {
				const tick = new SegmentShape()
				tick.style.strokeStyle = config?.xColor ?? 'red'
				tick.style.lineWidth = 2
				tick.dx = 0
				tick.dy = 10

				const pos = coordinator.project(x, 0)
				tick.x = pos[0]
				tick.y = coordinator.bottom

				tickX.add(tick)

				const text = new TextShape()
				text.text = xToString(x)
				text.style.fillStyle = config?.xColor ?? 'red'
				text.style.textAlign = 'center'
				text.style.textBaseline = 'top'
				text.style.font = '12px sans-serif'
				text.x = pos[0]
				text.y = coordinator.bottom + 20
				tickX.add(text)
			}

			group.add(tickX)
		}

		// y
		if (!config?.disableY) {
			const tickY = new Shape()

			// 计算一个合适的取整方案，使得刻度间距大于 minDistance
			const pixelLen = coordinator.viewportHeight
			const valueLen = coordinator.yEnd - coordinator.yStart
			const pixelPerValue = pixelLen / valueLen

			const minValueGap = Math.pow(10, Math.floor(Math.log10(valueLen / 10)))

			// console.log('minValueGap', minValueGap)

			let valueGap = minValueGap
			let distance = pixelPerValue * valueGap
			if (distance < minDistance) valueGap = minValueGap * 2
			distance = pixelPerValue * valueGap
			if (distance < minDistance) valueGap = minValueGap * 5
			distance = pixelPerValue * valueGap
			if (distance < minDistance) valueGap = minValueGap * 10
			distance = pixelPerValue * valueGap

			// console.log('valueGap', valueGap, 'distance', distance)

			const startY = Math.ceil(coordinator.yStart / valueGap) * valueGap

			for (let y = startY; y <= coordinator.yEnd; y += valueGap) {
				const tick = new SegmentShape()
				tick.style.strokeStyle = config?.yColor ?? 'green'
				tick.style.lineWidth = 2
				tick.dx = -10
				tick.dy = 0

				const pos = coordinator.project(0, y)
				tick.x = coordinator.left
				tick.y = pos[1]

				tickY.add(tick)

				const text = new TextShape()
				text.text = yToString(y)
				text.style.fillStyle = config?.yColor ?? 'green'
				text.style.textAlign = 'right'
				text.style.textBaseline = 'middle'
				text.style.font = '12px sans-serif'
				text.x = coordinator.left - 15
				text.y = pos[1]
				tickY.add(text)
			}

			group.add(tickY)
		}
	}

	update()

	coordinator.addEventListener('update', (e) => {
		update()
	})

	return group
}

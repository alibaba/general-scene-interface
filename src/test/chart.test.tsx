import { useEffect, useRef } from 'react'

import { PointerEvents, PolylineShape, RectShape, SegmentShape, TextShape } from '..'
import { EventDispatcher } from '../lib/EventDispatcher'
import { Scene, Shape } from '../lib/core'
import { draggable, point } from '../lib/extra'
import { randomColor } from '../lib/utils/misc'

import styles from './Test.module.css'

/**
 * @test_name 数据图表
 * @test_category shapes
 */
export default function Test() {
	const canvasRef = useRef<HTMLCanvasElement>(null!)

	const width = 800
	const height = 600

	useEffect(() => {
		const canvas = canvasRef.current

		const scene = new Scene(canvas)
		// scenePointerControl(scene, { lockY: true, lockScale: true })

		const coordinator = new CartesianCoordinator()
		coordinator.viewportWidth = width - 200
		coordinator.viewportHeight = height - 200

		coordinatorPointerControl(scene, coordinator, { lockY: true, lockScale: false })

		const axis = new CartesianAxes(coordinator, { followOrigin: false })

		scene.add(coordinator.indicator)

		scene.add(axis)

		const testData = [] as { x: number; y: number }[]
		for (let i = 0; i < 100; i++) {
			testData.push({ x: i, y: Math.random() * 100 })
		}

		const b = bar(coordinator, testData, { barWidth: 0.5 })
		scene.add(b)

		const s = scatter(coordinator, testData, { size: 5 })
		scene.add(s)

		const l = line(coordinator, testData, {})
		scene.add(l)

		const t = tick(coordinator, testData, {})
		scene.add(t)

		const r = new XRange(coordinator, { draggable: true })
		scene.add(r)

		return () => {
			scene.dispose()
		}
	}, [])

	return (
		<div className={styles.wrapper}>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
				style={{
					width: width,
					height: height,
					border: 'rgb(255, 255, 255) 3px solid',
					boxShadow: '#00000076 0 0 10px 1px',
				}}
			/>
		</div>
	)
}

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
		this.indicator.style.strokeStyle = randomColor(0.5)
		this.indicator.addEventListener('beforeRender', (e) => {
			this.indicator.x = this.viewportX
			this.indicator.y = this.viewportY
			this.indicator.width = this.viewportWidth
			this.indicator.height = this.viewportHeight
		})
	}

	isInViewport(x: number, y: number) {
		return x >= this.xStart && x <= this.xEnd && y >= this.yStart && y <= this.yEnd
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

		const xArrowUp = new SegmentShape()
		arrow && this.add(xArrowUp)
		xArrowUp.style.strokeStyle = 'red'
		xArrowUp.style.lineWidth = 2
		xArrowUp.dx = -10
		xArrowUp.dy = -10

		const xArrowDown = new SegmentShape()
		arrow && this.add(xArrowDown)
		xArrowDown.style.strokeStyle = 'red'
		xArrowDown.style.lineWidth = 2
		xArrowDown.dx = -10
		xArrowDown.dy = 10

		const yAxis = new SegmentShape()
		this.add(yAxis)
		yAxis.style.strokeStyle = 'green'
		yAxis.style.lineWidth = 2
		yAxis.dx = 0
		yAxis.dy = -100

		const yArrowLeft = new SegmentShape()
		arrow && this.add(yArrowLeft)
		yArrowLeft.style.strokeStyle = 'green'
		yArrowLeft.style.lineWidth = 2
		yArrowLeft.dx = 10
		yArrowLeft.dy = 10

		const yArrowRight = new SegmentShape()
		arrow && this.add(yArrowRight)
		yArrowRight.style.strokeStyle = 'green'
		yArrowRight.style.lineWidth = 2
		yArrowRight.dx = -10
		yArrowRight.dy = 10

		this.addEventListener('beforeRender', (e) => {
			// const scene = e.currentTarget
			// const right = scene.canvas.width - scene.translate.x
			// const top = -scene.translate.y

			const right = this.coordinator.viewportX + this.coordinator.viewportWidth
			const top = this.coordinator.viewportY

			const left = this.coordinator.viewportX
			const bottom = this.coordinator.viewportY + this.coordinator.viewportHeight

			const origin = followOrigin ? this.coordinator.project(0, 0) : [left, bottom]

			xAxis.x = origin[0]
			xAxis.y = origin[1]
			xAxis.dx = right - xAxis.x + arrowExtend

			xArrowUp.x = right + arrowExtend
			xArrowUp.y = origin[1]
			xArrowDown.x = right + arrowExtend
			xArrowDown.y = origin[1]

			yAxis.x = origin[0]
			yAxis.y = origin[1]
			yAxis.dy = top - yAxis.y - arrowExtend

			yArrowLeft.x = origin[0]
			yArrowLeft.y = top - arrowExtend
			yArrowRight.x = origin[0]
			yArrowRight.y = top - arrowExtend
		})
	}
}

/**
 * 使用鼠标控制场景的缩放和平移，滚轮缩放，右键平移，缩放时以鼠标位置为中心
 * @return 取消监听函数
 */
export function coordinatorPointerControl(
	scene: Scene,
	coordinator: CartesianCoordinator,
	options?: { lockX?: boolean; lockY?: boolean; lockScale?: boolean }
) {
	const { lockX = false, lockY = false, lockScale = false } = options || {}

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
				coordinator.xStart = initXStart - (x - startX) * coordinatorScaleX
				coordinator.xEnd = initXEnd - (x - startX) * coordinatorScaleX
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

export function scatter(
	coordinator: CartesianCoordinator,
	data: { x: number; y: number; color?: string; size?: number }[],
	config?: { color?: string; size?: number }
) {
	const { color, size = 10 } = config || {}

	const plot = new Shape()

	data.map((item) => {
		const c = item.color ?? color ?? randomColor()
		const s = item.size ?? size

		const p = point()
		p.style.fillStyle = c
		p.radius = s

		p.addEventListener('beforeRender', (e) => {
			const pos = coordinator.project(item.x, item.y)
			p.x = pos[0]
			p.y = pos[1]
		})

		plot.add(p)
	})

	return plot
}

export function line(
	coordinator: CartesianCoordinator,
	data: { x: number; y: number }[],
	config?: { lineWidth?: number; color?: string }
) {
	const { color = randomColor(), lineWidth = 2 } = config || {}

	const plot = new Shape()

	const ordered = data.slice().sort((a, b) => a.x - b.x)

	const line = new PolylineShape()
	line.style.strokeStyle = color
	line.style.lineWidth = lineWidth

	ordered.map((item) => {
		const pos = coordinator.project(item.x, item.y)
		line.points.push({ x: pos[0], y: pos[1] })
	})

	plot.addEventListener('beforeRender', (e) => {
		line.points = []

		ordered.map((item) => {
			const pos = coordinator.project(item.x, item.y)
			line.points.push({ x: pos[0], y: pos[1] })
		})
	})

	plot.add(line)

	return plot
}

export function bar(
	coordinator: CartesianCoordinator,
	data: { x: number; y: number; color?: string }[],
	config?: { barWidth?: number; color?: string }
) {
	const { color = randomColor(0.5), barWidth = 1 } = config || {}

	const plot = new Shape()

	const ordered = data.slice().sort((a, b) => a.x - b.x)

	const bars = new WeakMap<(typeof data)[number], RectShape>()

	ordered.map((item) => {
		const bar = new RectShape()
		bar.style.fillStyle = item.color ?? color
		plot.add(bar)
		bars.set(item, bar)
	})

	plot.addEventListener('beforeRender', (e) => {
		ordered.map((item) => {
			const bar = bars.get(item)
			if (!bar) throw new Error('bar data not found')

			const [left, top] = coordinator.project(item.x - barWidth / 2, 0)
			const [right, bottom] = coordinator.project(item.x + barWidth / 2, item.y)

			bar.x = left
			bar.y = bottom
			bar.width = right - left
			bar.height = top - bottom
		})
	})

	return plot
}

/**
 * 生成坐标轴刻度
 */
export function tick(
	coordinator: CartesianCoordinator,
	data: { x: number; y: number }[],
	config?: {
		minDistance?: number
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

		const tickX = new Shape()
		const tickY = new Shape()

		// x
		{
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
				tick.style.strokeStyle = 'red'
				tick.style.lineWidth = 2
				tick.dx = 0
				tick.dy = 10

				const pos = coordinator.project(x, 0)
				tick.x = pos[0]
				tick.y = coordinator.bottom

				tickX.add(tick)

				const text = new TextShape()
				text.text = xToString(x)
				text.style.fillStyle = 'red'
				text.style.textAlign = 'center'
				text.style.textBaseline = 'top'
				text.style.font = '12px sans-serif'
				text.x = pos[0]
				text.y = coordinator.bottom + 20
				tickX.add(text)
			}
		}

		// y
		{
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
				tick.style.strokeStyle = 'green'
				tick.style.lineWidth = 2
				tick.dx = -10
				tick.dy = 0

				const pos = coordinator.project(0, y)
				tick.x = coordinator.left
				tick.y = pos[1]

				tickY.add(tick)

				const text = new TextShape()
				text.text = yToString(y)
				text.style.fillStyle = 'green'
				text.style.textAlign = 'right'
				text.style.textBaseline = 'middle'
				text.style.font = '12px sans-serif'
				text.x = coordinator.left - 15
				text.y = pos[1]
				tickY.add(text)
			}
		}

		group.add(tickX)
		group.add(tickY)
	}

	update()

	coordinator.addEventListener('update', (e) => {
		update()
	})

	return group
}

/**
 * x 轴的区域
 */
export class XRange extends RectShape {
	xStart = 0
	xEnd = 50

	constructor(
		public coordinator: CartesianCoordinator,
		public config?: {
			color?: string
			draggable?: boolean
			// onChange?: (xStart: number, xEnd: number) => void
		}
	) {
		super()

		const seed = Math.random()
		const { color = randomColor(0.2, seed) } = config || {}

		this.style.fillStyle = color

		const startLine = new SegmentShape()
		startLine.style.zIndex = 2
		startLine.style.lineWidth = 5
		startLine.style.strokeStyle = randomColor(0.9, seed)
		this.add(startLine)

		const endLine = new SegmentShape()
		endLine.style.zIndex = 2
		endLine.style.lineWidth = 5
		endLine.style.strokeStyle = randomColor(0.9, seed)
		this.add(endLine)

		this.addEventListener('beforeRender', (e) => {
			this.y = coordinator.top
			this.height = coordinator.viewportHeight

			this.x = coordinator.project(this.xStart, 0)[0]
			this.width = coordinator.project(this.xEnd, 0)[0] - this.x

			startLine.x = 0
			startLine.y = 0
			startLine.dx = 0
			startLine.dy = coordinator.viewportHeight

			endLine.x = this.width
			endLine.y = 0
			endLine.dx = 0
			endLine.dy = coordinator.viewportHeight
		})

		if (config?.draggable) {
			draggable(this, (e) => {
				this.xStart = coordinator.unproject(e.x, 0)[0]
				this.xEnd = coordinator.unproject(e.x + this.width, 0)[0]
			})

			draggable(startLine, (e) => {
				this.x = coordinator.project(this.xStart, 0)[0]
				this.x += e.dx
				this.width -= e.dx

				if (this.width < 0) this.width = 0

				this.xStart = coordinator.unproject(this.x, 0)[0]
				this.xEnd = coordinator.unproject(this.x + this.width, 0)[0]
			})

			draggable(endLine, (e) => {
				this.width += e.dx

				if (this.width < 0) this.width = 0

				this.xEnd = coordinator.unproject(this.x + this.width, 0)[0]
			})
		}
	}
}

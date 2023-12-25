import { randomColor } from '../..'
import { PolylineShape, RectShape, SegmentShape } from '../../'
import { Shape } from '../core'
import { point } from '../extra'
import { CartesianCoordinator } from './coordinate'

export function scatterPlot(
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

export function linePlot(
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

	plot.userData.polyline = line

	return plot
}

export function barPlot(
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

export function candlestickPlot(
	coordinator: CartesianCoordinator,
	data: { x: number; open: number; close: number; high: number; low: number }[],
	config?: { barWidth?: number }
) {
	const { barWidth = 1 } = config || {}

	const plot = new Shape()

	const ordered = data.slice().sort((a, b) => a.x - b.x)

	const bars = new WeakMap<(typeof data)[number], RectShape>()
	const shadows = new WeakMap<(typeof data)[number], SegmentShape>()

	ordered.map((item) => {
		const bar = new RectShape()
		const shadow = new SegmentShape()
		shadow.style.lineWidth = 2
		if (item.open > item.close) {
			bar.style.fillStyle = 'green'
			shadow.style.strokeStyle = 'green'
		} else {
			bar.style.fillStyle = 'red'
			shadow.style.strokeStyle = 'red'
		}

		plot.add(shadow)
		plot.add(bar)

		bars.set(item, bar)
		shadows.set(item, shadow)
	})

	plot.addEventListener('beforeRender', (e) => {
		ordered.map((item) => {
			const bar = bars.get(item)
			if (!bar) throw new Error('bar data not found')

			const shadow = shadows.get(item)
			if (!shadow) throw new Error('shadow data not found')

			const [left, top] = coordinator.project(
				item.x - barWidth / 2,
				item.open > item.close ? item.open : item.close
			)

			const [right, bottom] = coordinator.project(
				item.x + barWidth / 2,
				item.open > item.close ? item.close : item.open
			)

			bar.x = left
			bar.y = bottom
			bar.width = right - left
			bar.height = top - bottom

			const shadowTop = coordinator.project(item.x, item.high)
			const shadowBottom = coordinator.project(item.x, item.low)

			shadow.x = shadowTop[0]
			shadow.y = shadowTop[1]
			shadow.dx = 0
			shadow.dy = shadowBottom[1] - shadowTop[1]
		})
	})

	return plot
}

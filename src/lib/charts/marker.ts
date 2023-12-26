import { PointerEvents, Scene, randomColor } from '../..'
import { draggable } from '../extra'
import { RectShape, SegmentShape } from '../shapes'
import { CartesianCoordinator } from './coordinate'

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
			borderColor?: string
			borderHoverColor?: string
			editable?: boolean
			onEdit?: (xRange: XRange) => void
			min?: number
			max?: number
		}
	) {
		super()

		const seed = Math.random()
		const { color = randomColor(0.2, seed) } = config || {}
		const { borderColor = randomColor(0.9, seed) } = config || {}
		const { borderHoverColor } = config || {}
		const { min = -Infinity, max = Infinity } = config || {}

		this.style.fillStyle = color

		const startLine = new SegmentShape()
		startLine.style.zIndex = 5
		startLine.style.lineWidth = 5
		startLine.style.strokeStyle = borderColor
		borderHoverColor && (startLine.hoverStyle.strokeStyle = borderHoverColor)
		this.add(startLine)

		const endLine = new SegmentShape()
		endLine.style.zIndex = 5
		endLine.style.lineWidth = 5
		endLine.style.strokeStyle = borderColor
		borderHoverColor && (endLine.hoverStyle.strokeStyle = borderHoverColor)
		this.add(endLine)

		this.addEventListener('beforeRender', (e) => {
			this.y = coordinator.top
			this.height = coordinator.viewportHeight

			this.x = coordinator.project(this.xStart, 0)[0]
			this.width = coordinator.project(this.xEnd, 0)[0] - this.x

			startLine.x = 0 - (startLine.style.lineWidth || 1) / 2
			startLine.y = 0
			startLine.dx = 0
			startLine.dy = coordinator.viewportHeight

			endLine.x = this.width + (startLine.style.lineWidth || 1) / 2
			endLine.y = 0
			endLine.dx = 0
			endLine.dy = coordinator.viewportHeight
		})

		if (config?.editable) {
			draggable(
				this,
				(e) => {
					this.xStart = coordinator.unproject(e.x, 0)[0]
					this.xEnd = coordinator.unproject(e.x + this.width, 0)[0]

					if (this.xStart < min) {
						const w = this.xEnd - this.xStart
						this.xStart = min
						this.xEnd = min + w
						e.x = coordinator.project(min, 0)[0]
					}

					if (this.xEnd > max) {
						const w = this.xEnd - this.xStart
						this.xEnd = max
						this.xStart = max - w
						e.x = coordinator.project(max, 0)[0]
					}
				},
				(e) => config?.onEdit?.(this)
			)

			draggable(
				startLine,
				(e) => {
					this.x = coordinator.project(this.xStart, 0)[0]
					this.x += e.dx
					this.width -= e.dx

					if (this.width < 0) this.width = 0

					this.xStart = coordinator.unproject(this.x, 0)[0]
					this.xEnd = coordinator.unproject(this.x + this.width, 0)[0]
				},
				() => {
					this.xStart = Math.min(Math.max(this.xStart, min), max)
					this.xEnd = Math.min(Math.max(this.xEnd, min), max)
					this.x = coordinator.project(this.xStart, 0)[0]
					this.width = coordinator.project(this.xEnd, 0)[0] - this.x

					config?.onEdit?.(this)
				}
			)

			draggable(
				endLine,
				(e) => {
					this.width += e.dx

					if (this.width < 0) this.width = 0

					this.xEnd = coordinator.unproject(this.x + this.width, 0)[0]
				},
				() => {
					this.xStart = Math.min(Math.max(this.xStart, min), max)
					this.xEnd = Math.min(Math.max(this.xEnd, min), max)
					this.x = coordinator.project(this.xStart, 0)[0]
					this.width = coordinator.project(this.xEnd, 0)[0] - this.x

					config?.onEdit?.(this)
				}
			)
		}
	}
}

export function drawXRange(
	scene: Scene,
	coordinator: CartesianCoordinator,
	config?: {
		color?: string
		borderColor?: string
		borderHoverColor?: string
		editable?: boolean
		onEdit?: (xRange: XRange) => void
		min?: number
		max?: number
		onAdd?: (xRange: XRange) => void
	}
) {
	let temp: XRange | undefined

	const handlePointerDown = (event: PointerEvents['pointerdown']) => {
		const e = event.srcEvent

		if (e.button !== 0) return
		if (event.target !== event.currentTarget) return

		e.preventDefault()

		const { left, top } = scene.canvas.getBoundingClientRect() || { left: 0, top: 0 }

		const startX = e.clientX - left
		const startY = e.clientY - top

		if (
			coordinator.viewportX > startX ||
			coordinator.viewportX + coordinator.viewportWidth < startX ||
			coordinator.viewportY > startY ||
			coordinator.viewportY + coordinator.viewportHeight < startY
		)
			return

		temp = new XRange(coordinator, {
			...config,
			editable: false,
		})
		scene.add(temp)

		temp.xStart = coordinator.unproject(startX, 0)[0]
		temp.xEnd = coordinator.unproject(startX, 0)[0]

		const handlePointerMove = (event: PointerEvents['pointermove']) => {
			const e = event.srcEvent

			const x = e.clientX - left

			temp!.xEnd = coordinator.unproject(x, 0)[0]

			coordinator.dispatchEvent({ type: 'update' })
		}

		// @note: 只监听了 Pointer up，所以鼠标移出了 canvas 也会继续平移，如果需要处理移出页面需要额外逻辑
		const handlePointerUp = (event: PointerEvents['pointerup']) => {
			scene.removeEventListener('pointermove', handlePointerMove)
			scene.removeEventListener('pointerup', handlePointerUp)

			scene.remove(temp!)

			const result = new XRange(coordinator, config)
			result.xStart = temp!.xStart
			result.xEnd = temp!.xEnd

			if (result.xStart > result.xEnd) {
				const x = result.xStart
				result.xStart = result.xEnd
				result.xEnd = x
			}

			scene.add(result)

			if (config?.onAdd) config.onAdd(result)
		}

		scene.addEventListener('pointermove', handlePointerMove)
		scene.addEventListener('pointerup', handlePointerUp)
	}

	scene.addEventListener('pointerdown', handlePointerDown)

	return () => {
		scene.removeEventListener('pointerdown', handlePointerDown)
		if (temp && scene.children.has(temp)) {
			scene.remove(temp)
		}
	}
}

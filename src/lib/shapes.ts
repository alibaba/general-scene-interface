import { Shape } from './core'
import { distance, distancePointToSegmentVector, getPerpFoot } from './math'
import type { ExtendedCanvasStyles } from './styles'

/**
 * 矩形
 */
export class RectShape extends Shape {
	constructor(
		public x: number = 0,
		public y: number = 0,
		public width: number = 100,
		public height: number = 100
	) {
		super()
	}

	hit(x: number, y: number) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const halfWidth = this.width / 2
		const halfHeight = this.height / 2

		const revX = (x - tx) / s
		const revY = (y - ty) / s

		return (
			revX >= this.x - halfWidth &&
			revX <= this.x + halfWidth &&
			revY >= this.y - halfHeight &&
			revY <= this.y + halfHeight
		)
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const halfWidth = this.width / 2
		const halfHeight = this.height / 2

		const viewX = (this.x - halfWidth) * s + tx
		const viewY = (this.y - halfHeight) * s + ty
		const viewWidth = this.width * s
		const viewHeight = this.height * s

		ctx.rect(viewX, viewY, viewWidth, viewHeight)
		ctx.globalAlpha = this.styles.fillOpacity === undefined ? 1 : this.styles.fillOpacity
		this._fill && ctx.fill()
		ctx.globalAlpha = this.styles.strokeOpacity === undefined ? 1 : this.styles.strokeOpacity
		this._stroke && ctx.stroke()
	}
}

/**
 * 圆形
 */
export class CircleShape extends Shape {
	/**
	 * 使用固定像素的半径，不缩放
	 */
	fixedRadius = false

	constructor(
		public x: number = 0,
		public y: number = 0,
		public radius: number = 100
	) {
		super()
	}

	hit(x: number, y: number) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const revX = (x - tx) / s
		const revY = (y - ty) / s

		return (
			Math.sqrt((revX - this.x) ** 2 + (revY - this.y) ** 2) <=
			this.radius / (this.fixedRadius ? s : 1)
		)
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const viewX = this.x * s + tx
		const viewY = this.y * s + ty
		const viewRadius = this.radius * s

		ctx.arc(viewX, viewY, viewRadius / (this.fixedRadius ? s : 1), 0, 2 * Math.PI)
		ctx.globalAlpha = this.styles.fillOpacity === undefined ? 1 : this.styles.fillOpacity
		this._fill && ctx.fill()
		ctx.globalAlpha = this.styles.strokeOpacity === undefined ? 1 : this.styles.strokeOpacity
		this._stroke && ctx.stroke()
	}
}

/**
 * 线段（起点+方向向量定义）
 */
export class SegmentShape extends Shape {
	constructor(
		/**
		 * 起点 x
		 */
		public x: number = 0,
		/**
		 * 起点 y
		 */
		public y: number = 0,
		/**
		 * 方向向量 x
		 */
		public dx: number = 100,
		/**
		 * 方向向量 y
		 */
		public dy: number = 100
	) {
		super()

		this.styles.fill = false
		this.styles.stroke = true
	}

	hit(x: number, y: number) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const revX = (x - tx) / s
		const revY = (y - ty) / s

		const dPx = revX - this.x
		const dPy = revY - this.y

		const distance = distancePointToSegmentVector(dPx, dPy, this.dx, this.dy)

		let width = this.styles.lineWidth || 2

		if (this._hover) width = this.hoverStyles.lineWidth ?? width
		if (this._active) width = this.activeStyles.lineWidth ?? width

		return distance <= width / s / 2
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const viewX = this.x * s + tx
		const viewY = this.y * s + ty
		const viewDx = this.dx * s
		const viewDy = this.dy * s

		ctx.moveTo(viewX, viewY)
		ctx.lineTo(viewX + viewDx, viewY + viewDy)
		ctx.globalAlpha = this.styles.strokeOpacity === undefined ? 1 : this.styles.strokeOpacity
		this._stroke && ctx.stroke()
	}
}

/**
 * 折线（起点+方向向量定义）
 */
export class PolylineShape extends Shape {
	constructor(
		/**
		 * 起点 x
		 */
		public x: number = 0,
		/**
		 * 起点 y
		 */
		public y: number = 0,

		/**
		 * 点序列（位置相对于起点）
		 */
		public points: { x: number; y: number }[] = [],

		/**
		 * 是否闭合（最后一个点连回第一个点）
		 */
		public closed: boolean = false
	) {
		super()

		this.styles.fill = false
		this.styles.stroke = true
	}

	hit(x: number, y: number) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const revX = (x - tx) / s
		const revY = (y - ty) / s

		let width = this.styles.lineWidth || 2

		if (this._hover) width = this.hoverStyles.lineWidth ?? width
		if (this._active) width = this.activeStyles.lineWidth ?? width

		width = width / s / 2

		// TODO: 优化, bbox?
		const len = this.closed ? this.points.length + 1 : this.points.length
		for (let i = 0; i < len; i++) {
			const lastVec = this.points[i - 1] || { x: 0, y: 0 }
			const currentVec = this.points[i] || { x: 0, y: 0 }

			const x1 = this.x + lastVec.x
			const y1 = this.y + lastVec.y

			const px = revX - x1
			const py = revY - y1

			const dx = currentVec.x - lastVec.x
			const dy = currentVec.y - lastVec.y

			let t = getPerpFoot(px, py, dx, dy)

			t = Math.max(0, Math.min(1, t))

			const x = t * dx
			const y = t * dy

			const d = distance(px, py, x, y)

			if (d <= width)
				return {
					/**
					 * 顶点索引
					 * - 0 -> 起点到 points 中的第一个点
					 * - points.length -> points 中的最后一个点回到起点（仅在闭合图形中出现）
					 */
					index: i,
					distance: d,
					t,
				}
		}

		return
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const { x, y } = this
		const viewX = x * s + tx
		const viewY = y * s + ty
		ctx.moveTo(viewX, viewY)

		for (let i = 0; i < this.points.length; i++) {
			const { x, y } = this.points[i]

			const viewX = (x + this.x) * s + tx
			const viewY = (y + this.y) * s + ty

			ctx.lineTo(viewX, viewY)
		}

		if (this.closed) ctx.closePath()

		ctx.globalAlpha = this.styles.strokeOpacity === undefined ? 1 : this.styles.strokeOpacity
		this._stroke && ctx.stroke()
	}
}

/**
 * 多边形
 */
export class PolygonShape extends Shape {
	constructor(
		/**
		 * 起点 x
		 */
		public x: number = 0,
		/**
		 * 起点 y
		 */
		public y: number = 0,

		/**
		 * 点序列（位置相对于起点）
		 */
		public points: { x: number; y: number }[] = []
	) {
		super()
	}

	hit(x: number, y: number) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const revX = (x - tx) / s - this.x
		const revY = (y - ty) / s - this.y

		let inside = false

		// 判断点 revX revY 是否在 polygon 内
		for (let i = 0; i <= this.points.length; i++) {
			const lastPoint = this.points[i - 1] || { x: 0, y: 0 }
			const currentPoint = this.points[i] || { x: 0, y: 0 }

			const x1 = lastPoint.x
			const y1 = lastPoint.y

			const x2 = currentPoint.x
			const y2 = currentPoint.y

			// 点在多边形内
			if (y1 > revY !== y2 > revY && revX < ((x2 - x1) * (revY - y1)) / (y2 - y1) + x1) {
				inside = !inside
			}
		}

		return inside
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const { x, y } = this
		const viewX = x * s + tx
		const viewY = y * s + ty
		ctx.moveTo(viewX, viewY)

		for (let i = 0; i < this.points.length; i++) {
			const { x, y } = this.points[i]

			const viewX = (x + this.x) * s + tx
			const viewY = (y + this.y) * s + ty

			ctx.lineTo(viewX, viewY)
		}

		ctx.closePath()

		ctx.globalAlpha = this.styles.fillOpacity === undefined ? 1 : this.styles.fillOpacity
		this._fill && ctx.fill()
		ctx.globalAlpha = this.styles.strokeOpacity === undefined ? 1 : this.styles.strokeOpacity
		this._stroke && ctx.stroke()
	}
}

/**
 * 图片（矩形）
 */
export class ImageShape extends RectShape {
	constructor(
		public image: HTMLImageElement,
		x: number = image.width / 2,
		y: number = image.height / 2,
		width: number = image.width,
		height: number = image.height
	) {
		super(x, y, width, height)
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const halfWidth = this.width / 2
		const halfHeight = this.height / 2

		const viewX = (this.x - halfWidth) * s + tx
		const viewY = (this.y - halfHeight) * s + ty
		const viewWidth = this.width * s
		const viewHeight = this.height * s

		ctx.imageSmoothingEnabled = true
		ctx.imageSmoothingQuality = 'high'

		ctx.drawImage(this.image, viewX, viewY, viewWidth, viewHeight)
	}
}

/**
 * 始终覆盖整个画布的蒙层
 * - 用于全局遮罩或者覆盖鼠标事件
 */
export class MaskShape extends Shape {
	readonly styles: Partial<ExtendedCanvasStyles> = { fillStyle: 'white', fillOpacity: 0.5 }

	hit(x: number, y: number) {
		return true
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { width, height } = ctx.canvas

		ctx.rect(0, 0, width, height)

		ctx.globalAlpha = this.styles.fillOpacity === undefined ? 1 : this.styles.fillOpacity
		this._fill && ctx.fill()
		ctx.globalAlpha = this.styles.strokeOpacity === undefined ? 1 : this.styles.strokeOpacity
		this._stroke && ctx.stroke()
	}
}

/**
 * 使用 Path2D 定义的图形
 */
export class PathShape extends Shape {
	constructor(public path: Path2D) {
		super()
	}

	hit(x: number, y: number, ctx: CanvasRenderingContext2D) {
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const revX = (x - tx) / s
		const revY = (y - ty) / s

		const localX = revX - this.x
		const localY = revY - this.y

		return ctx.isPointInPath(this.path, localX, localY)
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.translate(this._translate.x, this._translate.y)
		ctx.scale(this._scale, this._scale)
		ctx.translate(this.x, this.y)

		ctx.globalAlpha = this.styles.fillOpacity === undefined ? 1 : this.styles.fillOpacity
		this._fill && ctx.fill(this.path)
		ctx.globalAlpha = this.styles.strokeOpacity === undefined ? 1 : this.styles.strokeOpacity
		this._stroke && ctx.stroke(this.path)
	}
}

export class TextShape extends Shape {
	constructor(
		public x: number = 0,
		public y: number = 0,
		public text: string = '',
		public maxWidth?: number
	) {
		super()
		this.styles.font = '30px monospace'
	}

	fixedSize = false

	private textMetrics?: TextMetrics = undefined

	hit(x: number, y: number, ctx: CanvasRenderingContext2D) {
		if (this.textMetrics === undefined) return false

		const { width, actualBoundingBoxAscent, actualBoundingBoxDescent } = this.textMetrics

		const screenLeft = this.x * this._scale + this._translate.x
		const screenRight = screenLeft + width * (this.fixedSize ? 1 : this._scale)
		const screenTop =
			this.y * this._scale +
			this._translate.y -
			actualBoundingBoxAscent * (this.fixedSize ? 1 : this._scale)
		const screenBottom =
			screenTop +
			(actualBoundingBoxAscent + actualBoundingBoxDescent) * (this.fixedSize ? 1 : this._scale)

		return x >= screenLeft && x <= screenRight && y >= screenTop && y <= screenBottom
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.translate(this._translate.x, this._translate.y)
		ctx.scale(this._scale, this._scale)
		ctx.translate(this.x, this.y)
		this.fixedSize && ctx.scale(1 / this._scale, 1 / this._scale)

		ctx.globalAlpha = this.styles.fillOpacity === undefined ? 1 : this.styles.fillOpacity
		this._fill && ctx.fillText(this.text, 0, 0, this.maxWidth)
		ctx.globalAlpha = this.styles.strokeOpacity === undefined ? 1 : this.styles.strokeOpacity
		this._stroke && ctx.strokeText(this.text, 0, 0, this.maxWidth)

		this.textMetrics = ctx.measureText(this.text)
	}
}

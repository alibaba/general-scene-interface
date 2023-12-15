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
		const { x: left, y: top } = this.localToView(0, 0)
		const { x: right, y: bottom } = this.localToView(this.width, this.height)

		return x >= left && x <= right && y >= top && y <= bottom
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { x: left, y: top } = this.localToView(0, 0)
		const { x: right, y: bottom } = this.localToView(this.width, this.height)

		ctx.rect(left, top, right - left, bottom - top)

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
		const { x: localX, y: localY } = this.viewToLocal(x, y)

		return (
			Math.sqrt(localX ** 2 + localY ** 2) <= this.radius / (this.fixedRadius ? this._scale : 1)
		)
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { x: viewX, y: viewY } = this.localToView(0, 0)

		ctx.arc(
			viewX,
			viewY,
			this.fixedRadius ? this.radius : this.radius * this._scale,
			0,
			2 * Math.PI
		)

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
		const { x: dPx, y: dPy } = this.viewToLocal(x, y)

		const distance = distancePointToSegmentVector(dPx, dPy, this.dx, this.dy)

		let width = this.styles.lineWidth || 2

		if (this._hover) width = this.hoverStyles.lineWidth ?? width
		if (this._active) width = this.activeStyles.lineWidth ?? width

		return distance <= width / this._scale / 2
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { x: viewX, y: viewY } = this.localToView(0, 0)
		const { x: viewDx, y: viewDy } = this.localToView(this.dx, this.dy)

		ctx.moveTo(viewX, viewY)
		ctx.lineTo(viewDx, viewDy)
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
		const { x: revX, y: revY } = this.viewToLocal(x, y)

		let width = this.styles.lineWidth || 2

		if (this._hover) width = this.hoverStyles.lineWidth ?? width
		if (this._active) width = this.activeStyles.lineWidth ?? width

		width = width / this._scale / 2

		// TODO: 优化, bbox?
		const len = this.closed ? this.points.length + 1 : this.points.length
		for (let i = 1; i < len; i++) {
			const lastVec = this.points[i - 1]
			const currentVec = this.points[i] || this.points[0]

			const px = revX - lastVec.x
			const py = revY - lastVec.y

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
		const { x, y } = this.points[0]
		const { x: viewX, y: viewY } = this.localToView(x, y)
		ctx.moveTo(viewX, viewY)

		for (let i = 1; i < this.points.length; i++) {
			const { x, y } = this.points[i]
			const { x: viewX, y: viewY } = this.localToView(x, y)

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
		const { x: revX, y: revY } = this.viewToLocal(x, y)

		let inside = false

		// 判断点 revX revY 是否在 polygon 内
		for (let i = 1; i <= this.points.length; i++) {
			const lastPoint = this.points[i - 1]
			const currentPoint = this.points[i] || this.points[0]

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
		const { x, y } = this.points[0]
		const { x: viewX, y: viewY } = this.localToView(x, y)
		ctx.moveTo(viewX, viewY)

		for (let i = 1; i < this.points.length; i++) {
			const { x, y } = this.points[i]
			const { x: viewX, y: viewY } = this.localToView(x, y)

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
		x = 0,
		y = 0,
		width: number = image.width,
		height: number = image.height
	) {
		super(x, y, width, height)
	}

	draw(ctx: CanvasRenderingContext2D) {
		const { x: left, y: top } = this.localToView(0, 0)
		const { x: right, y: bottom } = this.localToView(this.width, this.height)

		ctx.imageSmoothingEnabled = true
		ctx.imageSmoothingQuality = 'high'

		ctx.drawImage(this.image, left, top, right - left, bottom - top)
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
		const { x: localX, y: localY } = this.viewToLocal(x, y)

		return ctx.isPointInPath(this.path, localX, localY)
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.translate(this._translate.x, this._translate.y)
		ctx.scale(this._scale, this._scale)

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

		const lt = this.localToView(0, 0)
		const screenLeft = lt.x
		const screenRight = screenLeft + width * (this.fixedSize ? 1 : this._scale)
		const screenTop = lt.y - actualBoundingBoxAscent * (this.fixedSize ? 1 : this._scale)
		const screenBottom =
			screenTop +
			(actualBoundingBoxAscent + actualBoundingBoxDescent) * (this.fixedSize ? 1 : this._scale)

		return x >= screenLeft && x <= screenRight && y >= screenTop && y <= screenBottom
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.translate(this._translate.x, this._translate.y)
		ctx.scale(this._scale, this._scale)
		this.fixedSize && ctx.scale(1 / this._scale, 1 / this._scale)

		ctx.globalAlpha = this.styles.fillOpacity === undefined ? 1 : this.styles.fillOpacity
		this._fill && ctx.fillText(this.text, 0, 0, this.maxWidth)
		ctx.globalAlpha = this.styles.strokeOpacity === undefined ? 1 : this.styles.strokeOpacity
		this._stroke && ctx.strokeText(this.text, 0, 0, this.maxWidth)

		this.textMetrics = ctx.measureText(this.text)
	}
}

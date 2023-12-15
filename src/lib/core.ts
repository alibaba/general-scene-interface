import { EventDispatcher } from './EventDispatcher'
import type { SceneEvents, ShapeEvents } from './events'
import { CanvasStyles, ExtendedCanvasStyles, getAssignableStyles } from './styles'

/**
 * 可绘制图形的虚基类
 */
export abstract class Shape extends EventDispatcher<ShapeEvents> {
	// 样式
	readonly styles: Partial<ExtendedCanvasStyles> = { fillStyle: 'red' }
	readonly hoverStyles: Partial<CanvasStyles> = {}
	readonly activeStyles: Partial<CanvasStyles> = {}

	readonly children: Shape[] = []

	// 位置（局部坐标的原点，派生类中的坐标都为局部坐标）
	x: number = 0
	y: number = 0

	scale = 1

	visible = true

	readonly userData = {} as any

	// 以下为内部只读状态，渲染时由 renderer 指定，派生类应视为只读状态，每次 hit 或 draw 之前更新

	_visible = true

	_hover = false
	_active = false

	_scale = 1
	_translate = { x: 0, y: 0 }

	_fill = true
	_stroke = false

	_render(ctx: CanvasRenderingContext2D) {
		ctx.save()
		ctx.beginPath() // 必要，否则上一个物体的轮廓会影响下一个物体的绘制

		Object.assign(ctx, getAssignableStyles(this.styles))

		if (this._hover) Object.assign(ctx, getAssignableStyles(this.hoverStyles))
		if (this._active) Object.assign(ctx, getAssignableStyles(this.activeStyles))

		if (this.styles.lineDash) ctx.setLineDash(this.styles.lineDash)

		this.draw(ctx)

		ctx.restore()
	}

	/**
	 * 将局部坐标转换为视图坐标（canvas坐标系，左上角为原点，像素为单位）
	 */
	localToView(x: number, y: number) {
		return {
			x: x * this._scale + this._translate.x,
			y: y * this._scale + this._translate.y,
		}
	}

	/**
	 * 将视图坐标转换为局部坐标
	 */
	viewToLocal(x: number, y: number) {
		return {
			x: (x - this._translate.x) / this._scale,
			y: (y - this._translate.y) / this._scale,
		}
	}

	add(shapes: Shape | Shape[]) {
		if (Array.isArray(shapes)) {
			for (const shape of shapes) {
				this.add(shape)
			}
			return
		} else {
			this.children.push(shapes)
			this.dispatchEvent({ type: 'add', target: shapes, currentTarget: this })
		}
	}

	remove(shape: Shape) {
		const index = this.children.indexOf(shape)

		if (index !== -1) {
			this.children.splice(index, 1)
			this.dispatchEvent({ type: 'remove', target: shape, currentTarget: this })
		}
	}

	traverse(fn: (shape: Shape, parent?: Shape) => void, parent?: Shape) {
		fn(this, parent)
		for (const shape of this.children) {
			shape.traverse(fn, this)
		}
	}

	// 派生形状需实现以下两个接口

	/**
	 * 检测点是否命中形状
	 * @return true | object 命中，false | undefined 未命中
	 */
	abstract hit(x: number, y: number, ctx: CanvasRenderingContext2D): boolean | void | object
	abstract draw(ctx: CanvasRenderingContext2D): void
}

/**
 * @deprecated
 */
export class ShapeGroup<T extends Shape = Shape> extends Shape {
	constructor(children?: T[]) {
		super()
		if (children) this.add(children)
	}

	readonly children = [] as T[]

	add(shapes: T | T[]) {
		super.add(shapes)
	}

	hit() {}
	draw() {}
}

/**
 * 场景
 */
export class Scene extends EventDispatcher<SceneEvents> {
	readonly canvas: HTMLCanvasElement
	readonly ctx: CanvasRenderingContext2D

	// 全局变换
	scale = 1
	translate = { x: 0, y: 0 }

	// 画布指针样式
	cursor = 'default'

	// 帧率限制
	maxFPS = 60

	private children: Shape[] = []

	/**
	 * the shape that is currently being focused for pointer events
	 */
	private activeShape: Shape | null = null
	private hoveringShape: Shape | null = null

	/**
	 * requestAnimationFrame id
	 */
	private rafID: number | null = null

	/**
	 * 保存 dom 事件监听器，用于 dispose 时移除
	 */
	private domListeners = new Set<readonly [HTMLElement, string, (e: any) => void]>()

	readonly userData = {} as any

	constructor(canvas: HTMLCanvasElement) {
		super()

		this.canvas = canvas
		this.ctx = canvas.getContext('2d')!

		const onPointerDown = (e: PointerEvent) => {
			this.canvas.setPointerCapture(e.pointerId)

			// find the shape that is being clicked

			const x = e.offsetX
			const y = e.offsetY

			const hitShape = this.getHitShape(x, y)
			const activeShape = hitShape?.shape
			const hitResult = hitShape?.res

			if (activeShape) {
				this.activeShape = activeShape

				activeShape.dispatchEvent({
					srcEvent: e,
					type: 'pointerdown',
					target: activeShape,
					currentTarget: activeShape,
					hitResult,
				})
			}

			// 冒泡
			this.dispatchEvent({
				srcEvent: e,
				type: 'pointerdown',
				target: activeShape || this,
				currentTarget: this,
			})
		}
		this.canvas.addEventListener('pointerdown', onPointerDown)
		this.domListeners.add([this.canvas, 'pointerdown', onPointerDown])

		const onPointerUp = (e: PointerEvent) => {
			if (this.activeShape) {
				this.activeShape.dispatchEvent({
					srcEvent: e,
					type: 'pointerup',
					target: this.activeShape,
					currentTarget: this.activeShape,
				})

				// 冒泡
				this.dispatchEvent({
					srcEvent: e,
					type: 'pointerup',
					target: this.activeShape,
					currentTarget: this,
				})

				this.activeShape = null
				this.canvas.releasePointerCapture(e.pointerId)
			} else {
				// 冒泡
				this.dispatchEvent({
					srcEvent: e,
					type: 'pointerup',
					target: this,
					currentTarget: this,
				})
			}
		}
		this.canvas.addEventListener('pointerup', onPointerUp)
		this.domListeners.add([this.canvas, 'pointerup', onPointerUp])

		const onPointerMove = (e: PointerEvent) => {
			// enter / leave
			const x = e.offsetX
			const y = e.offsetY

			this.checkShapeRef()

			// activeShape 的周期在 mousedown mouseup 之间
			// 有 activeShape 时不和其他 shape 交互（不检测其他shape的碰撞）

			if (this.activeShape) {
				this.activeShape.dispatchEvent({
					srcEvent: e,
					type: 'pointermove',
					target: this.activeShape,
					currentTarget: this.activeShape,
					hitResult: this.activeShape.hit(x, y, this.ctx),
				})
			} else {
				const res = this.getHitShape(x, y)
				const hitShape = res?.shape || null
				const hitResult = res?.res

				// hover 变化时先触发 enter leave
				if (hitShape !== this.hoveringShape) {
					this.hoveringShape?.dispatchEvent({
						srcEvent: e,
						type: 'pointerleave',
						target: this.hoveringShape,
						currentTarget: this.hoveringShape,
					})

					hitShape?.dispatchEvent({
						srcEvent: e,
						type: 'pointerenter',
						target: hitShape,
						currentTarget: hitShape,
						hitResult,
					})

					this.hoveringShape = hitShape
				}

				// 触发 hover 目标的 move
				this.hoveringShape?.dispatchEvent({
					srcEvent: e,
					type: 'pointermove',
					target: this.hoveringShape,
					currentTarget: this.hoveringShape,
					hitResult,
				})
			}

			// 冒泡
			this.dispatchEvent({
				srcEvent: e,
				type: 'pointermove',
				target: this.activeShape || this.hoveringShape || this,
				currentTarget: this,
			})
		}
		this.canvas.addEventListener('pointermove', onPointerMove)
		this.domListeners.add([this.canvas, 'pointermove', onPointerMove])

		const onPointerEnter = (e: PointerEvent) => {
			this.dispatchEvent({
				srcEvent: e,
				type: 'pointerenter',
				target: this,
				currentTarget: this,
			})
		}
		this.canvas.addEventListener('pointerenter', onPointerEnter)
		this.domListeners.add([this.canvas, 'pointerenter', onPointerEnter])

		const onPointerLeave = (e: PointerEvent) => {
			this.checkShapeRef()

			if (this.hoveringShape) {
				this.hoveringShape.dispatchEvent({
					srcEvent: e,
					type: 'pointerleave',
					target: this.hoveringShape,
					currentTarget: this.hoveringShape,
				})

				this.hoveringShape = null
			}

			this.dispatchEvent({
				srcEvent: e,
				type: 'pointerleave',
				target: this,
				currentTarget: this,
			})
		}
		this.canvas.addEventListener('pointerleave', onPointerLeave)
		this.domListeners.add([this.canvas, 'pointerleave', onPointerLeave])

		let currentTime: number | null = null
		const tick = (t: number | null) => {
			if (currentTime !== null && t !== null) {
				const minDt = 1000 / this.maxFPS - 5 // 5ms 误差
				const dt = t - currentTime
				if (dt < minDt) {
					this.rafID = requestAnimationFrame(tick)
					return
				}
			}

			currentTime = t
			this.rafID = requestAnimationFrame(tick)
			this.render()
		}

		tick(null)
	}

	add(child: Shape) {
		this.children.push(child)
		this.dispatchEvent({ type: 'add', target: child, currentTarget: this })
	}

	remove(child: Shape) {
		const index = this.children.indexOf(child)

		if (index !== -1) {
			this.children.splice(index, 1)
			this.dispatchEvent({ type: 'remove', target: child, currentTarget: this })
		}
	}

	reset() {
		this.children = []
		this.activeShape = null
		this.hoveringShape = null
	}

	render() {
		this.dispatchEvent({ type: 'beforeRender', target: this, currentTarget: this })

		// 鼠标样式 reset
		this.canvas.style.cursor = this.cursor

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

		const shapes = this.getShapeList().filter((s) => s._visible)

		for (const shape of shapes) {
			shape.dispatchEvent({ type: 'beforeRender', target: shape, currentTarget: this })
		}

		this.updateSceneGraph()

		for (const shape of shapes) {
			// 描边填色 reset
			shape._fill = true
			shape._stroke = false

			if (shape.styles.fill !== undefined) shape._fill = shape.styles.fill

			if (shape.styles.stroke !== undefined) shape._stroke = shape.styles.stroke

			if (this.hoveringShape === shape) {
				shape._hover = true
				if (shape.hoverStyles.cursor) this.canvas.style.cursor = shape.hoverStyles.cursor
				if (shape.hoverStyles.fill !== undefined) shape._fill = shape.hoverStyles.fill
				if (shape.hoverStyles.stroke !== undefined) shape._stroke = true
			} else {
				shape._hover = false
			}

			if (this.activeShape === shape) {
				shape._active = true
				if (shape.activeStyles.cursor) this.canvas.style.cursor = shape.activeStyles.cursor
				if (shape.activeStyles.fill !== undefined) shape._fill = shape.activeStyles.fill
				if (shape.activeStyles.stroke !== undefined) shape._stroke = shape.activeStyles.stroke
			} else {
				shape._active = false
			}

			shape._render(this.ctx)
		}
	}

	/**
	 * 获取所有 shape 列表
	 */
	private getShapeList() {
		const shapes = [] as Shape[]
		for (const shape of this.children) {
			shape.traverse((s) => shapes.push(s))
		}

		shapes.sort((a, b) => (a.styles.zIndex || 0) - (b.styles.zIndex || 0))

		return shapes
	}

	/**
	 * 更新场景树中的所有节点，处理继承规则
	 */
	updateSceneGraph() {
		for (const child of this.children) {
			child.traverse((shape, parent) => {
				// console.log(parent)
				if (parent) {
					shape._visible = shape.visible && parent._visible
				} else {
					shape._visible = shape.visible
				}

				if (!shape._visible) return

				if (parent) {
					/**
					 * 场景树分层变换的叠加
					 * - 0 local
					 * x' = x * s + t
					 * - 1 level parent
					 * x' = (x * s + t) * sp + tp
					 * 	  = x * sp * s + t * sp + tp
					 *    = x * (sp * s) + (t * sp + tp)
					 * - 2 level parent
					 * x' = ((x * s + t) * sp + tp) * spp + tpp
					 *    = x * spp * sp * s + t * spp * sp + tp * spp + tpp
					 *    = x * (spp * sp * s) + (t * spp * sp + tp * spp + tpp)
					 */

					shape._scale = shape.scale * parent._scale

					const xy = parent.localToView(shape.x, shape.y)
					shape._translate.x = xy.x
					shape._translate.y = xy.y
				} else {
					shape._scale = shape.scale * this.scale
					shape._translate.x = shape.x * this.scale + this.translate.x
					shape._translate.y = shape.y * this.scale + this.translate.y
				}
			})
		}
	}

	/**
	 * 确认保存引用的 shape 依然在场景中
	 */
	private checkShapeRef() {
		const shapes = this.getShapeList().filter((s) => s._visible)

		if (this.activeShape && !shapes.includes(this.activeShape)) {
			this.activeShape = null
		}
		if (this.hoveringShape && !shapes.includes(this.hoveringShape)) {
			this.hoveringShape = null
		}
	}

	/**
	 * 查找碰撞图形
	 */
	private getHitShape(x: number, y: number) {
		this.updateSceneGraph()

		const shapes = this.getShapeList().filter((s) => s._visible)

		// 逆向查找
		for (let i = shapes.length - 1; i >= 0; i--) {
			const shape = shapes[i]

			const res = shape.styles.pointerEvents !== 'none' && shape.hit(x, y, this.ctx)

			if (res) return { shape, res }
		}
	}

	/**
	 * 销毁场景
	 * @note 不会销毁canvas和上下文
	 */
	dispose() {
		this.reset()
		if (this.rafID) {
			cancelAnimationFrame(this.rafID)
			this.rafID = null
		}
		for (const [target, type, listener] of this.domListeners) {
			target.removeEventListener(type, listener)
		}
		this.domListeners.clear()
	}

	fit(contentWidth: number, contentHeight: number, padding: number) {
		const { width, height } = this.canvas

		const scale = Math.min(
			(width - padding * 2) / contentWidth,
			(height - padding * 2) / contentHeight
		)

		this.scale = scale

		this.translate.x = (width - contentWidth * scale) / 2
		this.translate.y = (height - contentHeight * scale) / 2
	}
}

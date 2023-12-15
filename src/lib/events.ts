import type { EventDispatcher } from './EventDispatcher'
import type { Scene, Shape, ShapeGroup } from './core'

/**
 * 代理的鼠标事件
 */
export type PointerEvents = {
	pointerdown: {
		type: 'pointerdown'
		target: EventDispatcher
		currentTarget: EventDispatcher
		srcEvent: PointerEvent
		hitResult?: any // 碰撞检测方法的返回结果
	}
	pointerup: {
		type: 'pointerup'
		target: EventDispatcher
		currentTarget: EventDispatcher
		srcEvent: PointerEvent
	}
	pointermove: {
		type: 'pointermove'
		target: EventDispatcher
		currentTarget: EventDispatcher
		srcEvent: PointerEvent
		hitResult?: any // 碰撞检测方法的返回结果
	}
	pointerenter: {
		type: 'pointerenter'
		target: EventDispatcher
		currentTarget: EventDispatcher
		srcEvent: PointerEvent
		hitResult?: any // 碰撞检测方法的返回结果
	}
	pointerleave: {
		type: 'pointerleave'
		target: EventDispatcher
		currentTarget: EventDispatcher
		srcEvent: PointerEvent
	}
}

/**
 * Shape 生命周期事件
 */
export type ShapeLifeCycleEvents = {
	beforeDraw: {
		type: 'beforeDraw'
		target: Shape
		currentTarget: Shape
		shape: Shape
		ctx: CanvasRenderingContext2D
	}
	add: {
		type: 'add'
		target: Shape
		currentTarget: Shape
	}
	remove: {
		type: 'remove'
		target: Shape
		currentTarget: Shape
	}
}

export type ShapeEvents = PointerEvents & ShapeLifeCycleEvents

/**
 * Group 生命周期事件
 */
export type ShapeGroupEvents<S extends Shape> = {
	add: {
		type: 'add'
		target: S
		currentTarget: ShapeGroup<S>
	}
	remove: {
		type: 'remove'
		target: S
		currentTarget: ShapeGroup<S>
	}
}

export type SceneEvents = {
	add: {
		type: 'add'
		target: Shape | ShapeGroup
		currentTarget: Scene
	}
	remove: {
		type: 'remove'
		target: Shape | ShapeGroup
		currentTarget: Scene
	}
	beforeRender: {
		type: 'beforeRender'
		target: Scene
		currentTarget: Scene
	}
} & PointerEvents

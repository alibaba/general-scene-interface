import type { EventDispatcher } from './EventDispatcher'
import type { Scene, Shape } from './core'

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
	beforeRender: {
		type: 'beforeRender'
		target: Shape
		currentTarget: Scene
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

export type SceneEvents = {
	add: {
		type: 'add'
		target: Shape
		currentTarget: Scene
	}
	remove: {
		type: 'remove'
		target: Shape
		currentTarget: Scene
	}
	beforeRender: {
		type: 'beforeRender'
		target: Scene
		currentTarget: Scene
	}
} & PointerEvents

import type { EventDispatcher } from './EventDispatcher'
import type { Scene, Shape } from './core'

/**
 * 代理的鼠标事件
 */
export type PointerEvents<TTarget extends EventDispatcher = EventDispatcher> = {
	pointerdown: {
		type: 'pointerdown'
		target: TTarget
		currentTarget: TTarget
		srcEvent: PointerEvent
		hitResult?: any // 碰撞检测方法的返回结果
	}
	pointerup: {
		type: 'pointerup'
		target: TTarget
		currentTarget: TTarget
		srcEvent: PointerEvent
	}
	pointermove: {
		type: 'pointermove'
		target: TTarget
		currentTarget: TTarget
		srcEvent: PointerEvent
		hitResult?: any // 碰撞检测方法的返回结果
	}
	pointerenter: {
		type: 'pointerenter'
		target: TTarget
		currentTarget: TTarget
		srcEvent: PointerEvent
		hitResult?: any // 碰撞检测方法的返回结果
	}
	pointerleave: {
		type: 'pointerleave'
		target: TTarget
		currentTarget: TTarget
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

export type ShapeEvents = PointerEvents<Shape | Scene> & ShapeLifeCycleEvents

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
	dispose: {
		type: 'dispose'
		target: Scene
		currentTarget: Scene
	}
} & PointerEvents<Scene | Scene>

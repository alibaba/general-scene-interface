/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Euler, Matrix4Tuple, Quaternion, Vector2, Vector3 } from '@gs.i/utils-math'

/**
 * Transform 基类
 * @note 与 three 不同，这里出于渲染的 front end 环节，是不关心渲染节奏的（拿不到 onbefore render），因此可能需要用户每次自己掉 update
 * @note 除非 将 matrix 的调用作为渲染节奏，在 getter 里触发 update，如果每帧取多次 matrix getter 就会浪费性能
 * @todo 需要设计一个合理的 matrix 更新方案，暂时做一些重复计算
 */
export interface Transform {
	// input

	readonly position: Vector2 | Vector3
	readonly rotation: Quaternion | Euler
	readonly scale: Vector2 | Vector3 | number

	// /**
	//  * 标记 每帧都需要跟新这个矩阵
	//  */
	// readonly autoUpdate: boolean

	// /**
	//  * set dirty 标记当前矩阵需要更新
	//  */
	// needsUpdate: true

	// output

	/**
	 * 输出矩阵数组
	 */
	readonly matrix: number[]

	/**
	 * 更新矩阵
	 */
	// readonly update: () => void

	/**
	 * 世界矩阵
	 */
	worldMatrix?: number[]
}

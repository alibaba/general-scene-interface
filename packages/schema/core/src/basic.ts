/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * 53 bit integer
 * This is the only integer JS supports except BigInt
 */
export type Int = number
/**
 * 32 bit float
 */
export type Float = number
/**
 * 64 bit float
 */
export type Double = number

/**
 * matrix
 */
export type Matrix = number[]

/**
 * dirty range/ update range
 */
export interface Range {
	start: Double
	count: Double
}

export type UpdateRanges = Range[]

/**
 * bounding box
 */
export interface AABBox3 {
	max: Vec3
	min: Vec3
}

/**
 * bounding sphere
 */
export interface BSphere3 {
	center: Vec3
	radius: Double
}

/**
 * vector 4
 */
export interface Vec4 {
	x: Double
	y: Double
	z: Double
	w: Double
}

/**
 * vector 3
 */
export interface Vec3 {
	x: Double
	y: Double
	z: Double
}

/**
 * vector 2
 */
export interface Vec2 {
	x: Double
	y: Double
}

export type EulerOrder3 = 'xyz' | 'xzy' | 'yxz' | 'yzx' | 'zxy' | 'zyx'

/**
 * Euler rotation
 */
export interface Euler3 extends Vec3 {
	order: EulerOrder3
}

/**
 * 颜色
 */
export type ColorRGB = { r: Float; g: Float; b: Float }

/**
 * typed array
 */
export type TypedArray =
	| Int8Array
	| Uint8Array
	| Uint8ClampedArray
	| Int16Array
	| Uint16Array
	| Int32Array
	| Uint32Array
	| Float32Array
	| Float64Array

export const DISPOSED = '__DISPOSED__'
export type DISPOSED = '__DISPOSED__'

export interface Transform3 {
	position?: Vec3
	rotation?: Euler3
	scale?: Vec3
	/**
	 * @default [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] // identity 4x4 matrix
	 */
	matrix: Matrix
}

export interface Transform2 {
	position?: Vec2
	rotation?: Double
	scale?: Vec2
	/**
	 * @default [1, 0, 0, 0, 1, 0, 0, 0, 1] // identity 3x3 matrix
	 */
	matrix: Matrix
}

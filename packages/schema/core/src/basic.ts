/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/**
 * 53 bit integer
 * * This is the only integer JS supports except BigInt
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
 * bounding box (AABB)
 *
 * - a 2d box should be called a rectangle @see https://en.wikipedia.org/wiki/Minimum_bounding_box
 * - three.js `boundingBox` and `Box3` refer to AABB @see https://threejs.org/docs/?q=geome#api/en/math/Box3
 * - 3d-tiles `boundingVolume.box` refers to oriented minimum bounding box @see https://github.com/CesiumGS/3d-tiles/tree/main/specification#box
 * - Unity3D `Bounds` refers to AABB, the only other choice is `BoundingSphere` @see https://docs.unity3d.com/ScriptReference/Bounds.html
 * - Unreal `BoundingBox` refers to AABB @see https://docs.unrealengine.com/4.27/en-US/API/Runtime/Core/Math/FBox/
 * - Babylon.js `boundingInfo.boundingBox` refers to AABB
 *
 * 3d-tiles is the only special design. ignored.
 */
export interface BBox {
	max: Vec3
	min: Vec3
}

/**
 * bounding sphere
 */
export interface BSphere {
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
 * quaternion
 *
 * "a unit quaternion value, XYZW, in the local coordinate system, where W is the scalar."
 * @link https://www.khronos.org/registry/glTF/specs/2.0/glTF-2.0.html#:~:text=a%20unit%20quaternion%20value%2C%20XYZW%2C%20in%20the%20local%20coordinate%20system%2C%20where%20W%20is%20the%20scalar.
 * @note w is 1 by default, not zero
 */
export type Quaternion = Vec4

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

export interface Versioned {
	/**
	 * # update version
	 *
	 * - If you changed this object. You should increase the version to mark it dirty.
	 * - If you set version to -1. This object will be considered `always dirty`.
	 *
	 * 当前数据版本
	 *
	 * - 如果需要更新数据，务必主动将 version ++
	 * - 或者设为 -1，将每次都更新
	 *
	 * @default -1
	 */
	version: Int
}

export interface Transform3TRS extends Versioned {
	position?: Vec3
	rotation?: Euler3
	scale?: Vec3
	quaternion?: Quaternion
	//
	matrix?: never
}

export interface Transform3Matrix extends Versioned {
	position?: never
	rotation?: never
	scale?: never
	quaternion?: never
	/**
	 * @default [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] // identity 4x4 matrix
	 */
	matrix: Matrix
}

export type Transform3 = Transform3TRS | Transform3Matrix

// const test: Transform3 = {
// 	matrix: [0],
// 	position: { x: 0, y: 0, z: 0 },
// }

export interface Transform2TRS extends Versioned {
	position?: Vec2
	rotation?: Double
	scale?: Vec2
	//
	matrix?: never
}
export interface Transform2Matrix extends Versioned {
	position?: never
	rotation?: never
	scale?: never
	/**
	 * @default [1, 0, 0, 0, 1, 0, 0, 0, 1] // identity 3x3 matrix
	 */
	matrix: Matrix
}
export type Transform2 = Transform2TRS | Transform2Matrix

/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { CubeTextureType, TextureType } from './Texture'

/**
 * @fileoverview 基础类型定义
 */

/**
 * Used for store any GSI private props for internal mesh processing
 *
 * @type {*}
 */
export const __GSI_MESH_INTERNAL_PROP_KEY_0__ = Symbol()

export type __GSI_MESH_INTERNAL_PROP_0__ = {
	_frustumCulled: boolean
	[key: string]: any
}

export function __defaultMeshInternalProp(): __GSI_MESH_INTERNAL_PROP_0__ {
	return {
		_frustumCulled: false,
	}
}

// @note Symbol 更合适 ， 但是IE11 不支持 Symbol
export const DISPOSED = '__DISPOSED__'
export type DISPOSED = '__DISPOSED__'

export function isDISPOSED(v: any): v is DISPOSED {
	return v === '__DISPOSED__'
}

/**
 * 数据更新区域
 * dirty range
 */
export interface Range {
	start: number
	count: number
}

export type UpdateRanges = Range[]

/**
 * 包围盒
 */
export interface BBox {
	max: Vec3
	min: Vec3
	[key: string]: any
}

/**
 * 包围球
 */
export interface BSphere {
	center: Vec3
	radius: number
	[key: string]: any
}

/**
 * 向量
 */
export interface Vec4 {
	x: number
	y: number
	z: number
	w: number
	[key: string]: any
}

export interface Vec3 {
	x: number
	y: number
	z: number
	[key: string]: any
}

export interface Vec2 {
	x: number
	y: number
	[key: string]: any
}

/**
 * 矩阵
 * @QianXun 直接用Array吧
 */
// export interface Mat3 extends Array<number> {
// 	readonly length: number
// }

// export interface Mat4 extends Array<number> {
// 	readonly length: number
// }

/**
 * 颜色
 */
export type ColorLike = { r: number; g: number; b: number; [key: string]: any }
export function isColorLike(a: any): a is ColorLike {
	if (a && a.r !== undefined && a.g !== undefined && a.b !== undefined) {
		return true
	}
	return false
}
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

/**
 * @QianXun
 */
export function isTypedArray(a: any): a is TypedArray {
	if (
		a instanceof Int8Array ||
		a instanceof Uint8Array ||
		a instanceof Uint8ClampedArray ||
		a instanceof Int16Array ||
		a instanceof Uint16Array ||
		a instanceof Int32Array ||
		a instanceof Uint32Array ||
		a instanceof Float32Array ||
		a instanceof Float64Array
	) {
		return true
	}
	return false
}

/**
 * glsl code
 */
// export type GLSL_CODE = string & { version?: number; moduleName?: string }

/**
 * @todo
 * User-Defined Type Guards
 * 运行时检查 glsl code 语法
 * @param code
 */
// export function isGLSL(code: string): code is GLSL_CODE {
// 	return code.includes('vec3')
// }

// const a = ' '

// if (isGLSL(a)) {
// 	a
// } else {
// 	a
// }

/**
 * @example vec2 vec3 float sampler2D ...
 */
export type ShaderType = string

export type UniformDataType = {
	/**
	 * 数值、对象或Texture
	 * 增加了数组对象
	 */
	value:
		| number
		| Vec2
		| Vec3
		| Vec4
		| ColorLike
		| TextureType
		| CubeTextureType
		| number[]
		| number[][]
		| Vec2[]
		| Vec3[]
		| Vec4[]
		| ColorLike[]
		| TextureType[]

	/**
	 * 在shader language中的type
	 */
	type: ShaderType
}

/**
 * @Decorator readonly装饰器
 */
export function readonly() {
	return function (target: any, propertyKey: string, desc: PropertyDescriptor) {
		// desc.writable = false // @QianXun 启用这句会报错
		desc.enumerable = false
		desc.configurable = false
	}
}

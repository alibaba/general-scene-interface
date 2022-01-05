/**
 * TS Type Guards
 */

import {
	TypedArray,
	DISPOSED,
	ColorRGB,
	Transform3TRS,
	Transform3Matrix,
	Transform3,
	Transform2TRS,
	Transform2Matrix,
	Transform2,
} from './basic'
import { PointMaterial, UnlitMaterial, PbrMaterial, MaterialBase } from './Matr'

import { Texture, CubeTexture } from './Texture'
import { Uniform } from './Programable'

import { RenderableNode, NodeLike, LuminousNode } from './Mesh'

export function isColorRGB(a: any): a is ColorRGB {
	if (a && a.r !== undefined && a.g !== undefined && a.b !== undefined) {
		return true
	}
	return false
}

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

export function isDISPOSED(v: any): v is DISPOSED {
	return v === '__DISPOSED__'
}

export function isMatrPbr(v: MaterialBase): v is PbrMaterial {
	return v.type === 'pbr'
}
export function isMatrUnlit(v: MaterialBase): v is UnlitMaterial {
	return v.type === 'unlit'
}
export function isMatrPoint(v: MaterialBase): v is PointMaterial {
	return v.type === 'point'
}
export function isRenderable(v: NodeLike): v is RenderableNode {
	return v['geometry'] && v['material']
}
export function isLuminous(v: NodeLike): v is LuminousNode {
	return v.extensions?.EXT_luminous !== undefined
}

export function isTransform3Matrix(v: Transform3): v is Transform3Matrix {
	return v.matrix !== undefined
}
export function isTransform3TRS(v: Transform3): v is Transform3TRS {
	return v.matrix === undefined
}
export function isTransform2Matrix(v: Transform2): v is Transform2Matrix {
	return v.matrix !== undefined
}
export function isTransform2TRS(v: Transform2): v is Transform2TRS {
	return v.matrix === undefined
}

export function isTexture(v: Uniform['value']): v is Texture {
	return (
		(v as Texture).sampler?.magFilter !== undefined &&
		(v as Texture).sampler?.wrapS !== undefined &&
		(v as Texture).image !== undefined
	)
}

export function isCubeTexture(v: Uniform['value']): v is CubeTexture {
	return (
		(v as CubeTexture).sampler?.magFilter !== undefined &&
		(v as CubeTexture).sampler?.wrapS !== undefined &&
		(v as CubeTexture).images !== undefined
	)
}

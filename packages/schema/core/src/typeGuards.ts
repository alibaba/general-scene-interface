import { Luminous } from './Mesh'
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
import { MatrPointDataType, MatrUnlitDataType, MatrPbrDataType, MatrBaseDataType } from './Matr'

import { Texture, CubeTexture } from './Texture'
import { UniformDataType } from './Programable'

import { RenderableMesh, MeshDataType } from './Mesh'

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

export function isMatrPbrDataType(v: MatrBaseDataType): v is MatrPbrDataType {
	return v.type === 'pbr'
}
export function isMatrUnlitDataType(v: MatrBaseDataType): v is MatrUnlitDataType {
	return v.type === 'unlit'
}
export function isMatrPointDataType(v: MatrBaseDataType): v is MatrPointDataType {
	return v.type === 'point'
}
export function isRenderableMesh(v: MeshDataType): v is RenderableMesh {
	return v['geometry'] && v['material']
}
export function isLuminous(v: MeshDataType): v is Luminous {
	return v['isLuminous']
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

export function isTexture(v: UniformDataType['value']): v is Texture {
	return (
		(v as Texture).sampler?.magFilter !== undefined &&
		(v as Texture).sampler?.wrapS !== undefined &&
		(v as Texture).image !== undefined
	)
}

export function isCubeTexture(v: UniformDataType['value']): v is CubeTexture {
	return (
		(v as CubeTexture).sampler?.magFilter !== undefined &&
		(v as CubeTexture).sampler?.wrapS !== undefined &&
		(v as CubeTexture).images !== undefined
	)
}

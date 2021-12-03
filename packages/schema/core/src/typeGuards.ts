/**
 * TS Type Guards
 */

import { TypedArray, DISPOSED, ColorRGB } from './basic'
import {
	MatrSpriteDataType,
	MatrPointDataType,
	MatrUnlitDataType,
	MatrPbrDataType,
	MatrBaseDataType,
} from './Matr'

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
export function isMatrSpriteDataType(v: MatrBaseDataType): v is MatrSpriteDataType {
	return v.type === 'sprite'
}
export function isRenderableMesh(v: MeshDataType): v is RenderableMesh {
	return v['geometry'] && v['material']
}

/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { TypedArray, AttributeDataType } from '@gs.i/schema-scene'

import type * as GLTF from './GLTF'
export * as GLTF from './GLTF'
export * from './GLTF2.memory'

export const GLB_HEADER_BYTES = 12
export const GLB_HEADER_MAGIC = 0x46546c67
export const GLB_VERSION = 2

export const GLB_CHUNK_PREFIX_BYTES = 8
export const GLB_CHUNK_TYPE_JSON = 0x4e4f534a
export const GLB_CHUNK_TYPE_BIN = 0x004e4942

export const ItemSizeToAccessorType = {
	1: 'SCALAR',
	2: 'VEC2',
	3: 'VEC3',
	4: 'VEC4',
}

export const AccessorTypeToItemSize = {
	SCALAR: 1,
	VEC2: 2,
	VEC3: 3,
	VEC4: 4,
}

export const GeomModeToMeshPrimitive = {
	TRIANGLES: 4,
	LINES: 1,
	POINTS: 0,
	// SPRITE: 0
}

export const MeshPrimitiveToGeomMode = {
	4: 'TRIANGLES',
	1: 'LINES',
	0: 'POINTS',
	undefined: 'TRIANGLES',
	// SPRITE: 0
}

export const SamplerEnumToString = {
	9728: 'NEAREST',
	9729: 'LINEAR',
	9984: 'NEAREST_MIPMAP_NEAREST',
	9985: 'LINEAR_MIPMAP_NEAREST',
	9986: 'NEAREST_MIPMAP_LINEAR',
	9987: 'LINEAR_MIPMAP_LINEAR',
	33071: 'CLAMP_TO_EDGE',
	33648: 'MIRRORED_REPEAT',
	10497: 'REPEAT',
}

export function typedArrayToComponentType(typedArray: TypedArray) {
	if (typedArray instanceof Float32Array) {
		return 5126
	}
	if (typedArray instanceof Uint32Array) {
		return 5125
	}
	if (typedArray instanceof Uint16Array) {
		return 5123
	}
	if (typedArray instanceof Int16Array) {
		return 5122
	}
	if (typedArray instanceof Uint8Array) {
		return 5121
	}
	if (typedArray instanceof Int8Array) {
		return 5120
	}
	throw new Error('不支持的 TypedArray 类型')
}

export function componentTypeToTypedArray(componentType: number) {
	switch (componentType) {
		case 5126:
			return Float32Array
		case 5125:
			return Uint32Array
		case 5123:
			return Uint16Array
		case 5122:
			return Int16Array
		case 5121:
			return Uint8Array
		case 5120:
			return Int8Array

		default:
			throw new Error('不支持的 componentType')
	}
}

/**
 * port from  three gltf exporter
 */
/**
 * Get the required size + padding for a buffer, rounded to the next 4-byte boundary.
 * https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
 *
 * @param {Integer} bufferSize The size the original buffer.
 * @returns {Integer} new buffer size with required padding.
 *
 */
export function getPaddedBufferSize(bufferSize: number): number {
	return Math.ceil(bufferSize / 4) * 4
}

/**
 * Returns a buffer aligned to 4-byte boundary.
 *
 * @param {ArrayBuffer} arrayBuffer Buffer to pad
 * @param {Integer} paddingByte (Optional)
 * @returns {ArrayBuffer} The same buffer if it's already aligned to 4-byte boundary or a new buffer
 */
export function getPaddedArrayBuffer(arrayBuffer: ArrayBuffer, paddingByte?: number): ArrayBuffer {
	paddingByte = paddingByte || 0

	const paddedLength = getPaddedBufferSize(arrayBuffer.byteLength)

	if (paddedLength !== arrayBuffer.byteLength) {
		const array = new Uint8Array(paddedLength)
		array.set(new Uint8Array(arrayBuffer))

		if (paddingByte !== 0) {
			for (let i = arrayBuffer.byteLength; i < paddedLength; i++) {
				array[i] = paddingByte
			}
		}

		return array.buffer
	}

	return arrayBuffer
}

/**
 * Converts a string to an ArrayBuffer.
 * @param  {string} text
 * @return {ArrayBuffer}
 */
export function stringToArrayBuffer(text: string): ArrayBuffer {
	if (TextEncoder !== undefined) {
		return new TextEncoder().encode(text).buffer
	}

	const array = new Uint8Array(new ArrayBuffer(text.length))

	for (let i = 0, il = text.length; i < il; i++) {
		const value = text.charCodeAt(i)

		// Replacing multi-byte character with space(0x20).
		array[i] = value > 0xff ? 0x20 : value
	}

	return array.buffer
}

export function decodeText(array: TypedArray): string {
	if (typeof TextDecoder !== 'undefined') {
		return new TextDecoder().decode(array)
	}

	// Avoid the String.fromCharCode.apply(null, array) shortcut, which
	// throws a "maximum call stack size exceeded" error for large arrays.

	let s = ''

	for (let i = 0, il = array.length; i < il; i++) {
		// Implicitly assumes little-endian.
		s += String.fromCharCode(array[i])
	}

	try {
		// merges multi-byte utf-8 characters.

		return decodeURIComponent(escape(s))
	} catch (e) {
		// see #16358

		return s
	}
}

export function parseImageFromBufferView(mimeType: string, uintBufferView: Uint8Array): string {
	/*
	let hasAlpha = true

	if (mimeType === 'image/jpeg') hasAlpha = false
	if (mimeType === 'image/png') {
		// Inspect the PNG 'IHDR' chunk to determine whether the image could have an
		// alpha channel. This check is conservative — the image could have an alpha
		// channel with all values == 1, and the indexed type (colorType == 3) only
		// sometimes contains alpha.
		//
		// https://en.wikipedia.org/wiki/Portable_Network_Graphics#File_header
		const colorType = new DataView(uintBufferView, 25, 1).getUint8(0)
		hasAlpha = colorType === 6 || colorType === 4 || colorType === 3
	}
	*/

	const blob = new Blob([uintBufferView], { type: mimeType })
	const sourceURI = URL.createObjectURL(blob)
	return sourceURI
}

export function attrNameThreeToGltf(name: string): string {
	switch (name) {
		case 'position':
			return 'POSITION'
		case 'normal':
			return 'NORMAL'
		case 'uv':
			return 'TEXCOORD_0'
		case 'uv1':
			return 'TEXCOORD_1'
		default:
			// console.warn('不支持的 attributes: ', name)
			return name
	}
}

export function attrNameGltfToThree(name: string): string {
	switch (name) {
		case 'POSITION':
			return 'position'
		case 'NORMAL':
			return 'normal'
		case 'TEXCOORD_0':
			return 'uv'
		case 'TEXCOORD_1':
			return 'uv1'
		default:
			// console.warn('不支持的 attributes: ', name)
			return name
	}
}

// TODO maybe move to utils-geometry or backend-gltf
export function getMinMax(attributeData: AttributeDataType) {
	if (attributeData.itemSize === 1) {
		let min0 = Infinity
		let max0 = -Infinity
		const array = attributeData.array as any as number[]
		for (let i = 0; i < attributeData.count; i++) {
			const value0 = array[i]
			value0 < min0 && (min0 = value0)
			value0 > max0 && (max0 = value0)
		}
		return {
			min: [min0],
			max: [max0],
		}
	}

	if (attributeData.itemSize === 2) {
		let min0 = Infinity
		let min1 = Infinity
		let max0 = -Infinity
		let max1 = -Infinity
		const array = attributeData.array as any as number[]
		for (let i = 0; i < attributeData.count; i++) {
			const offset = i * 2

			const value0 = array[offset + 0]
			value0 < min0 && (min0 = value0)
			value0 > max0 && (max0 = value0)

			const value1 = array[offset + 1]
			value1 < min1 && (min1 = value1)
			value1 > max1 && (max1 = value1)
		}
		return {
			min: [min0, min1],
			max: [max0, max1],
		}
	}

	if (attributeData.itemSize === 3) {
		let min0 = Infinity
		let min1 = Infinity
		let min2 = Infinity
		let max0 = -Infinity
		let max1 = -Infinity
		let max2 = -Infinity
		const array = attributeData.array as any as number[]
		for (let i = 0; i < attributeData.count; i++) {
			const offset = i * 3

			const value0 = array[offset + 0]
			value0 < min0 && (min0 = value0)
			value0 > max0 && (max0 = value0)

			const value1 = array[offset + 1]
			value1 < min1 && (min1 = value1)
			value1 > max1 && (max1 = value1)

			const value2 = array[offset + 2]
			value2 < min2 && (min2 = value2)
			value2 > max2 && (max2 = value2)
		}
		return {
			min: [min0, min1, min2],
			max: [max0, max1, max2],
		}
	}

	throw `unsupported attributeData.itemSize: ${attributeData.itemSize}`
}

/**
 * separate a tightly packed typedArray from an interleaved buffer view
 */
export function deInterleave(
	accessor: GLTF.Accessor,
	bufferView: GLTF.BufferView,
	composedBuffer: ArrayBuffer
) {
	// accessor.byteOffset and bufferView.byteStride MUST be multiples of 4

	const byteOffsetInStride = accessor.byteOffset || 0
	// const offsetInStride = byteOffsetInStride / 4

	const byteStride = bufferView.byteStride

	if (byteStride === undefined)
		throw new Error('bufferView.byteStride is undefined. can not deInterleave')

	// const stride = byteStride / 4

	const count = accessor.count

	const itemSize = AccessorTypeToItemSize[accessor.type]

	const TypedArrayConstructor = componentTypeToTypedArray(accessor.componentType)

	const BYTES_PER_ELEMENT = TypedArrayConstructor.BYTES_PER_ELEMENT as number

	const resultView = new Uint8Array(count * itemSize * BYTES_PER_ELEMENT)
	const sourceView = new Uint8Array(composedBuffer, bufferView.byteOffset, bufferView.byteLength)

	for (let i = 0; i < count; i++) {
		for (let j = 0; j < itemSize; j++) {
			const targetOffset = i * itemSize * BYTES_PER_ELEMENT + j * BYTES_PER_ELEMENT
			const sourceOffset = i * byteStride + j * BYTES_PER_ELEMENT + byteOffsetInStride

			resultView.set(sourceView.slice(sourceOffset, sourceOffset + BYTES_PER_ELEMENT), targetOffset)
		}
	}

	const result = new TypedArrayConstructor(resultView.buffer)
	return result
}

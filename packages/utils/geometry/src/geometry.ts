/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable array-element-newline */
import {
	BBox,
	BSphere,
	GeomDataType,
	isDISPOSED,
	TypedArray,
	AttributeDataType,
	MatrSpriteDataType,
} from '@gs.i/schema'
import { Box3, Sphere, Vector2, Vector3 } from '@gs.i/utils-math'

const sqrt2 = 1.414214
const infinityBox = new Box3().set(
	new Vector3(-Infinity, -Infinity, -Infinity),
	new Vector3(+Infinity, +Infinity, +Infinity)
)
const infinitySphere = new Sphere(undefined, Infinity)
const _v20 = new Vector2()
const _v30 = new Vector3()

export function generateGsiSpriteInfo(
	geom: GeomDataType,
	matr: MatrSpriteDataType | undefined
): void {
	if (geom.mode !== 'SPRITE' || !matr) {
		console.error('Geometry type is not `SPRITE` or Material is not valid, do nothing')
		return
	}

	if (matr.useAttrSize && geom.attributes.size === undefined) {
		console.error(
			'Detected Matr.useAttrSize property is true but geometry has no `size` attribute, do nothing'
		)
		return
	}

	const box = new Box3()
	const sphere = new Sphere()

	const position = geom.attributes.position
	if (!position || isDISPOSED(position.array)) {
		return
	}

	// Custom attrs
	const attrNames = Object.keys(geom.attributes)
	for (let i = attrNames.length; i >= 0; i--) {
		const attr = attrNames[i]
		if (attr === 'position' || !geom.attributes[attr] || isDISPOSED(geom.attributes[attr].array)) {
			attrNames.splice(i, 1)
		}
	}

	const length = position.array.length
	const count = length / 3
	const centerDist =
		_v20.subVectors(matr.center as Vector2, new Vector2(0.5, 0.5)).length() + sqrt2 / 2

	// const size = matr.size

	// const size = geom.attributes.size
	// if (size && size.array.length !== (length / 3) * 2) {
	// 	console.warn('Sprite attribute `size` length should be equal to 2/3 * sprite count')
	// }

	// const rotation = geom.attributes.rotation
	// if (rotation && rotation.array.length !== length / 3) {
	// 	console.warn('Sprite attribute `rotation` length should be equal to sprite count')
	// }

	// Generate sprite triangles
	// Total bytes for one sprite:
	// 4 + 12 * 4 = 52 bytes
	const posArr = position.array
	const corner = new Int8Array(count * 4)
	const spritepos = new Float32Array(3 * count * 4)
	const indices = 6 * count > 65535 ? new Uint32Array(6 * count) : new Uint16Array(6 * count)
	const customAttrs = attrNames.map((name) => {
		const constructor = Object.getPrototypeOf(geom.attributes[name].array).constructor
		if (!constructor) {
			console.error('GL2Converter::SpriteGeometry cannot get custom attribute array constructor')
			return
		}
		const itemSize = geom.attributes[name].itemSize
		return {
			name: name,
			itemSize: itemSize,
			array: new constructor(count * itemSize * 4) as TypedArray,
			normalized: geom.attributes[name].normalized,
			usage: geom.attributes[name].usage,
		}
	})
	for (let i = 0; i < count; i++) {
		// Center position
		const i03 = i * 3
		const px = posArr[i03 + 0]
		const py = posArr[i03 + 1]
		const pz = posArr[i03 + 2]

		// New sprite world position, to be processed in vs
		const i12 = i * 12
		spritepos[i12 + 0] = px
		spritepos[i12 + 1] = py
		spritepos[i12 + 2] = pz
		spritepos[i12 + 3] = px
		spritepos[i12 + 4] = py
		spritepos[i12 + 5] = pz
		spritepos[i12 + 6] = px
		spritepos[i12 + 7] = py
		spritepos[i12 + 8] = pz
		spritepos[i12 + 9] = px
		spritepos[i12 + 10] = py
		spritepos[i12 + 11] = pz

		box.expandByPoint(_v30.set(px + centerDist, py + centerDist, pz + centerDist))
		box.expandByPoint(_v30.set(px - centerDist, py - centerDist, pz - centerDist))

		// New indices, 6 index per quad
		const i06 = i * 6
		const offset = i * 4
		indices[i06 + 0] = offset + 0
		indices[i06 + 1] = offset + 1
		indices[i06 + 2] = offset + 2
		indices[i06 + 3] = offset + 0
		indices[i06 + 4] = offset + 2
		indices[i06 + 5] = offset + 3

		// New corner attribute, indicates quad corners
		corner[offset + 0] = 0
		corner[offset + 1] = 1
		corner[offset + 2] = 2
		corner[offset + 3] = 3

		// Custom attrs
		for (let attrIdx = 0; attrIdx < customAttrs.length; attrIdx++) {
			const attr = customAttrs[attrIdx]
			if (attr === undefined) continue

			const { name, itemSize, array } = attr
			const itemOffset = i * itemSize
			const vertexOffset = itemOffset * 4

			const values = new Array(itemSize)
			for (let j = 0; j < itemSize; j++) {
				values[j] = geom.attributes[name].array[itemOffset + j]
			}

			for (let icorner = 0; icorner < 4; icorner++) {
				values.forEach((v, index) => {
					array[vertexOffset + icorner * itemSize + index] = v
				})
			}
		}
	}

	const attributes: { [key: string]: AttributeDataType } = {}

	attributes.position = {
		array: spritepos,
		itemSize: 3,
		count: count * 4,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
	}

	attributes.corner = {
		array: corner,
		itemSize: 1,
		count: count * 4,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
	}

	for (let i = 0; i < customAttrs.length; i++) {
		const attr = customAttrs[i]
		if (attr === undefined) continue
		attributes[attr.name] = {
			array: attr.array,
			itemSize: attr.itemSize,
			count: count * 4,
			normalized: attr.normalized,
			usage: attr.usage,
			version: 0,
		}
	}

	// if (size) attributes.size = size
	// if (rotation) attributes.rotation = rotation

	geom.attributes = attributes

	geom.indices = {
		array: indices,
		itemSize: 1,
		count: 6 * count,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
	}

	if (matr.sizeAttenuation) {
		// geom.boundingBox = box
		// geom.boundingSphere = box.getBoundingSphere(sphere)
		geom.boundingBox = infinityBox.clone()
		geom.boundingSphere = infinitySphere.clone()
	} else {
		geom.boundingBox = infinityBox.clone()
		geom.boundingSphere = infinitySphere.clone()
	}

	if (matr.useAttrSize) {
		matr.defines = matr.defines || {}
		matr.defines.GSI_USE_ATTR_SIZE = true
		matr.attributes = matr.attributes || {}
		matr.attributes.size = 'vec2'
	}
}

export function genBBoxWireframe(bbox: BBox): GeomDataType {
	const min = bbox.min
	const max = bbox.max

	// prettier-ignore
	const positions = [
		max.x, max.y, max.z,
		min.x, max.y, max.z,
		min.x, min.y, max.z,
		max.x, min.y, max.z,
		max.x, max.y, min.z,
		min.x, max.y, min.z,
		min.x, min.y, min.z,
		max.x, min.y, min.z,
	]
	// prettier-ignore
	const indices = [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ]

	const geom: GeomDataType = {
		mode: 'LINES',
		attributes: {
			position: {
				array: new Float32Array(positions),
				count: positions.length / 3,
				itemSize: 3,
				normalized: false,
				version: 0,
				usage: 'STATIC_DRAW',
			},
		},
		indices: {
			array: new Uint16Array(indices),
			count: indices.length,
			itemSize: 1,
			normalized: false,
			version: 0,
			usage: 'STATIC_DRAW',
		},
	}

	geom.boundingBox = computeBBox(geom)
	geom.boundingSphere = computeBSphere(geom)

	return geom
}

export function genBSphereWireframe(bsphere: BSphere, segments = 12): GeomDataType {
	const center = bsphere.center
	const radius = bsphere.radius
	const phiLength = Math.PI * 2

	let index = 0
	const grid: number[][] = []
	const scratchVertex = new Vector3()

	// buffers

	const indices: number[] = []
	const vertices: number[] = []

	// generate vertices

	for (let iy = 0; iy <= segments; iy++) {
		const verticesRow: number[] = []

		const v = iy / segments

		for (let ix = 0; ix <= segments; ix++) {
			const u = ix / segments

			// vertex

			scratchVertex.x = -radius * Math.cos(u * phiLength) * Math.sin(v * Math.PI)
			scratchVertex.y = radius * Math.cos(v * Math.PI)
			scratchVertex.z = radius * Math.sin(u * phiLength) * Math.sin(v * Math.PI)
			scratchVertex.add(center as Vector3)

			vertices.push(scratchVertex.x, scratchVertex.y, scratchVertex.z)

			verticesRow.push(index++)
		}

		grid.push(verticesRow)
	}

	// indices

	for (let iy = 0; iy < segments; iy++) {
		for (let ix = 0; ix < segments; ix++) {
			const a = grid[iy][ix + 1]
			const b = grid[iy][ix]
			const c = grid[iy + 1][ix]
			const d = grid[iy + 1][ix + 1]

			if (iy !== 0) indices.push(a, b, d, a) // indices.push(a, b, d)
			if (iy !== segments - 1) indices.push(b, c, d, a) // indices.push(b, c, d)
		}
	}

	const geom: GeomDataType = {
		mode: 'LINES',
		attributes: {
			position: {
				array: new Float32Array(vertices),
				count: vertices.length / 3,
				itemSize: 3,
				normalized: false,
				version: 0,
				usage: 'STATIC_DRAW',
			},
		},
		indices: {
			array: indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
			itemSize: 1,
			count: indices.length,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
		},
	}

	return geom
}

export function genGeomWireframe(geom: GeomDataType): GeomDataType | undefined {
	if (!geom.attributes.position) {
		console.error('Geometry.attributes does not have position or has been disposed')
		return
	}

	const position = geom.attributes.position

	if (isDISPOSED(position.array)) {
		console.error('Position attribute array has been disposed')
		return
	}

	const idxArr: number[] = []
	const posAttr: AttributeDataType = {
		array: position.array.slice() as TypedArray,
		itemSize: position.itemSize,
		count: position.count,
		normalized: position.normalized,
		usage: position.usage,
		version: 0,
	}

	if (geom.indices) {
		if (isDISPOSED(geom.indices.array)) {
			console.error('Geometry.indices.array has been disposed')
			return
		}
		const indices = geom.indices.array
		for (let i = 0; i < indices.length; i += 3) {
			const a = indices[i + 0]
			const b = indices[i + 1]
			const c = indices[i + 2]
			idxArr.push(a, b, b, c, c, a)
		}
	} else {
		const triangles = position.count / 3
		let offset = 0
		for (let i = 0; i < triangles; i++) {
			idxArr.push(offset + 0, offset + 1, offset + 1, offset + 2, offset + 2, offset + 0)
			offset += 3
		}
	}

	const wireframe: GeomDataType = {
		mode: 'LINES',
		attributes: {
			position: posAttr,
		},
		indices: {
			array: idxArr.length > 65535 ? new Uint32Array(idxArr) : new Uint16Array(idxArr),
			itemSize: 1,
			count: idxArr.length,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
		},
	}

	return wireframe
}

export function BBoxToBox3(bbox: BBox): Box3 {
	const min = new Vector3(bbox.min.x, bbox.min.y, bbox.min.z)
	const max = new Vector3(bbox.max.x, bbox.max.y, bbox.max.z)
	return new Box3(min, max)
}

export function BSphereToSphere(bsphere: BSphere): Sphere {
	const center = new Vector3(bsphere.center.x, bsphere.center.y, bsphere.center.z)
	return new Sphere(center, bsphere.radius)
}

// const InfinityBox = new Box3().set(
// 	new Vector3(-Infinity, -Infinity, -Infinity),
// 	new Vector3(+Infinity, +Infinity, +Infinity)
// )
export function computeBBox(geometry: GeomDataType): BBox {
	const box = new Box3()
	const v = new Vector3()
	if (
		geometry.attributes.position &&
		!isDISPOSED(geometry.attributes.position.array) &&
		geometry.attributes.position.array.length > 0
	) {
		const positions = geometry.attributes.position.array
		const itemSize = geometry.attributes.position.itemSize
		for (let i = 0, l = positions.length; i < l; i += itemSize) {
			box.expandByPoint(v.fromArray(positions, i))
		}
	} else {
		// console.warn('Geometry does not have position attribute, generating an infinity box')
		// box.copy(InfinityBox)
		box.set(
			new Vector3(-Infinity, -Infinity, -Infinity),
			new Vector3(+Infinity, +Infinity, +Infinity)
		)
	}
	geometry.boundingBox = box

	return box
}

export function computeBSphere(geometry: GeomDataType): BSphere {
	const sphere = new Sphere()
	const center = sphere.center
	const v = new Vector3()
	if (geometry.attributes.position && !isDISPOSED(geometry.attributes.position.array)) {
		if (!geometry.boundingBox) computeBBox(geometry)

		const box = geometry.boundingBox as Box3
		center.copy(v.addVectors(box.min, box.max).multiplyScalar(0.5))

		// Compatability for InfinityBox
		if (!isNaN(center.x) && !isNaN(center.y) && !isNaN(center.z)) {
			// Try to find sphere radius less than BBox diagonal
			let maxRadiusSq = 0
			const positions = geometry.attributes.position.array
			for (let i = 0, il = positions.length; i < il; i += 3) {
				v.fromArray(positions, i)
				maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(v))
			}
			const min = new Vector3().copy(box.min as Vector3)
			const max = new Vector3().copy(box.max as Vector3)
			const boxDiag = min.distanceTo(max) * 0.5

			// Choose the smaller one: box diagonal, or sphere radius
			sphere.radius = Math.min(Math.sqrt(maxRadiusSq), boxDiag)

			geometry.boundingSphere = sphere
			return sphere
		}
	}

	// console.warn('Geometry does not have position attribute, generating an infinity sphere')
	// sphere.copy(InfinitySphere)
	sphere.center.set(0, 0, 0)
	sphere.radius = Infinity

	geometry.boundingSphere = sphere
	return sphere
}

export function mergeGeometries(geometries: GeomDataType[]): GeomDataType | undefined {
	if (!geometries || geometries.length === 0) {
		return
	}
	// 模版
	const target = geometries[0]

	// 合并结果
	const result: GeomDataType = {
		mode: target.mode,
		attributes: {},
	}

	// 所有数据按顺序整理到一起
	const attributes: Map<string, AttributeDataType[]> = new Map()
	const indices: AttributeDataType[] = []

	indices.push(target.indices as AttributeDataType)
	for (const key in target.attributes) {
		if (Object.prototype.hasOwnProperty.call(target.attributes, key)) {
			const attr = target.attributes[key]
			attributes.set(key, [attr])
		}
	}

	for (let i = 1; i < geometries.length; i++) {
		const geom = geometries[i]
		// TODO 判断 mode
		// TODO 合并 extensions extras
		// TODO 处理 drawRange

		indices.push(geom.indices as AttributeDataType)
		attributes.forEach((v, k) => {
			v.push(geom.attributes[k])
		})
	}

	// 合并
	result.indices = mergeIndices(indices, attributes.get('position') as AttributeDataType[])
	attributes.forEach((v, k) => {
		result.attributes[k] = mergeAttributes(v)
	})

	return result
}

function mergeAttributes(attributes: AttributeDataType[]) {
	const target = attributes[0]

	let arrayLength = 0
	let count = 0
	let pointer = 0
	const offsets: number[] = []

	for (let i = 0; i < attributes.length; i++) {
		const attr = attributes[i]
		arrayLength += attr.array.length
		count += attr.array.length / attr.itemSize
		offsets.push(pointer)
		pointer = arrayLength
	}

	const result: AttributeDataType = {
		array: new (getTypedArrayConstructor(target.array as TypedArray))(arrayLength),
		itemSize: target.itemSize,
		count,
		normalized: target.normalized,
		usage: target.usage,
		version: 0,
	}

	for (let i = 0; i < attributes.length; i++) {
		const attr = attributes[i]
		const offset = offsets[i]
		;(result.array as TypedArray).set(attr.array as TypedArray, offset)
	}

	return result
}

function mergeIndices(attributes: AttributeDataType[], positions: AttributeDataType[]) {
	const target = attributes[0]

	let arrayLength = 0
	let count = 0
	let pointer = 0
	const offsets: number[] = []
	const positionOffsets: number[] = []
	let positionOffsetLast = 0

	for (let i = 0; i < attributes.length; i++) {
		const attr = attributes[i]
		arrayLength += attr.array.length
		count += attr.array.length / attr.itemSize
		offsets.push(pointer)
		pointer = arrayLength
		positionOffsets.push(positionOffsetLast)
		positionOffsetLast += positions[i].array.length / positions[i].itemSize
	}

	const result: AttributeDataType = {
		array: new (getTypedArrayConstructor(target.array as TypedArray))(arrayLength),
		itemSize: target.itemSize,
		count,
		normalized: target.normalized,
		usage: target.usage,
		version: 0,
	}

	for (let i = 0; i < attributes.length; i++) {
		const attr = attributes[i]
		const offset = offsets[i]
		const positionOffset = positionOffsets[i]

		for (let i = 0; i < attr.array.length; i++) {
			;(attr.array as TypedArray)[i] += positionOffset
		}
		;(result.array as TypedArray).set(attr.array as TypedArray, offset)
	}

	return result
}

function getTypedArrayConstructor(typedArray: TypedArray) {
	if (typedArray instanceof Float32Array) {
		return Float32Array
	}
	if (typedArray instanceof Uint32Array) {
		return Uint32Array
	}
	if (typedArray instanceof Uint16Array) {
		return Uint16Array
	}
	if (typedArray instanceof Int16Array) {
		return Int16Array
	}
	if (typedArray instanceof Uint8Array) {
		return Uint8Array
	}
	if (typedArray instanceof Int8Array) {
		return Int8Array
	}
	throw new Error('不支持的 TypedArray 类型')
}

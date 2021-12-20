/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */
//
/* eslint-disable array-element-newline */
import {
	BBox,
	BSphere,
	GeomDataType,
	isDISPOSED,
	TypedArray,
	AttributeDataType,
} from '@gs.i/schema-scene'
import { Box3, Sphere, Vector3 } from '@gs.i/utils-math'

export function convBBoxToBox3(bbox: BBox): Box3 {
	const min = new Vector3(bbox.min.x, bbox.min.y, bbox.min.z)
	const max = new Vector3(bbox.max.x, bbox.max.y, bbox.max.z)
	return new Box3(min, max)
}

export function convBox3ToBBox(box: Box3): BBox {
	return {
		min: {
			x: box.min.x,
			y: box.min.y,
			z: box.min.z,
		},
		max: {
			x: box.max.x,
			y: box.max.y,
			z: box.max.z,
		},
	}
}

export function convBSphereToSphere(bsphere: BSphere): Sphere {
	const center = new Vector3(bsphere.center.x, bsphere.center.y, bsphere.center.z)
	return new Sphere(center, bsphere.radius)
}

export function convSphereToBSphere(sphere: Sphere): BSphere {
	return {
		center: {
			x: sphere.center.x,
			y: sphere.center.y,
			z: sphere.center.z,
		},
		radius: sphere.radius,
	}
}

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
		console.warn('Geometry does not have position attribute, generating an infinity box')
		// box.copy(InfinityBox)
		box.set(
			new Vector3(-Infinity, -Infinity, -Infinity),
			new Vector3(+Infinity, +Infinity, +Infinity)
		)
	}

	return convBox3ToBBox(box)
}

/**
 * AN EFFICIENT BOUNDING SPHERE by Jack Ritter
 * @link http://inis.jinr.ru/sl/vol1/CMC/Graphics_Gems_1,ed_A.Glassner.pdf - Page 301
 * @param geometry
 * @returns
 */
export function computeBSphere(geometry: GeomDataType): BSphere {
	if (!geometry.attributes.position || isDISPOSED(geometry.attributes.position.array)) {
		console.warn('Geometry does not have position attribute, generating an infinity sphere')
		return convSphereToBSphere(infinitySphere())
	}

	const minX = new Vector3(Infinity, 0, 0)
	const maxX = new Vector3(-Infinity, 0, 0)
	const minY = new Vector3(0, Infinity, 0)
	const maxY = new Vector3(0, -Infinity, 0)
	const minZ = new Vector3(0, 0, Infinity)
	const maxZ = new Vector3(0, 0, -Infinity)

	const v = new Vector3()

	// first pass
	const positions = geometry.attributes.position.array
	const itemSize = geometry.attributes.position.itemSize
	for (let i = 0, l = positions.length; i < l; i += itemSize) {
		v.fromArray(positions, i)
		if (v.x < minX.x) minX.copy(v)
		if (v.x > maxX.x) maxX.copy(v)
		if (v.y < minX.y) minY.copy(v)
		if (v.y > maxX.y) maxY.copy(v)
		if (v.z < minX.z) minZ.copy(v)
		if (v.z > maxX.z) maxZ.copy(v)
	}

	const distSqX = minX.distanceToSquared(maxX)
	const distSqY = minY.distanceToSquared(maxY)
	const distSqZ = minZ.distanceToSquared(maxZ)
	const maxDistSq = Math.max(distSqX, distSqY, distSqZ)

	let farthestPair: [Vector3, Vector3]
	if (maxDistSq === distSqX) {
		farthestPair = [minX, maxX]
	} else if (maxDistSq === distSqY) {
		farthestPair = [minY, maxY]
	} else {
		farthestPair = [minZ, maxZ]
	}

	const initCenter = new Vector3().addVectors(farthestPair[0], farthestPair[1]).multiplyScalar(0.5)
	const initRadius = farthestPair[0].distanceTo(farthestPair[1]) * 0.5
	const sphere = new Sphere(initCenter, initRadius)

	// second pass
	const dir = new Vector3()
	let radiusSq = sphere.radius * sphere.radius
	for (let i = 0, l = positions.length; i < l; i += itemSize) {
		v.fromArray(positions, i)
		if (v.distanceToSquared(sphere.center) > radiusSq) {
			// expand sphere by outside point
			dir.subVectors(sphere.center, v)
			const diameter = dir.length() + sphere.radius
			const radius = diameter * 0.5
			dir.normalize()
			sphere.center.addVectors(v, dir.multiplyScalar(radius))
			sphere.radius = radius
			radiusSq = radius * radius
		}
	}

	return convSphereToBSphere(sphere)
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
		disposable: true,
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
		disposable: true,
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

export function infinityBox3() {
	const box = new Box3()
	box.min.set(-Infinity, -Infinity, -Infinity)
	box.max.set(Infinity, Infinity, Infinity)
	return box
}

export function infinitySphere() {
	const sphere = new Sphere()
	sphere.center.set(0, 0, 0)
	sphere.radius = Infinity
	return sphere
}

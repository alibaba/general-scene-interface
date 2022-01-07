/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable array-element-newline */
import { BBox, BSphere, Geometry, isDISPOSED, TypedArray, Attribute } from '@gs.i/schema-scene'
import { Vector3 } from '@gs.i/utils-math'

export function genBBoxWireframe(bbox: BBox): Geometry {
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

	const geom: Geometry = {
		mode: 'LINES',
		attributes: {
			position: {
				array: new Float32Array(positions),
				count: positions.length / 3,
				itemSize: 3,
				normalized: false,
				version: 0,
				usage: 'STATIC_DRAW',
				disposable: true,
			},
		},
		indices: {
			array: new Uint16Array(indices),
			count: indices.length,
			itemSize: 1,
			normalized: false,
			version: 0,
			usage: 'STATIC_DRAW',
			disposable: true,
		},
	}

	// geom.boundingBox = computeBBox(geom)
	// geom.boundingSphere = computeBSphere(geom)

	return geom
}

export function genBSphereWireframe(bsphere: BSphere, segments = 12): Geometry {
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

	const geom: Geometry = {
		mode: 'LINES',
		attributes: {
			position: {
				array: new Float32Array(vertices),
				count: vertices.length / 3,
				itemSize: 3,
				normalized: false,
				version: 0,
				usage: 'STATIC_DRAW',
				disposable: true,
			},
		},
		indices: {
			array: indices.length > 65535 ? new Uint32Array(indices) : new Uint16Array(indices),
			itemSize: 1,
			count: indices.length,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			disposable: true,
		},
	}

	return geom
}

export function genGeomWireframe(geom: Geometry): Geometry {
	if (!geom.attributes.position) {
		throw 'Geometry.attributes does not have position or has been disposed'
	}

	const position = geom.attributes.position

	if (isDISPOSED(position.array)) {
		throw 'Position attribute array has been disposed'
	}

	const idxArr: number[] = []
	const posAttr: Attribute = {
		array: position.array.slice() as TypedArray,
		itemSize: position.itemSize,
		count: position.count,
		normalized: position.normalized,
		usage: position.usage,
		version: 0,
		disposable: true,
	}

	if (geom.indices) {
		if (isDISPOSED(geom.indices.array)) {
			throw 'Geometry.indices.array has been disposed'
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

	const wireframe: Geometry = {
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
			disposable: true,
		},
	}

	return wireframe
}

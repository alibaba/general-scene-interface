/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Attribute, Geometry } from '@gs.i/schema-scene'
import { Box3, Sphere, Vector3 } from '@gs.i/utils-math'

export const DefaultParams = {
	width: 1,
	height: 1,
	widthSegments: 1,
	heightSegments: 1,
	normal: false,
	uv: false,
	disposable: false,
}

export function buildPlane(params: Partial<typeof DefaultParams> = {}): Geometry {
	const finalParams = {
		...DefaultParams,
		...params,
	}

	const { width, height, widthSegments, heightSegments, normal, uv, disposable } = finalParams

	const width_half = width / 2
	const height_half = height / 2

	const gridX = Math.floor(widthSegments)
	const gridY = Math.floor(heightSegments)

	const gridX1 = gridX + 1
	const gridY1 = gridY + 1

	const segment_width = width / gridX
	const segment_height = height / gridY

	//

	const indices: number[] = []
	const vertices: number[] = []
	const normals: number[] = []
	const uvs: number[] = []
	const scratchVertex = new Vector3()

	//
	const box = new Box3()
	const sphere = new Sphere()
	let radiusSq = 0

	for (let iy = 0; iy < gridY1; iy++) {
		const y = iy * segment_height - height_half

		for (let ix = 0; ix < gridX1; ix++) {
			const x = ix * segment_width - width_half

			vertices.push(x, -y, 0)

			scratchVertex.set(x, -y, 0)
			box.expandByPoint(scratchVertex)
			radiusSq = Math.max(radiusSq, scratchVertex.distanceToSquared(sphere.center))

			if (normal) {
				normals.push(0, 0, 1)
			}

			if (uv) {
				uvs.push(ix / gridX)
				uvs.push(1 - iy / gridY)
			}
		}
	}

	let maxIndex = 0
	for (let iy = 0; iy < gridY; iy++) {
		for (let ix = 0; ix < gridX; ix++) {
			const a = ix + gridX1 * iy
			const b = ix + gridX1 * (iy + 1)
			const c = ix + 1 + gridX1 * (iy + 1)
			const d = ix + 1 + gridX1 * iy

			indices.push(a, b, d)
			indices.push(b, c, d)

			maxIndex = Math.max(maxIndex, a, b, c, d)
		}
	}

	// build geometry

	const position: Attribute = {
		array: new Float32Array(vertices),
		itemSize: 3,
		count: vertices.length / 3,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
		disposable,
	}

	const indicesAttr: Attribute = {
		array: maxIndex < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
		itemSize: 1,
		count: indices.length,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
		disposable,
	}

	// box.getBoundingSphere(sphere)
	sphere.radius = Math.sqrt(radiusSq)

	const geom: Geometry = {
		mode: 'TRIANGLES' as const,
		attributes: {
			position: position,
		},
		indices: indicesAttr,
		extensions: {
			EXT_geometry_bounds: {
				box: {
					min: { ...box.min },
					max: { ...box.max },
				},
				sphere: {
					center: { ...sphere.center },
					radius: sphere.radius,
				},
			},
		},
	}

	if (normal) {
		geom.attributes['normal'] = {
			array: new Float32Array(normals),
			itemSize: 3,
			count: normals.length / 3,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			disposable,
		}
	}

	if (uv) {
		geom.attributes['uv'] = {
			array: new Float32Array(uvs),
			itemSize: 2,
			count: uvs.length / 2,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			disposable,
		}
	}

	return geom
}

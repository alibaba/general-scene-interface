/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { AttributeDataType, GeomDataType } from '@gs.i/schema'
import { Box3, Sphere, Vector3 } from '@gs.i/utils-math'

export const DefaultParams = {
	radius: 1,
	segments: 8,
	thetaStart: 0,
	thetaLength: Math.PI * 2,
	normal: false,
	uv: false,
}

export function buildCircle(
	params: Partial<{
		radius: number
		segments: number
		thetaStart: number
		thetaLength: number
		normal: boolean
		uv: boolean
	}> = {}
): GeomDataType {
	const finalParams = {
		...DefaultParams,
		...params,
	}

	const { radius, thetaStart, thetaLength, normal, uv } = finalParams
	const segments = Math.max(3, finalParams.segments)

	// buffers

	const indices: number[] = []
	const vertices: number[] = []
	const normals: number[] = []
	const uvs: number[] = []

	// helper variables

	const scratchVertex = new Vector3()
	const scratchUv = { x: 0, y: 0 }

	// center point

	vertices.push(0, 0, 0)
	normals.push(0, 0, 1)
	uvs.push(0.5, 0.5)

	// bbox
	const box = new Box3()
	const sphere = new Sphere()
	let radiusSq = 0

	for (let s = 0, i = 3; s <= segments; s++, i += 3) {
		const segment = thetaStart + (s / segments) * thetaLength

		// vertex

		scratchVertex.x = radius * Math.cos(segment)
		scratchVertex.y = radius * Math.sin(segment)

		vertices.push(scratchVertex.x, scratchVertex.y, scratchVertex.z)

		box.expandByPoint(scratchVertex)
		radiusSq = Math.max(radiusSq, scratchVertex.distanceToSquared(sphere.center))

		// normal
		if (normal) {
			normals.push(0, 0, 1)
		}

		// uvs
		if (uv) {
			scratchUv.x = (vertices[i] / radius + 1) / 2
			scratchUv.y = (vertices[i + 1] / radius + 1) / 2
		}

		uvs.push(scratchUv.x, scratchUv.y)
	}

	// indices
	let maxIndex = 0
	for (let i = 1; i <= segments; i++) {
		indices.push(i, i + 1, 0)
		maxIndex = Math.max(maxIndex, i + 1)
	}

	// build geometry

	const position: AttributeDataType = {
		array: new Float32Array(vertices),
		itemSize: 3,
		count: vertices.length / 3,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
	}

	const indicesAttr: AttributeDataType = {
		array: maxIndex < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
		itemSize: 1,
		count: indices.length,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
	}

	// box.getBoundingSphere(sphere)
	sphere.radius = Math.sqrt(radiusSq)

	const geom: GeomDataType = {
		mode: 'TRIANGLES' as const,
		attributes: {
			position: position,
		},
		indices: indicesAttr,
		boundingBox: {
			min: { ...box.min },
			max: { ...box.max },
		},
		boundingSphere: {
			center: { ...sphere.center },
			radius: sphere.radius,
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
		}
	}

	return geom
}

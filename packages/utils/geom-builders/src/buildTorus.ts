/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { AttributeDataType, GeomDataType } from '@gs.i/schema'
import { Box3, Sphere, Vector3 } from '@gs.i/utils-math'

export const DefaultParams = {
	radius: 1,
	tube: 0.4,
	radialSegments: 8,
	tubularSegments: 6,
	arc: Math.PI * 2,
	normal: false,
	uv: false,
}

export function buildTorus(
	params: Partial<{
		radius: number
		tube: number
		radialSegments: number
		tubularSegments: number
		arc: number
		normal: boolean
		uv: boolean
	}> = {}
): GeomDataType {
	const finalParam = {
		...DefaultParams,
		...params,
	}

	const { radius, tube, arc, normal, uv } = finalParam

	const radialSegments = Math.floor(finalParam.radialSegments)
	const tubularSegments = Math.floor(finalParam.tubularSegments)

	// buffers

	const indices: number[] = []
	const vertices: number[] = []
	const normals: number[] = []
	const uvs: number[] = []

	// bbox
	const box = new Box3()
	const sphere = new Sphere()
	let radiusSq = 0

	// helper variables

	const scratchCenter = new Vector3()
	const scratchVertex = new Vector3()
	const scratchNormal = new Vector3()

	// generate vertices, normals and uvs

	for (let j = 0; j <= radialSegments; j++) {
		for (let i = 0; i <= tubularSegments; i++) {
			const u = (i / tubularSegments) * arc
			const v = (j / radialSegments) * Math.PI * 2

			// vertex

			scratchVertex.x = (radius + tube * Math.cos(v)) * Math.cos(u)
			scratchVertex.y = (radius + tube * Math.cos(v)) * Math.sin(u)
			scratchVertex.z = tube * Math.sin(v)

			vertices.push(scratchVertex.x, scratchVertex.y, scratchVertex.z)

			box.expandByPoint(scratchVertex)
			radiusSq = Math.max(radiusSq, scratchVertex.distanceToSquared(sphere.center))

			// normal

			if (normal) {
				scratchCenter.x = radius * Math.cos(u)
				scratchCenter.y = radius * Math.sin(u)
				scratchNormal.subVectors(scratchVertex, scratchCenter).normalize()

				normals.push(scratchNormal.x, scratchNormal.y, scratchNormal.z)
			}
			// uv

			if (uv) {
				uvs.push(i / tubularSegments)
				uvs.push(j / radialSegments)
			}
		}
	}

	// generate indices

	let maxIndex = 0
	for (let j = 1; j <= radialSegments; j++) {
		for (let i = 1; i <= tubularSegments; i++) {
			// indices

			const a = (tubularSegments + 1) * j + i - 1
			const b = (tubularSegments + 1) * (j - 1) + i - 1
			const c = (tubularSegments + 1) * (j - 1) + i
			const d = (tubularSegments + 1) * j + i

			// faces

			indices.push(a, b, d)
			indices.push(b, c, d)

			maxIndex = Math.max(maxIndex, a, b, c, d)
		}
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

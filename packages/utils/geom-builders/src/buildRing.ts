/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Attribute, Geometry } from '@gs.i/schema-scene'
import { Box3, Sphere, Vector3 } from '@gs.i/utils-math'

export const DefaultParams = {
	innerRadius: 0.5,
	outerRadius: 1,
	thetaSegments: 8,
	phiSegments: 1,
	thetaStart: 0,
	thetaLength: Math.PI * 2,
	normal: false,
	uv: false,
	disposable: false,
}

export function buildRing(params: Partial<typeof DefaultParams> = {}): Geometry {
	const finalParams = {
		...DefaultParams,
		...params,
	}

	const { innerRadius, outerRadius, thetaStart, thetaLength, normal, uv, disposable } = finalParams
	const thetaSegments = Math.max(3, finalParams.thetaSegments)
	const phiSegments = Math.max(1, finalParams.phiSegments)

	// buffers

	const indices: number[] = []
	const vertices: number[] = []
	const normals: number[] = []
	const uvs: number[] = []

	// bbox
	const box = new Box3()
	const sphere = new Sphere()
	let radiusSq = 0

	// some helper variables

	let radius = innerRadius
	const radiusStep = (outerRadius - innerRadius) / phiSegments
	const scratchVertex = new Vector3()
	const scratchUv = { x: 0, y: 0 }

	// generate vertices, normals and uvs

	for (let j = 0; j <= phiSegments; j++) {
		for (let i = 0; i <= thetaSegments; i++) {
			// values are generate from the inside of the ring to the outside

			const segment = thetaStart + (i / thetaSegments) * thetaLength

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

			// uv
			if (uv) {
				scratchUv.x = (scratchVertex.x / outerRadius + 1) / 2
				scratchUv.y = (scratchVertex.y / outerRadius + 1) / 2

				uvs.push(scratchUv.x, scratchUv.y)
			}
		}

		// increase the radius for next row of vertices

		radius += radiusStep
	}

	// indices

	let maxIndex = 0
	for (let j = 0; j < phiSegments; j++) {
		const thetaSegmentLevel = j * (thetaSegments + 1)

		for (let i = 0; i < thetaSegments; i++) {
			const segment = i + thetaSegmentLevel

			const a = segment
			const b = segment + thetaSegments + 1
			const c = segment + thetaSegments + 2
			const d = segment + 1

			// faces

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

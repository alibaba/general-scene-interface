/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Box3, Sphere, Vector3 } from '@gs.i/utils-math'
import { Attribute, Geometry } from '@gs.i/schema-scene'

export const DefaultParams = {
	radius: 1,
	widthSegments: 8,
	heightSegments: 6,
	phiStart: 0,
	phiLength: Math.PI * 2,
	thetaStart: 0,
	thetaLength: Math.PI,
	normal: false,
	uv: false,
}

export function buildSphere(
	params: Partial<{
		radius: number
		widthSegments: number
		heightSegments: number
		phiStart: number
		phiLength: number
		thetaStart: number
		thetaLength: number
		normal: boolean
		uv: boolean
	}> = {}
): Geometry {
	const finalParams = {
		...DefaultParams,
		...params,
	}

	const { radius, phiStart, phiLength, thetaStart, thetaLength, normal, uv } = finalParams
	const widthSegments = Math.max(3, Math.floor(finalParams.widthSegments))
	const heightSegments = Math.max(2, Math.floor(finalParams.heightSegments))

	const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI)

	let index = 0
	const grid: number[][] = []

	const scratchVertex = new Vector3()
	const scratchNormal = new Vector3()

	// buffers

	const indices: number[] = []
	const vertices: number[] = []
	const normals: number[] = []
	const uvs: number[] = []

	// bbox
	const box = new Box3()
	const sphere = new Sphere()
	let radiusSq = 0

	// generate vertices, normals and uvs

	for (let iy = 0; iy <= heightSegments; iy++) {
		const verticesRow: number[] = []

		const v = iy / heightSegments

		// special case for the poles

		let uOffset = 0

		if (iy == 0 && thetaStart == 0) {
			uOffset = 0.5 / widthSegments
		} else if (iy == heightSegments && thetaEnd == Math.PI) {
			uOffset = -0.5 / widthSegments
		}

		for (let ix = 0; ix <= widthSegments; ix++) {
			const u = ix / widthSegments

			// vertex

			scratchVertex.x =
				-radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength)
			scratchVertex.y = radius * Math.cos(thetaStart + v * thetaLength)
			scratchVertex.z =
				radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength)

			vertices.push(scratchVertex.x, scratchVertex.y, scratchVertex.z)

			box.expandByPoint(scratchVertex)
			radiusSq = Math.max(radiusSq, scratchVertex.distanceToSquared(sphere.center))

			// normal

			if (normal) {
				scratchNormal.copy(scratchVertex).normalize()
				normals.push(scratchNormal.x, scratchNormal.y, scratchNormal.z)
			}

			// uv
			if (uv) {
				uvs.push(u + uOffset, 1 - v)
			}

			verticesRow.push(index++)
		}

		grid.push(verticesRow)
	}

	// indices

	let maxIndex = 0
	for (let iy = 0; iy < heightSegments; iy++) {
		for (let ix = 0; ix < widthSegments; ix++) {
			const a = grid[iy][ix + 1]
			const b = grid[iy][ix]
			const c = grid[iy + 1][ix]
			const d = grid[iy + 1][ix + 1]

			if (iy !== 0 || thetaStart > 0) indices.push(a, b, d)
			if (iy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(b, c, d)

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
		disposable: true,
	}

	const indicesAttr: Attribute = {
		array: maxIndex < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
		itemSize: 1,
		count: indices.length,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
		disposable: true,
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
			disposable: true,
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
			disposable: true,
		}
	}

	return geom
}

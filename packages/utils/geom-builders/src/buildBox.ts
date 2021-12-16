/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { AttributeDataType, GeomDataType } from '@gs.i/schema-scene'

export const DefaultParams = {
	width: 1,
	height: 1,
	depth: 1,
	widthSegments: 1,
	heightSegments: 1,
	depthSegments: 1,
	normal: false,
	uv: false,
}

export function buildBox(
	params: Partial<{
		width: number
		height: number
		depth: number
		widthSegments: number
		heightSegments: number
		depthSegments: number
		normal: boolean
		uv: boolean
	}> = {}
): GeomDataType {
	const finalParam = {
		...DefaultParams,
		...params,
	}

	const { width, height, depth, normal, uv } = finalParam
	const widthSegments = Math.floor(finalParam.widthSegments)
	const heightSegments = Math.floor(finalParam.heightSegments)
	const depthSegments = Math.floor(finalParam.depthSegments)

	// buffers

	const indices: number[] = []
	const vertices: number[] = []
	const normals: number[] = []
	const uvs: number[] = []

	// helper variables
	let maxIndex = 0
	let numberOfVertices = 0

	// build each side of the box geometry

	buildPlane('z', 'y', 'x', -1, -1, depth, height, width, depthSegments, heightSegments) // px
	buildPlane('z', 'y', 'x', 1, -1, depth, height, -width, depthSegments, heightSegments) // nx
	buildPlane('x', 'z', 'y', 1, 1, width, depth, height, widthSegments, depthSegments) // py
	buildPlane('x', 'z', 'y', 1, -1, width, depth, -height, widthSegments, depthSegments) // ny
	buildPlane('x', 'y', 'z', 1, -1, width, height, depth, widthSegments, heightSegments) // pz
	buildPlane('x', 'y', 'z', -1, -1, width, height, -depth, widthSegments, heightSegments) // nz

	function buildPlane(u, v, w, udir, vdir, width, height, depth, gridX, gridY) {
		const segmentWidth = width / gridX
		const segmentHeight = height / gridY

		const widthHalf = width / 2
		const heightHalf = height / 2
		const depthHalf = depth / 2

		const gridX1 = gridX + 1
		const gridY1 = gridY + 1

		let vertexCounter = 0

		const vector = { x: 0, y: 0, z: 0 }

		// generate vertices, normals and uvs

		for (let iy = 0; iy < gridY1; iy++) {
			const y = iy * segmentHeight - heightHalf

			for (let ix = 0; ix < gridX1; ix++) {
				const x = ix * segmentWidth - widthHalf

				// set values to correct vector component

				vector[u] = x * udir
				vector[v] = y * vdir
				vector[w] = depthHalf

				// now apply vector to vertex buffer

				vertices.push(vector.x, vector.y, vector.z)

				if (normal) {
					// set values to correct vector component

					vector[u] = 0
					vector[v] = 0
					vector[w] = depth > 0 ? 1 : -1

					// now apply vector to normal buffer

					normals.push(vector.x, vector.y, vector.z)
				}

				if (uv) {
					// uvs

					uvs.push(ix / gridX)
					uvs.push(1 - iy / gridY)
				}

				// counters

				vertexCounter += 1
			}
		}

		// indices

		// 1. you need three indices to draw a single face
		// 2. a single segment consists of two faces
		// 3. so we need to generate six (2*3) indices per segment

		for (let iy = 0; iy < gridY; iy++) {
			for (let ix = 0; ix < gridX; ix++) {
				const a = numberOfVertices + ix + gridX1 * iy
				const b = numberOfVertices + ix + gridX1 * (iy + 1)
				const c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1)
				const d = numberOfVertices + (ix + 1) + gridX1 * iy

				// faces

				indices.push(a, b, d)
				indices.push(b, c, d)

				maxIndex = Math.max(maxIndex, a, b, c)
			}
		}

		// update total number of vertices

		numberOfVertices += vertexCounter
	}

	// build geometry

	const position: AttributeDataType = {
		array: new Float32Array(vertices),
		itemSize: 3,
		count: vertices.length / 3,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
		disposable: true,
	}

	const indicesAttr: AttributeDataType = {
		array: maxIndex < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
		itemSize: 1,
		count: indices.length,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
		disposable: true,
	}

	const geom: GeomDataType = {
		mode: 'TRIANGLES' as const,
		attributes: {
			position: position,
		},
		indices: indicesAttr,
		extensions: {
			EXT_geometry_bounds: {
				box: {
					min: { x: -width / 2, y: -height / 2, z: -depth / 2 },
					max: { x: width / 2, y: height / 2, z: depth / 2 },
				},
				sphere: {
					center: { x: 0, y: 0, z: 0 },
					radius: 0.5 * Math.sqrt(width * width + height * height + depth * depth),
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

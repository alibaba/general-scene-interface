/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Attribute, Geometry } from '@gs.i/schema-scene'
import { Box3, Sphere, Vector2, Vector3 } from '@gs.i/utils-math'

export const DefaultParams = {
	radiusTop: 1,
	radiusBottom: 1,
	height: 1,
	radialSegments: 8,
	heightSegments: 1,
	openEnded: false,
	thetaStart: 0,
	thetaLength: Math.PI * 2,
	normal: false,
	uv: false,
	disposable: false,
}

export function buildCylinder(params: Partial<typeof DefaultParams> = {}): Geometry {
	const finalParams = {
		...DefaultParams,
		...params,
	}

	const {
		radiusTop,
		radiusBottom,
		height,
		openEnded,
		thetaStart,
		thetaLength,
		normal,
		uv,
		disposable,
	} = finalParams
	const radialSegments = Math.floor(finalParams.radialSegments)
	const heightSegments = Math.floor(finalParams.heightSegments)

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

	let index = 0
	let maxIndex = 0
	const indexArray: number[][] = []
	const halfHeight = height / 2

	// generate geometry

	generateTorso()

	if (openEnded === false) {
		if (radiusTop > 0) generateCap(true)
		if (radiusBottom > 0) generateCap(false)
	}

	function generateTorso() {
		const scratchNormal = new Vector3()
		const scratchVertex = new Vector3()

		// this will be used to calculate the normal
		const slope = (radiusBottom - radiusTop) / height

		// generate vertices, normals and uvs

		for (let y = 0; y <= heightSegments; y++) {
			const indexRow: number[] = []

			const v = y / heightSegments

			// calculate the radius of the current row

			const radius = v * (radiusBottom - radiusTop) + radiusTop

			for (let x = 0; x <= radialSegments; x++) {
				const u = x / radialSegments

				const theta = u * thetaLength + thetaStart

				const sinTheta = Math.sin(theta)
				const cosTheta = Math.cos(theta)

				// vertex

				scratchVertex.x = radius * sinTheta
				scratchVertex.y = -v * height + halfHeight
				scratchVertex.z = radius * cosTheta
				vertices.push(scratchVertex.x, scratchVertex.y, scratchVertex.z)

				box.expandByPoint(scratchVertex)
				radiusSq = Math.max(radiusSq, scratchVertex.distanceToSquared(sphere.center))

				// normal

				scratchNormal.set(sinTheta, slope, cosTheta).normalize()
				normals.push(scratchNormal.x, scratchNormal.y, scratchNormal.z)

				// uv

				uvs.push(u, 1 - v)

				// save index of vertex in respective row

				indexRow.push(index++)
			}

			// now save vertices of the row in our index array

			indexArray.push(indexRow)
		}

		// generate indices

		for (let x = 0; x < radialSegments; x++) {
			for (let y = 0; y < heightSegments; y++) {
				// we use the index array to access the correct indices

				const a = indexArray[y][x]
				const b = indexArray[y + 1][x]
				const c = indexArray[y + 1][x + 1]
				const d = indexArray[y][x + 1]

				// faces

				indices.push(a, b, d)
				indices.push(b, c, d)
			}
		}
	}

	function generateCap(top) {
		// save the index of the first center vertex
		const centerIndexStart = index

		const uv = new Vector2()
		const vertex = new Vector3()

		const radius = top === true ? radiusTop : radiusBottom
		const sign = top === true ? 1 : -1

		// first we generate the center vertex data of the cap.
		// because the geometry needs one set of uvs per face,
		// we must generate a center vertex per face/segment

		for (let x = 1; x <= radialSegments; x++) {
			// vertex

			vertices.push(0, halfHeight * sign, 0)

			// normal

			normals.push(0, sign, 0)

			// uv

			uvs.push(0.5, 0.5)

			// increase index

			index++
		}

		// save the index of the last center vertex
		const centerIndexEnd = index

		// now we generate the surrounding vertices, normals and uvs

		for (let x = 0; x <= radialSegments; x++) {
			const u = x / radialSegments
			const theta = u * thetaLength + thetaStart

			const cosTheta = Math.cos(theta)
			const sinTheta = Math.sin(theta)

			// vertex

			vertex.x = radius * sinTheta
			vertex.y = halfHeight * sign
			vertex.z = radius * cosTheta
			vertices.push(vertex.x, vertex.y, vertex.z)

			// normal

			normals.push(0, sign, 0)

			// uv

			uv.x = cosTheta * 0.5 + 0.5
			uv.y = sinTheta * 0.5 * sign + 0.5
			uvs.push(uv.x, uv.y)

			// increase index

			index++
		}

		// generate indices

		for (let x = 0; x < radialSegments; x++) {
			const c = centerIndexStart + x
			const i = centerIndexEnd + x

			if (top === true) {
				// face top

				indices.push(i, i + 1, c)
			} else {
				// face bottom

				indices.push(i + 1, i, c)
			}

			maxIndex = Math.max(maxIndex, i + 1, c)
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

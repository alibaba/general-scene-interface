/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable array-element-newline */
import { Geometry } from '@gs.i/schema-scene'
// import { Box3, Sphere, Vector2, Vector3 } from '@gs.i/utils-math'

import { mergeGeometries, computeBBox, computeBSphere } from '@gs.i/utils-geometry'

import { buildEmpty } from '@gs.i/utils-geom-builders'

export type Point2D = { x: number; y: number }
export type Polyline2D = readonly Point2D[]
export type MultiPolyline2D = readonly Point2D[][]

function isMultiPolyline2D(v: Polyline2D | MultiPolyline2D): v is MultiPolyline2D {
	return Array.isArray(v[0])
}

type JointType = 'miter' | 'bevel' | 'round'

const defaultConfig = {
	uv: true,
	bounds: false,
	normal: false,

	// along the length
	uStart: 0,
	uEnd: 1,

	// alone the width
	vStart: 0,
	vEnd: 1,

	/**
	 * {@link [Canvas.lineJoint](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineJoin)}
	 */
	joint: 'miter' as JointType,

	/**
	 * {@link [Canvas.miterLimit](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/miterLimit)}
	 */
	miterLimit: 10,

	/**
	 * control the max segment radian of the round joint.
	 * @note smaller value means better rounding. but more vertices.
	 * @default Math.PI / 6
	 */
	maxSegmentRadian: Math.PI / 6,

	width: 2,
	attributes: {} as Record<string, number>,
}

export type Config = Partial<typeof defaultConfig> & {
	getWidth?: (percent: number) => number
}

export function buildThickLine(polyline: Polyline2D, config: Config): Geometry {
	if (polyline.length === 0) return buildEmpty()

	const _config = {
		...defaultConfig,
		...config,
	}

	const getWidth = _config.getWidth ? _config.getWidth : () => _config.width

	/**
	 * ```
	 * + + + +
	 * | | | |
	 * + + + +
	 * ```
	 */
	const crossties = [] as { left: Point2D; right: Point2D; original: Point2D; center: Point2D }[]

	// filter collapsed points
	polyline = polyline.filter((p: Point2D, i) => {
		const prev = polyline[i - 1]
		if (prev) {
			if (getDistance(prev, p) < 0.1) {
				return false
			} else {
				return true
			}
		} else {
			return true
		}
	})

	if (polyline.length < 2) return buildEmpty()

	for (let i = 0; i < polyline.length; i++) {
		const prev = polyline[i - 1]
		const curr = polyline[i]
		const next = polyline[i + 1]

		const percent = i / (polyline.length - 1)
		const width = getWidth(percent)

		if (prev === undefined) {
			// start
			const dir = normalize(subPoints(next, curr))
			const leftD = mulPoints(turnLeft(dir), width)
			const rightD = mulPoints(leftD, -1)
			const left = addPoints(curr, leftD)
			const right = addPoints(curr, rightD)
			crossties.push({ left, right, original: curr, center: curr })
		} else if (next === undefined) {
			// end
			const dir = normalize(subPoints(curr, prev))
			const leftD = mulPoints(turnLeft(dir), width)
			const rightD = mulPoints(leftD, -1)
			const left = addPoints(curr, leftD)
			const right = addPoints(curr, rightD)
			crossties.push({ left, right, original: curr, center: curr })
		} else {
			// middle
			const dirPrev = normalize(subPoints(curr, prev))
			const dirNext = normalize(subPoints(next, curr))

			// geometry error: reverse direction back. skip the whole joint
			if (isZero(addPoints(dirPrev, dirNext))) continue

			const dir = normalize(addPoints(dirPrev, dirNext))

			// TODO: check here

			// @note 直角三角形 斜边上的高分成的两个小三角形与原三角形相似
			const cosAlpha = dot(dirPrev, dir)
			let scale = 1 / cosAlpha
			scale = Math.min(scale, _config.miterLimit)

			if (_config.joint === 'miter') {
				const leftD = mulPoints(turnLeft(dir), width * scale)
				const rightD = mulPoints(leftD, -1)
				const left = addPoints(curr, leftD)
				const right = addPoints(curr, rightD)
				crossties.push({ left, right, original: curr, center: curr })
			} else if (_config.joint === 'bevel') {
				const thetaPrev = Math.atan2(dirPrev.y, dirPrev.x) // polar coord -pi~pi
				const thetaNext = Math.atan2(dirNext.y, dirNext.x) // polar coord -pi~pi
				// @note there is not default turn direction. it depends on prevDir
				let isLeftTurn = false
				if (thetaPrev < 0) {
					if (thetaNext > thetaPrev && thetaNext < thetaPrev + Math.PI) {
						isLeftTurn = true
					} else {
						isLeftTurn = false
					}
				} else {
					if (thetaNext < thetaPrev && thetaNext > thetaPrev - Math.PI) {
						isLeftTurn = false
					} else {
						isLeftTurn = true
					}
				}
				// console.log('isLeftTurn', isLeftTurn)

				if (isLeftTurn) {
					const leftD = mulPoints(turnLeft(dir), width * scale)
					const innerPoint = addPoints(curr, leftD)
					const bevelStartD = mulPoints(turnRight(dirPrev), width)
					const bevelStart = addPoints(curr, bevelStartD)
					const bevelEndD = mulPoints(turnRight(dirNext), width)
					const bevelEnd = addPoints(curr, bevelEndD)
					crossties.push({
						left: innerPoint,
						right: bevelStart,
						original: curr,
						center: mulPoints(addPoints(innerPoint, bevelStart), 0.5),
					})
					crossties.push({
						left: innerPoint,
						right: bevelEnd,
						original: curr,
						center: mulPoints(addPoints(innerPoint, bevelEnd), 0.5),
					})
				} else {
					//  right turn
					const rightD = mulPoints(turnRight(dir), width * scale)
					const innerPoint = addPoints(curr, rightD)
					const bevelStartD = mulPoints(turnLeft(dirPrev), width)
					const bevelStart = addPoints(curr, bevelStartD)
					const bevelEndD = mulPoints(turnLeft(dirNext), width)
					const bevelEnd = addPoints(curr, bevelEndD)
					crossties.push({
						left: bevelStart,
						right: innerPoint,
						original: curr,
						center: mulPoints(addPoints(innerPoint, bevelStart), 0.5),
					})
					crossties.push({
						left: bevelEnd,
						right: innerPoint,
						original: curr,
						center: mulPoints(addPoints(innerPoint, bevelEnd), 0.5),
					})
				}
			} else if (_config.joint === 'round') {
				const thetaPrev = Math.atan2(dirPrev.y, dirPrev.x) // polar coord
				const thetaNext = Math.atan2(dirNext.y, dirNext.x) // polar coord
				// @note there is not default turn direction. it depends on prevDir
				let isLeftTurn = false
				if (thetaPrev < 0) {
					if (thetaNext > thetaPrev && thetaNext < thetaPrev + Math.PI) {
						isLeftTurn = true
					} else {
						isLeftTurn = false
					}
				} else {
					if (thetaNext < thetaPrev && thetaNext > thetaPrev - Math.PI) {
						isLeftTurn = false
					} else {
						isLeftTurn = true
					}
				}

				if (isLeftTurn) {
					const leftD = mulPoints(turnLeft(dir), width * scale)
					const innerPoint = addPoints(curr, leftD)
					const bevelStartND = turnRight(dirPrev)
					const bevelEndND = turnRight(dirNext)
					// lerp in polar coord sys
					let thetaBevelStart = Math.atan2(bevelStartND.y, bevelStartND.x)
					let thetaBevelEnd = Math.atan2(bevelEndND.y, bevelEndND.x)

					// 使用优弧
					if (Math.abs(thetaBevelEnd - thetaBevelStart) > Math.PI) {
						// -pi~pi => 0~2pi
						if (thetaBevelStart < 0) {
							thetaBevelStart += 2 * Math.PI
						}
						if (thetaBevelEnd < 0) {
							thetaBevelEnd += 2 * Math.PI
						}
					}

					// console.log('thetaBevelStart', thetaBevelStart)
					// console.log('thetaBevelEnd', thetaBevelEnd)

					const segments = Math.ceil(
						Math.abs(thetaBevelEnd - thetaBevelStart) / _config.maxSegmentRadian
					)

					// @note segment is zero when collinear. 如果两条线平行，segments 为 0
					// in this case, skip this joint (do not add any tie)
					if (segments === 0) continue

					for (let i = 0; i <= segments; i++) {
						const total = thetaBevelEnd - thetaBevelStart
						let theta = thetaBevelStart + total * (i / segments)

						// 0~2pi => -pi~pi
						if (theta > Math.PI) {
							theta -= 2 * Math.PI
						}

						const dir = { x: width * Math.cos(theta), y: width * Math.sin(theta) }
						const bevelPoint = addPoints(curr, dir)
						crossties.push({
							left: innerPoint,
							right: bevelPoint,
							original: curr,
							center: mulPoints(addPoints(innerPoint, bevelPoint), 0.5),
						})
					}
				} else {
					//  right turn
					const rightD = mulPoints(turnRight(dir), width * scale)
					const innerPoint = addPoints(curr, rightD)
					const bevelStartND = turnLeft(dirPrev)
					const bevelEndND = turnLeft(dirNext)
					// lerp in polar coord sys
					let thetaBevelStart = Math.atan2(bevelStartND.y, bevelStartND.x)
					let thetaBevelEnd = Math.atan2(bevelEndND.y, bevelEndND.x)

					// 使用优弧
					if (Math.abs(thetaBevelEnd - thetaBevelStart) > Math.PI) {
						// -pi~pi => 0~2pi
						if (thetaBevelStart < 0) {
							thetaBevelStart += 2 * Math.PI
						}
						if (thetaBevelEnd < 0) {
							thetaBevelEnd += 2 * Math.PI
						}
					}

					// console.log('thetaBevelStart', thetaBevelStart)
					// console.log('thetaBevelEnd', thetaBevelEnd)

					const segments = Math.ceil(
						Math.abs(thetaBevelEnd - thetaBevelStart) / _config.maxSegmentRadian
					)

					// @note segment is zero when collinear. 如果两条线平行，segments 为 0
					// in this case, skip this joint (do not add any tie)
					if (segments === 0) continue

					for (let i = 0; i <= segments; i++) {
						const total = thetaBevelEnd - thetaBevelStart
						let theta = thetaBevelStart + total * (i / segments)

						// 0~2pi => -pi~pi
						if (theta > Math.PI) {
							theta -= 2 * Math.PI
						}

						const dir = { x: width * Math.cos(theta), y: width * Math.sin(theta) }
						const bevelPoint = addPoints(curr, dir)
						crossties.push({
							left: bevelPoint,
							right: innerPoint,
							original: curr,
							center: mulPoints(addPoints(innerPoint, bevelPoint), 0.5),
						})
					}
				}
			} else {
				throw new Error('Invalid joint type: ' + _config.joint)
			}
		}
	}

	// TODO: post check for self-intersection, long miter and so on
	// TODO: bevel 和 round 这里会有面积为0的三角形

	/**
	 * crosstie based intersection detection
	 *
	 * 从 crosstie 生成线，只需要检查 crosstie 有没有交叉即可
	 */

	// triangulate
	// @note ccw counter-clockwise

	/**
	 * ```
	 * 0-2-4-6-8     left  ___
	 * │╱│╱│╱│╱│ ... -->   │↺╱
	 * 1-3-5-7-9     right │╱
	 * ```
	 */
	const positions = [] as number[]
	const indices = [] as number[]
	const uvs = [] as number[]
	const normals = [] as number[]

	let centerPolyline: Polyline2D = []
	let totalLength = 0
	let currentLength = 0
	if (_config.uv) {
		centerPolyline = crossties.map((tie) => tie.center)
		totalLength = getLength(centerPolyline)
	}

	for (let i = 0; i < crossties.length; i++) {
		const tie = crossties[i]
		// const percent = i / (crossties.length - 1)

		// pos
		positions.push(tie.left.x, tie.left.y, 0)
		positions.push(tie.right.x, tie.right.y, 0)

		// uv
		if (_config.uv) {
			const prevTie = crossties[i - 1]
			if (prevTie) {
				currentLength += getDistance(prevTie.center, tie.center)
			}
			const percent = currentLength / totalLength
			const u = map(percent, _config.uStart, _config.uEnd)
			uvs.push(u, _config.vStart, u, _config.vEnd)
		}

		// normals
		if (_config.normal) {
			normals.push(0, 0, 1, 0, 0, 1)
		}

		// index
		if (i < crossties.length - 1) {
			indices.push(
				// left half
				i * 2 + 0,
				i * 2 + 1,
				i * 2 + 2,
				// right half
				i * 2 + 2,
				i * 2 + 1,
				i * 2 + 3
			)
		}
	}

	const geom: Geometry = {
		mode: 'TRIANGLES',
		attributes: {
			position: {
				array: new Float32Array(positions),
				itemSize: 3,
				count: positions.length / 3,
				normalized: false,
				usage: 'STATIC_DRAW',
				version: 0,
				disposable: true,
			},
		},
		indices: {
			array: crossties.length * 2 < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
			itemSize: 1,
			count: indices.length,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			disposable: true,
		},
	}

	if (_config.uv) {
		geom.attributes.uv = {
			array: new Float32Array(uvs),
			itemSize: 2,
			count: uvs.length / 2,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			disposable: true,
		}
	}
	if (_config.normal) {
		geom.attributes.normal = {
			array: new Float32Array(normals),
			itemSize: 3,
			count: uvs.length / 3,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			disposable: true,
		}
	}
	if (_config.bounds) {
		geom.extensions = {
			EXT_geometry_bounds: {
				box: computeBBox(geom),
				sphere: computeBSphere(geom),
			},
		}
	}

	return geom
}

export function buildMultiThickLine(multiPolyline: MultiPolyline2D, config: Config): Geometry {
	if (multiPolyline.length === 0) return buildEmpty()

	const _config = {
		...defaultConfig,
		...config,
	}

	const geoms = [] as Geometry[]

	const lengths = multiPolyline.map((polyline) => getLength(polyline))
	const totalLength = lengths.reduce((sum, current) => sum + current, 0)

	const percents = lengths.map((length) => length / totalLength) // 0~1

	let start = 0 // 0~1
	let end = start + percents[0] // 0~1

	for (let i = 0; i < multiPolyline.length; i++) {
		const polyline = multiPolyline[i]
		const geom = buildThickLine(polyline, {
			..._config,
			uStart: map(start, _config.uStart, _config.uEnd),
			uEnd: map(end, _config.uStart, _config.uEnd),
			bounds: false,
		})

		// If the polyline collapse to a point, the geom will be empty.
		if (geom && geom.attributes.position?.array?.length && geom.indices?.array?.length)
			geoms.push(geom)

		start += percents[i]
		end += percents[i + 1] // @note this will be NAN in the last loop. But ok.
	}

	const result = mergeGeometries(geoms)

	if (result && config.bounds) {
		result.extensions = {
			EXT_geometry_bounds: {
				box: computeBBox(result),
				sphere: computeBSphere(result),
			},
		}
	}

	return result
}

function getLength(polyline: Polyline2D): number {
	let length = 0
	for (let i = 1; i < polyline.length; i++) {
		const pa = polyline[i - 1]
		const pb = polyline[i]
		length += getDistance(pa, pb)
	}

	return length
}

function getDistance(pa: Point2D, pb: Point2D): number {
	const ax = pa.x
	const ay = pa.y
	const bx = pb.x
	const by = pb.y
	return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by))
}

function map(percent: number, lower: number, upper: number): number {
	return lower + (upper - lower) * percent
}

function addPoints(pa: Point2D, pb: Point2D): Point2D {
	return { x: pa.x + pb.x, y: pa.y + pb.y }
}
function subPoints(pa: Point2D, pb: Point2D): Point2D {
	return { x: pa.x - pb.x, y: pa.y - pb.y }
}
function mulPoints(pa: Point2D, scalar: number): Point2D {
	return { x: pa.x * scalar, y: pa.y * scalar }
}
function turnLeft(pa: Point2D): Point2D {
	return { x: -pa.y, y: pa.x }
}
function turnRight(pa: Point2D): Point2D {
	return { x: pa.y, y: -pa.x }
}
function normalize(p: Point2D): Point2D {
	const length = Math.sqrt(p.x * p.x + p.y * p.y)

	if (length === 0) throw new Error('cannot normalize a vector with zero length')
	if (isNaN(length)) throw new Error('cannot normalize a vector with NAN length')

	return { x: p.x / length, y: p.y / length }
}
function dot(pa: Point2D, pb: Point2D): number {
	return pa.x * pb.x + pa.y * pb.y
}
function isZero(p: Point2D): boolean {
	return p.x === 0 && p.y === 0
}

// function buildThickLine(polyline: Polyline2D | MultiPolyline2D, config: Config): Geometry {
// 	if (isMultiPolyline2D(polyline)) {
// 		return buildMultiThickLine
// 	} else {

// 	}
// }

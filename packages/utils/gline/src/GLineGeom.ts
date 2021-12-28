/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { GeomDataType, AttributeDataType, isDISPOSED, BBox, BSphere } from '@gs.i/schema'
import { Vector3, Box3, Sphere } from '@gs.i/utils-math'
import * as GeomUtil from './GeomUtil'

// concat perf test CORRECT https://jsperf.com/multi-array-concat/7

export interface GLineGeomConfig {
	/**
	 * GLine实现方式等级
	 * 4倍点、2倍点、native GL line、native GL point
	 */
	level: 0 | 1 | 2 | 4

	/**
	 * 是否需要频繁动态更新数据
	 */
	dynamic: boolean

	/**
	 * u
	 */
	u: boolean

	/**
	 * NOTE: 用于判断一个点是否被废弃
	 * 由于GLSL中没有Infinity这样的常量，因此只能手工指定一个值
	 */
	infinity: number

	// maxPointsCount: number
	// color: true,
}

export const DefaultGeomConfig: GLineGeomConfig = {
	level: 4,
	dynamic: true,
	u: true,
	infinity: 99999999.999,
	// maxPointsCount: 1,
	// color: true,
}

const DefaultData = {
	positions: [0, 0, 0],
	colors: [0, 0, 0, 1],
}

/**
 * Buffer长度不应该需要用户管理，应该自动根据需要扩大，只扩大不缩小
 */
/**
 * @deprecated
 */
export class GLineGeom implements GeomDataType {
	mode: 'TRIANGLES' | 'LINES' | 'POINTS' | 'SPRITE'
	attributes: { [key: string]: AttributeDataType }
	indices: AttributeDataType
	boundingBox?: BBox
	boundingSphere?: BSphere

	config: GLineGeomConfig & { mag: number }
	buffers: { [key: string]: any } = {}
	usePoint: boolean
	segments: number[]
	segmentProperty: GeomUtil.SegmentProperty
	oldSegmentProperty: GeomUtil.SegmentProperty

	private _bufferPointCount: number

	constructor(props: Partial<GLineGeomConfig> = {}) {
		this.config = { ...DefaultGeomConfig, ...props, mag: -1 }
		// this.config.mag = this.config.level;

		this.attributes = {}

		switch (this.config.level) {
			case 0:
				this.usePoint = true
				this.config.mag = 1
				this.mode = 'POINTS'
				break
			case 1:
				this.config.mag = 1
				this.mode = 'LINES'
				break
			case 2:
				this.config.mag = 2
				this.mode = 'TRIANGLES'
				break
			case 4:
				this.config.mag = 4
				this.mode = 'TRIANGLES'
				break
			default:
				throw new Error(`Level must be 0, 1, 2 or 4. Unsupported level: ${this.config.level}`)
		}

		this._bufferPointCount = 0

		// this.data = DEFAULT_DATE;
		this.segments = GeomUtil.getSegments([])
		this.segmentProperty = GeomUtil.getSegmentProperty(this.segments)

		// this.updateData(DefaultData)
		// this._makeBuffers();
		// this._makeAttributes();
	}

	// 仅当Buffer不存在或者体积需要放大时才重新创建Buffer
	// @NOTE 由于mag是不应该变化的，这里没有必要区分position和其他
	private _makeBuffers() {
		const pointCount = this.segmentProperty.pointCount
		const mag = this.config.mag

		this.buffers.position = new Float32Array((pointCount * 3 + 2 * 3) * mag)
		// @NOTE: GL2 支持 int
		this.buffers.side = new Float32Array(pointCount * mag)
		// 下面的不是必需的，但是会影响updateConfig判断进而严重影响代码整洁
		this.buffers.u = new Float32Array(pointCount * mag)
		this.buffers.color = new Float32Array(pointCount * 4 * mag)

		if (!this.usePoint) {
			this.buffers.index = new Uint32Array((pointCount - 1) * 2 * 3)
		} else {
			// 画线和三角形时，默认值全是0，因为重合点会导致图元坍塌
			// 然而画点是没有坍塌问题，只能主动移除绘制区域
			// NOTE: 应该交给外部处理，GLine给什么画什么
			// this.buffers.position.fill(this.config.infinity)
		}
	}

	private _makeAttributes() {
		const pointCount = this.segmentProperty.pointCount
		const mag = this.config.mag
		const BPE = Float32Array.BYTES_PER_ELEMENT // 每个元素的字节长度
		const vLength = pointCount * 3 * mag // 每个数组数据长度

		// @done @NOTE 这里一开始的BufferView是错误的，没有去掉头尾的Buffer
		const prev_array = new Float32Array(this.buffers.position.buffer, 0, vLength)
		const curr_array = new Float32Array(this.buffers.position.buffer, 3 * mag * BPE, vLength)
		const next_array = new Float32Array(this.buffers.position.buffer, 3 * mag * 2 * BPE, vLength)

		this.attributes.prev = {
			array: prev_array,
			itemSize: 3,
			get count() {
				return this.array.length / this.itemSize
			},
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			updateRanges: [],
		}
		this.attributes.curr = {
			array: curr_array,
			itemSize: 3,
			get count() {
				return this.array.length / this.itemSize
			},
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			updateRanges: [],
		}
		this.attributes.next = {
			array: next_array,
			itemSize: 3,
			get count() {
				return this.array.length / this.itemSize
			},
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			updateRanges: [],
		}
		this.attributes.color = {
			array: this.buffers.color,
			itemSize: 4,
			get count() {
				return this.array.length / this.itemSize
			},
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			updateRanges: [],
		}
		this.attributes.side = {
			array: this.buffers.side,
			itemSize: 1,
			get count() {
				return this.array.length / this.itemSize
			},
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			updateRanges: [],
		}
		this.attributes.u = {
			array: this.buffers.u,
			itemSize: 1,
			get count() {
				return this.array.length / this.itemSize
			},
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			updateRanges: [],
		}
		!this.usePoint &&
			(this.indices = {
				array: this.buffers.index,
				itemSize: 1,
				get count() {
					return this.array.length / this.itemSize
				},
				normalized: false,
				usage: 'STATIC_DRAW',
				version: 0,
				updateRanges: [],
			})

		// 动态属性
		if (this.config.dynamic) {
			this.attributes.curr.usage = 'DYNAMIC_DRAW'
			this.attributes.prev.usage = 'DYNAMIC_DRAW'
			this.attributes.next.usage = 'DYNAMIC_DRAW'
			this.attributes.color.usage = 'DYNAMIC_DRAW'
			this.attributes.side.usage = 'DYNAMIC_DRAW'
			this.attributes.u.usage = 'DYNAMIC_DRAW'
			!this.usePoint && (this.indices.usage = 'DYNAMIC_DRAW')
		}

		if (this.usePoint) {
			// 无index的情况下，THREE和GL2通过position的长度来判断drawCount
			/** @NOTE */
			this.attributes.position = this.attributes.curr
		}
	}

	/**
	 * 全量更新数据
	 * - 从data.positions更新segments
	 * - 调用updateSegments
	 * - 调用updateSubData全量更新数据
	 * @param  {[type]} data [description]
	 */
	updateData(data) {
		this.segments = GeomUtil.getSegments(data.positions)
		this.updateSegments(this.segments)
		this.updateSubData(data, 0, this.segmentProperty.pointCount)
	}

	/**
	 * 分片更新数据
	 * @DONE 如果连续传入多次subdata，需要合并updateRange
	 * @param  {[type]} data   [description]
	 * @param  {[type]} offset [description]
	 * @param  {[type]} length [description]
	 */
	updateSubData(data, offset, length) {
		const pointCount = this.segmentProperty.pointCount
		const mag = this.config.mag

		// 边界校验，不能超出缓冲区
		if (offset < 0) {
			length += offset
			offset = 0
		}
		if (length < 1) {
			return
		}
		if (length > this._bufferPointCount) {
			console.error('buffer溢出')
			return
		}

		if (arrayIsNotEmpty(data.positions)) {
			// bufferUtil.updateVertex(this.attributes.curr.array, dimReduce(data.positions), 3, offset, length, mag);
			// 加速版的数据更新函数
			// let updateVertex = geomUtil.updateVertex
			let updateVertex
			if (mag === 4) {
				updateVertex = GeomUtil.updateVertexTurbo34
			}
			if (mag === 2) {
				updateVertex = GeomUtil.updateVertexTurbo32
			}
			if (mag === 1) {
				updateVertex = GeomUtil.updateVertexTurbo31
			}
			updateVertex(this.attributes.curr.array, dimReduce(data.positions), offset, length)

			// @TODO 使用this.updateRange
			// 合并updateRange
			let newStart, newCount
			this.attributes.curr.updateRanges = this.attributes.curr.updateRanges || [
				{ start: 0, count: -1 },
			]
			const updateRange = this.attributes.curr.updateRanges[0] || { start: 0, count: -1 }
			// THREE目前只会重置count不会重置offset
			if (updateRange.count === -1) {
				newStart = offset * mag * 3
				newCount = length * mag * 3
			} else {
				const oldRight = updateRange.start + updateRange.count
				const newRight = Math.max(offset * mag * 3 + length * mag * 3, oldRight)
				newStart = Math.min(updateRange.start, offset * mag * 3)
				newCount = newRight - newStart
			}

			// console.log(data, offset, length, newOffset, newCount);

			// this.attributes.curr.count = pointCount * mag
			this.attributes.curr.version++
			this.attributes.curr.updateRanges = [{ start: newStart, count: newCount }]

			// this.attributes.prev.count = pointCount * mag
			this.attributes.prev.version++
			// this.attributes.prev.updateRange.offset = newStart
			// this.attributes.prev.updateRange.count = newCount
			this.attributes.prev.updateRanges = [{ start: newStart, count: newCount }]

			// this.attributes.next.count = pointCount * mag
			this.attributes.next.version++
			// this.attributes.next.updateRange.offset = newStart
			// this.attributes.next.updateRange.count = newCount
			this.attributes.next.updateRanges = [{ start: newStart, count: newCount }]

			// Update bbox/bsphere
			this.updateBBox(data.positions)
			this.updateBSphere(data.positions)
		}

		if (arrayIsNotEmpty(data.colors)) {
			// bufferUtil.updateVertex(this.attributes.color.array, dimReduce(data.colors), 4, offset, length, mag);
			// let updateVertex = geomUtil.updateVertex
			let updateVertex
			if (mag === 4) {
				updateVertex = GeomUtil.updateVertexTurbo44
			}
			if (mag === 2) {
				updateVertex = GeomUtil.updateVertexTurbo42
			}
			if (mag === 1) {
				updateVertex = GeomUtil.updateVertexTurbo41
			}
			updateVertex(this.attributes.color.array, dimReduce(data.colors), offset, length)

			// 合并updateRange
			let newStart, newCount
			this.attributes.color.updateRanges = this.attributes.color.updateRanges || [
				{ start: 0, count: -1 },
			]
			const updateRange = this.attributes.color.updateRanges[0] || { start: 0, count: -1 }
			// THREE目前只会重置count不会重置offset
			if (updateRange.count === -1) {
				newStart = offset * mag * 4
				newCount = length * mag * 4
			} else {
				const oldRight = updateRange.start + updateRange.count
				const newRight = Math.max(offset * mag * 4 + length * mag * 4, oldRight)
				newStart = Math.min(updateRange.start, offset * mag * 4)
				newCount = newRight - newStart
			}

			// this.attributes.color.count = pointCount * mag
			// this.attributes.color.needsUpdate = true
			this.attributes.color.version++
			this.attributes.color.updateRanges = [{ start: newStart, count: newCount }]
		}
	}

	// 取中间一段作为一个队列，向队列尾部插入点
	// @TODO Color也应该使用
	shiftEnQueue(data, queueStartPoint, queuePointCount) {
		const pointCount = this.segmentProperty.pointCount
		const mag = this.config.mag
		if (arrayIsNotEmpty(data.positions)) {
			const positions = dimReduce(data.positions)
			const addedPointCount = positions.length / 3
			const moveStep = mag * positions.length
			const queueStart = queueStartPoint * mag * 3
			// const queuePointCount = (queueEndPoint - queueStartPoint) * mag * 3;

			// 偏移现有数据（dequeue）
			if (isDISPOSED(this.attributes.curr.array)) {
				throw new Error('Array is disposed')
			}
			this.attributes.curr.array.copyWithin(
				queueStart,
				queueStart + moveStep,
				queueStart + moveStep + queuePointCount * mag * 3
			)

			// 插入新值
			// let updateVertex = geomUtil.updateVertex
			let updateVertex
			if (mag === 4) {
				updateVertex = GeomUtil.updateVertexTurbo34
			}
			if (mag === 2) {
				updateVertex = GeomUtil.updateVertexTurbo32
			}
			if (mag === 1) {
				updateVertex = GeomUtil.updateVertexTurbo31
			}

			updateVertex(
				this.attributes.curr.array,
				positions,
				queueStartPoint + queuePointCount - addedPointCount,
				addedPointCount
			)

			this.attributes.curr.updateRanges = this.attributes.curr.updateRanges || [
				{ start: 0, count: -1 },
			]
			const range = this.attributes.curr.updateRanges[0] || { start: 0, count: -1 }
			this.updateRange(range, queueStartPoint, queuePointCount, mag, 3)
			this.attributes.prev.updateRanges = [Object.assign({}, range)]
			this.attributes.next.updateRanges = [Object.assign({}, range)]

			this.attributes.curr.version++
			this.attributes.prev.version++
			this.attributes.next.version++

			// this.attributes.curr.count = pointCount * mag
			// this.attributes.curr.needsUpdate = true
			// this.attributes.curr.updateRange.offset = newOffset;
			// this.attributes.curr.updateRange.count = newCount;

			// this.attributes.prev.count = pointCount * mag
			// this.attributes.prev.needsUpdate = true
			// this.attributes.prev.updateRange.offset = newOffset;
			// this.attributes.prev.updateRange.count = newCount;

			// this.attributes.next.count = pointCount * mag
			// this.attributes.next.needsUpdate = true
			// this.attributes.next.updateRange.offset = newOffset;
			// this.attributes.next.updateRange.count = newCount;
		}

		if (arrayIsNotEmpty(data.colors)) {
			console.warn('color shiftEnQueue has not been implemented')
		}
	}

	updateRange(range, start, length, mag, size) {
		// THREE目前只会重置count不会重置offset
		if (range.count === -1) {
			range.start = start * mag * size
			range.count = length * mag * size
		} else {
			const oldRight = range.start + range.count
			const newRight = Math.max(start * mag * size + length * mag * size, oldRight)
			range.start = Math.min(range.start, start * mag * size)
			range.count = newRight - range.start
		}
	}

	/**
	 * 设置断点
	 * - 更新segmentProperty
	 * - 按需更新index和side
	 * @param  {[type]} segments [description]
	 */
	updateSegments(segments) {
		this.oldSegmentProperty = this.segmentProperty
		this.segmentProperty = GeomUtil.getSegmentProperty(this.segments)

		const pointCount = this.segmentProperty.pointCount
		const mag = this.config.mag

		//

		// 判断Buffer是否需要扩张
		let reallocBuffer = false
		if (pointCount > this._bufferPointCount) {
			reallocBuffer = true
		}
		// 扩张Buffer
		if (reallocBuffer) {
			this._makeBuffers()

			// @TODO 非dynamic情况下是可以避免重复创建Attribute的
			// 需要重新创建THREE.BufferAttribute才能在GPU端扩张GLBuffer
			// if (!this.attributes.curr || this.config.dynamic) {
			this._makeAttributes()
			// }
		}

		this._bufferPointCount = pointCount

		//

		if (this.usePoint) return

		// 判断index是否需要更新
		let rebuildIndex = false
		if (this.segmentProperty.segmentCount !== this.oldSegmentProperty.segmentCount) {
			rebuildIndex = true
		}
		if (this.segmentProperty.pointCount !== this.oldSegmentProperty.pointCount) {
			rebuildIndex = true
		}

		let i = 0
		let iter = true
		while (iter) {
			if (i > this.segmentProperty.segmentCount) {
				iter = false
				break
			}
			if (this.segmentProperty.segments[i] !== this.oldSegmentProperty.segments[i]) {
				rebuildIndex = true
				iter = false
				break
			}
			i++
		}

		if (rebuildIndex) {
			GeomUtil.updateIndex(this.indices.array, this.segmentProperty, mag)
			// TODO 为什么要-1
			// this.indices.count = (pointCount - 1) * 2 * 3
			this.indices.version++
			this.indices.updateRanges = [
				{
					start: 0,
					count: this.indices.count * 1,
				},
			]

			GeomUtil.updateSide(this.attributes.side.array, this.segmentProperty, mag)
			// this.attributes.side.count = pointCount * mag
			// this.attributes.side.needsUpdate = true
			this.attributes.side.version++
			this.attributes.side.updateRanges = [{ start: 0, count: this.attributes.side.count * 1 }]

			if (this.config.u) {
				GeomUtil.updateU(this.attributes.u.array, this.segmentProperty, mag)
				// this.attributes.u.count = pointCount * mag
				// this.attributes.u.needsUpdate = true
				this.attributes.u.version++
				this.attributes.u.updateRanges = [{ start: 0, count: this.attributes.u.count * 1 }]
			}
		}
	}

	updateBBox(positions: number[][]) {
		if (this.boundingBox) return
		this.boundingBox = new Box3(
			new Vector3(-Infinity, -Infinity, -Infinity),
			new Vector3(Infinity, Infinity, Infinity)
		)

		// const box = this.boundingBox ?? new Box3()
		// const v = new Vector3()
		// for (let i = 0; i < positions.length; i++) {
		// 	const posArr = positions[i]
		// 	for (let j = 0; j < posArr.length; j += 3) {
		// 		v.set(posArr[j + 0], posArr[j + 1], posArr[j + 2])
		// 		box.expandByPoint(v)
		// 	}
		// }
		// const size = new Vector3()
		// box.getSize(size)
		// if (size.x === 0 && size.y === 0 && size.z === 0) {
		// 	this.boundingBox = InfinityBox.clone()
		// 	return
		// }
		// this.boundingBox = box
	}

	updateBSphere(positions: number[][]) {
		if (this.boundingSphere) return
		this.boundingSphere = new Sphere(new Vector3(), Infinity)

		// if (!this.boundingBox) {
		// 	this.updateBBox(positions)
		// }
		// const bbox = this.boundingBox as BBox
		// const sphere = new Sphere()
		// const v = new Vector3()
		// let maxRadiusSq = 0

		// const center = sphere.center
		// center
		// 	.set(bbox.min.x + bbox.max.x, bbox.min.y + bbox.max.y, bbox.min.z + bbox.max.z)
		// 	.multiplyScalar(0.5)

		// for (let i = 0; i < positions.length; i++) {
		// 	const posArr = positions[i]
		// 	for (let j = 0; j < posArr.length; j += 3) {
		// 		v.set(posArr[j + 0], posArr[j + 1], posArr[j + 2])
		// 		// Try to find sphere radius less than BBox diagonal
		// 		maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(v))
		// 	}
		// }

		// const min = new Vector3().copy(bbox.min as Vector3)
		// const max = new Vector3().copy(bbox.max as Vector3)
		// const boxDiag = min.distanceTo(max) * 0.5

		// // Choose the smaller one: box diagonal, sphere radius
		// sphere.radius = Math.min(Math.sqrt(maxRadiusSq), boxDiag)
		// if (sphere.radius <= 0) {
		// 	this.boundingSphere = InfinitySphere.clone()
		// 	return
		// }
		// this.boundingSphere = sphere
	}
}

// 数组降维
function dimReduce(array) {
	// if (array[0] === undefined) {
	//     console.warn('尝试更新空数组');
	//     return array;
	// }

	let linearArray
	if (Array.isArray(array[0])) {
		linearArray = concatTurbo(array)
	} else if (array[0].BYTES_PER_ELEMENT) {
		linearArray = concatTypedArray(array)
	} else {
		linearArray = array
	}
	return linearArray
}

// 优化的concat
function concatTurbo(arrays: any[][]) {
	const result: any[] = []
	for (let i = 0; i < arrays.length; i++) {
		// result.push.apply(result, arrays[i]);
		const array = arrays[i]
		for (let k = 0; k < array.length; k++) {
			result.push(array[k])
		}
	}
	return result
}

function concatTypedArray(arrays) {
	let length = 0
	const offsets = [0]
	arrays.forEach((array) => {
		length += array.length
		offsets.push(length)
	})

	const result = new arrays[0].constructor(length)
	for (let i = 0; i < arrays.length; i++) {
		result.set(arrays[i], offsets[i])
	}

	return result
}

function arrayIsNotEmpty(array) {
	if (!array) {
		return false
	}
	if (array[0] === undefined) {
		return false
	}
	if (Array.isArray(array[0]) || array[0].BYTES_PER_ELEMENT) {
		if (array[0][0] === undefined) {
			return false
		}
		return true
	}
	return true
}

const InfinityBox = new Box3().set(
	new Vector3(-Infinity, -Infinity, -Infinity),
	new Vector3(+Infinity, +Infinity, +Infinity)
)
const InfinitySphere = new Sphere(new Vector3(0, 0, 0), Infinity)

// function updateBBox(positions: number[][]): BBox {
// 	const box = new Box3()
// 	const v = new Vector3()
// 	for (let i = 0; i < positions.length; i++) {
// 		const posArr = positions[i]
// 		for (let j = 0; j < posArr.length; j += 3) {
// 			v.set(posArr[j + 0], posArr[j + 1], posArr[j + 2])
// 			box.expandByPoint(v)
// 		}
// 	}
// 	const size = new Vector3()
// 	box.getSize(size)
// 	if (size.x === 0 && size.y === 0 && size.z === 0) {
// 		return InfinityBox.clone()
// 	}
// 	return box
// }

// function updateBSphere(positions: number[][], bbox: BBox): BSphere {
// 	const sphere = new Sphere()
// 	const center = sphere.center
// 	const v = new Vector3()
// 	let maxRadiusSq = 0
// 	center
// 		.set(bbox.min.x + bbox.max.x, bbox.min.y + bbox.max.y, bbox.min.z + bbox.max.z)
// 		.multiplyScalar(0.5)

// 	for (let i = 0; i < positions.length; i++) {
// 		const posArr = positions[i]
// 		for (let j = 0; j < posArr.length; j += 3) {
// 			v.set(posArr[j + 0], posArr[j + 1], posArr[j + 2])
// 			// Try to find sphere radius less than BBox diagonal
// 			maxRadiusSq = Math.max(maxRadiusSq, center.distanceToSquared(v))
// 		}
// 	}
// 	sphere.radius = Math.sqrt(maxRadiusSq)
// 	if (sphere.radius <= 0) {
// 		return InfinitySphere.clone()
// 	}
// 	return sphere
// }

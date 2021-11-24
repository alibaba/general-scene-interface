/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

// import wasm from './bufferUtil.wasm.bin';
let wasmIns // 实例化是异步的，实例化完成之前无法使用
let memoryPage = 1 // 当前的内存分页，一页代表64KiB，可储存 16384 位 f.32
const importObject = {
	// @NOTE 从CPP编译出来的WASM无法在外部创建内存
	// memory: new WebAssembly.Memory({
	//     initial: memoryPage, // 64KB * 100 = 6.4MiB
	//     maximum: 65536, // chrome允许的最大值
	// })
}

let g
if (typeof window !== 'undefined') {
	g = window
} else if (typeof self !== 'undefined') {
	g = self
}

// if (g.WebAssembly !== undefined) {
//     g.WebAssembly.instantiate(wasm, importObject)
//     .then(({instance}) => {
//         wasmIns = instance;
//     })
// }

/**
 * @TODO: 和updateVertexTurbo函数簇并列
 * @TODO: 加入其它size和mag的支持
 * @param  {Float32Array} array     写入区域
 * @param  {Float32Array} dataArray  原数据
 * @param  {int} size    1,2,3,4 暂时只支持3
 * @param  {int} offset    写入区域的offset（点数）
 * @param  {int} length    从原数据中剪裁的长度（点数）
 * @param  {int} mag    2,4
 */
function layoutTurbo(array, dataArray, size, offset, length, mag) {
	// 检查内存是否够用
	const pagesNeeded = Math.ceil((dataArray.length * (1 + mag)) / 16384)
	if (pagesNeeded > memoryPage) {
		// 调整内存大小
		wasmIns.exports.memory.grow(pagesNeeded - memoryPage)
		memoryPage = pagesNeeded
	}

	const offsetI = 0
	const offsetBytesI = offsetI * Float32Array.BYTES_PER_ELEMENT
	const offsetO = offsetI + length * size
	const offsetBytesO = offsetO * Float32Array.BYTES_PER_ELEMENT

	const input = new Float32Array(wasmIns.exports.memory.buffer, offsetBytesI, length * size)
	const output = new Float32Array(wasmIns.exports.memory.buffer, offsetBytesO, length * size * mag)

	// 写入input数据
	input.set(dataArray)
	// 运行layout
	if (size === 3 && mag === 4) {
		wasmIns.exports.layout34(offsetBytesI, offsetBytesO, 0, length)
	} else if (size === 3 && mag === 2) {
		wasmIns.exports.layout32(offsetBytesI, offsetBytesO, 0, length)
	} else {
		throw new Error(`找不到合适的turbo函数, size: ${size}, mag: ${mag}`)
	}

	// 输出
	array.set(output, offset * size * mag)
}

/**
 * 这部分是Buffer拼装相关的函数，性能消耗最大，需要格外优化，或者用C++重写
 */

/**
 * 0000 AAAA BBBB CCCC 0000
 * ↓
 * 0000 aaaa BBBB CCCC 0000
 * ↓
 * 0000 AAAA BBBB
 * AAAA BBBB CCCC
 * BBBB CCCC 0000
 */

/**
 * 修改Buffer中特定位置的数值
 * etc.
 *      updateBufferAt(0, buffer, a, size, 1, 4)
 *  或者 updateBufferAt(1, buffer, a, size, 0, 4)
 *      0000 AAAA BBBB CCCC 0000
 *              ↓
 *      0000 aaaa BBBB CCCC 0000
 * @param  {Int} pos      位置
 * @param  {[type]} array [description]
 * @param  {[type]} data       [description]
 * @param  {[type]} size       [description]
 * @param  {[type]} offset     [description]
 * @param  {[type]} length     [description]
 * @param  {[type]} mag   几倍点
 * @return {[type]}            [description]
 */
export function updateVertexAt(pos, array, data, size, offset, mag) {
	// @TODO: 安全检查
	const initOffset = (pos + offset) * size * mag
	for (let i = 0; i < mag; i++) {
		for (let j = 0; j < size; j++) {
			const index = initOffset + i * size + j
			if (index < 0) continue
			array[index] = data[j]
		}
	}
}

// 取出元素
export function getElemArray(pos, array, size, offset = 0, mag = 1) {
	const initOffset = (pos + offset) * size * mag
	return array.slice(initOffset, initOffset + size)
}

// TypedArray版本
export function getElemTypedArray(pos, array, size, offset = 0, mag = 1) {
	const initOffset = (pos + offset) * size * mag
	return array.subArray(initOffset, initOffset + size)
}

// 整片复制 @TODO: 应该有更好性能的方案
export function updateVertex(array, dataArray, size, offset, length, mag) {
	const getElem = dataArray.BYTES_PER_ELEMENT ? getElemTypedArray : getElemArray
	for (let pos = 0; pos < length; pos++) {
		updateVertexAt(pos, array, getElem(pos, dataArray, size), size, offset, mag)
	}
}

// export function updateVertex(array, dataArray, size, offset, length, mag) {
//     const getElem = dataArray.BYTES_PER_ELEMENT ? getElemTypedArray : getElemArray;
//     for (let pos = 0; pos < length; pos++) {
//         const data = getElem(pos, dataArray, size);
//         // const data = [1,2,3];
//         const initOffset = (pos + offset) * size * mag;
//         for (let i = 0; i < mag; i++) {
//             for (let j = 0; j < size; j++) {
//                 array[initOffset + i * size + j] = data[j];
//             }
//         }
//     }
// }

// 高性能方案，手工展开for循环，for循环和getElem占用了多数的cpu时间
export function updateVertexTurbo31(array, dataArray, offset, length) {
	// 'use strict';
	// if (offset < 0) {
	//     length += offset;
	//     offset = 0;
	// }
	for (let pos = 0; pos < length; pos++) {
		const initOffset = (pos + offset) * 3

		// ## formal 2:
		array[initOffset + 0] = dataArray[pos * 3 + 0]
		array[initOffset + 1] = dataArray[pos * 3 + 1]
		array[initOffset + 2] = dataArray[pos * 3 + 2]
	}
}
export function updateVertexTurbo32(array, dataArray, offset, length) {
	// 'use strict';
	// if (offset < 0) {
	//     length += offset;
	//     offset = 0;
	// }

	if (wasmIns && dataArray.BYTES_PER_ELEMENT) {
		return layoutTurbo(array, dataArray, 3, offset, length, 2)
	}

	for (let pos = 0; pos < length; pos++) {
		const initOffset = (pos + offset) * 6

		// ## formal 3：
		const a = dataArray[pos * 3 + 0]
		const b = dataArray[pos * 3 + 1]
		const c = dataArray[pos * 3 + 2]
		array[initOffset + 2] = c
		array[initOffset + 5] = c
		array[initOffset + 0] = a
		array[initOffset + 3] = a
		array[initOffset + 1] = b
		array[initOffset + 4] = b

		// ## formal 2:
		// array[initOffset + 0] = dataArray[pos * 3 + 0];
		// array[initOffset + 1] = dataArray[pos * 3 + 1];
		// array[initOffset + 2] = dataArray[pos * 3 + 2];
		// array[initOffset + 3] = dataArray[pos * 3 + 0];
		// array[initOffset + 4] = dataArray[pos * 3 + 1];
		// array[initOffset + 5] = dataArray[pos * 3 + 2];
	}
}
export function updateVertexTurbo34(array, dataArray, offset, length) {
	// 'use strict';
	// if (offset < 0) {
	//     length += offset;
	//     offset = 0;
	// }
	if (wasmIns && dataArray.BYTES_PER_ELEMENT) {
		return layoutTurbo(array, dataArray, 3, offset, length, 4)
	}
	// console.log('turbo not ready', wasmIns, dataArray.BYTES_PER_ELEMENT);

	for (let pos = 0; pos < length; pos++) {
		const initOffset = (pos + offset) * 12

		// ## formal 3：
		const a = dataArray[pos * 3 + 0]
		const b = dataArray[pos * 3 + 1]
		const c = dataArray[pos * 3 + 2]
		array[initOffset + 2] = c
		array[initOffset + 5] = c
		array[initOffset + 8] = c
		array[initOffset + 11] = c
		array[initOffset + 0] = a
		array[initOffset + 3] = a
		array[initOffset + 6] = a
		array[initOffset + 9] = a
		array[initOffset + 1] = b
		array[initOffset + 4] = b
		array[initOffset + 7] = b
		array[initOffset + 10] = b

		// ## formal 2:
		// array[initOffset + 0] = dataArray[pos * 3 + 0];
		// array[initOffset + 1] = dataArray[pos * 3 + 1];
		// array[initOffset + 2] = dataArray[pos * 3 + 2];
		// array[initOffset + 3] = dataArray[pos * 3 + 0];
		// array[initOffset + 4] = dataArray[pos * 3 + 1];
		// array[initOffset + 5] = dataArray[pos * 3 + 2];
		// array[initOffset + 6] = dataArray[pos * 3 + 0];
		// array[initOffset + 7] = dataArray[pos * 3 + 1];
		// array[initOffset + 8] = dataArray[pos * 3 + 2];
		// array[initOffset + 9] = dataArray[pos * 3 + 0];
		// array[initOffset + 10] = dataArray[pos * 3 + 1];
		// array[initOffset + 11] = dataArray[pos * 3 + 2];

		// ## formal 1:
		// array[initOffset + 0 * 3 + 0] = dataArray[pos * 3 + 0];
		// array[initOffset + 0 * 3 + 1] = dataArray[pos * 3 + 1];
		// array[initOffset + 0 * 3 + 2] = dataArray[pos * 3 + 2];
		// array[initOffset + 1 * 3 + 0] = dataArray[pos * 3 + 0];
		// array[initOffset + 1 * 3 + 1] = dataArray[pos * 3 + 1];
		// array[initOffset + 1 * 3 + 2] = dataArray[pos * 3 + 2];
		// array[initOffset + 2 * 3 + 0] = dataArray[pos * 3 + 0];
		// array[initOffset + 2 * 3 + 1] = dataArray[pos * 3 + 1];
		// array[initOffset + 2 * 3 + 2] = dataArray[pos * 3 + 2];
		// array[initOffset + 3 * 3 + 0] = dataArray[pos * 3 + 0];
		// array[initOffset + 3 * 3 + 1] = dataArray[pos * 3 + 1];
		// array[initOffset + 3 * 3 + 2] = dataArray[pos * 3 + 2];

		// ## formal 0:
		// for (let i = 0; i < 4; i++) {
		//     for (let j = 0; j < 3; j++) {
		//         const index = initOffset + i * 3 + j;
		//         array[index] = dataArray[pos * 3 + j];
		//     }
		// }
	}
}
export function updateVertexTurbo41(array, dataArray, offset, length) {
	for (let pos = 0; pos < length; pos++) {
		const initOffset = (pos + offset) * 4

		array[initOffset + 0] = dataArray[pos * 4 + 0]
		array[initOffset + 1] = dataArray[pos * 4 + 1]
		array[initOffset + 2] = dataArray[pos * 4 + 2]
		array[initOffset + 3] = dataArray[pos * 4 + 3]
	}
}
export function updateVertexTurbo42(array, dataArray, offset, length) {
	// 'use strict';
	// if (offset < 0) {
	//     length += offset;
	//     offset = 0;
	// }
	for (let pos = 0; pos < length; pos++) {
		const initOffset = (pos + offset) * 8

		// ## formal 3：
		const a = dataArray[pos * 4 + 0]
		const b = dataArray[pos * 4 + 1]
		const c = dataArray[pos * 4 + 2]
		const d = dataArray[pos * 4 + 3]
		array[initOffset + 3] = d
		array[initOffset + 7] = d
		array[initOffset + 0] = a
		array[initOffset + 4] = a
		array[initOffset + 1] = b
		array[initOffset + 5] = b
		array[initOffset + 2] = c
		array[initOffset + 6] = c

		// ## formal 2:
		// array[initOffset + 0] = dataArray[pos * 4 + 0];
		// array[initOffset + 1] = dataArray[pos * 4 + 1];
		// array[initOffset + 2] = dataArray[pos * 4 + 2];
		// array[initOffset + 3] = dataArray[pos * 4 + 3];
		// array[initOffset + 4] = dataArray[pos * 4 + 0];
		// array[initOffset + 5] = dataArray[pos * 4 + 1];
		// array[initOffset + 6] = dataArray[pos * 4 + 2];
		// array[initOffset + 7] = dataArray[pos * 4 + 3];
	}
}
export function updateVertexTurbo44(array, dataArray, offset, length) {
	// 'use strict';
	// if (offset < 0) {
	//     length += offset;
	//     offset = 0;
	// }
	for (let pos = 0; pos < length; pos++) {
		const initOffset = (pos + offset) * 16

		// ## formal 3：
		const a = dataArray[pos * 4 + 0]
		const b = dataArray[pos * 4 + 1]
		const c = dataArray[pos * 4 + 2]
		const d = dataArray[pos * 4 + 3]
		array[initOffset + 3] = d
		array[initOffset + 7] = d
		array[initOffset + 11] = d
		array[initOffset + 15] = d
		array[initOffset + 0] = a
		array[initOffset + 4] = a
		array[initOffset + 8] = a
		array[initOffset + 12] = a
		array[initOffset + 1] = b
		array[initOffset + 5] = b
		array[initOffset + 9] = b
		array[initOffset + 13] = b
		array[initOffset + 2] = c
		array[initOffset + 6] = c
		array[initOffset + 10] = c
		array[initOffset + 14] = c

		// ## formal 2:
		// array[initOffset + 0] = dataArray[pos * 4 + 0];
		// array[initOffset + 1] = dataArray[pos * 4 + 1];
		// array[initOffset + 2] = dataArray[pos * 4 + 2];
		// array[initOffset + 3] = dataArray[pos * 4 + 3];
		// array[initOffset + 4] = dataArray[pos * 4 + 0];
		// array[initOffset + 5] = dataArray[pos * 4 + 1];
		// array[initOffset + 6] = dataArray[pos * 4 + 2];
		// array[initOffset + 7] = dataArray[pos * 4 + 3];
		// array[initOffset + 8] = dataArray[pos * 4 + 0];
		// array[initOffset + 9] = dataArray[pos * 4 + 1];
		// array[initOffset + 10] = dataArray[pos * 4 + 2];
		// array[initOffset + 11] = dataArray[pos * 4 + 3];
		// array[initOffset + 12] = dataArray[pos * 4 + 0];
		// array[initOffset + 13] = dataArray[pos * 4 + 1];
		// array[initOffset + 14] = dataArray[pos * 4 + 2];
		// array[initOffset + 15] = dataArray[pos * 4 + 3];

		// ## formal 1:
		// array[initOffset + 0 * 4 + 0] = dataArray[pos * 4 + 0];
		// array[initOffset + 0 * 4 + 1] = dataArray[pos * 4 + 1];
		// array[initOffset + 0 * 4 + 2] = dataArray[pos * 4 + 2];
		// array[initOffset + 0 * 4 + 3] = dataArray[pos * 4 + 3];
		// array[initOffset + 1 * 4 + 0] = dataArray[pos * 4 + 0];
		// array[initOffset + 1 * 4 + 1] = dataArray[pos * 4 + 1];
		// array[initOffset + 1 * 4 + 2] = dataArray[pos * 4 + 2];
		// array[initOffset + 1 * 4 + 3] = dataArray[pos * 4 + 3];
		// array[initOffset + 2 * 4 + 0] = dataArray[pos * 4 + 0];
		// array[initOffset + 2 * 4 + 1] = dataArray[pos * 4 + 1];
		// array[initOffset + 2 * 4 + 2] = dataArray[pos * 4 + 2];
		// array[initOffset + 2 * 4 + 3] = dataArray[pos * 4 + 3];
		// array[initOffset + 3 * 4 + 0] = dataArray[pos * 4 + 0];
		// array[initOffset + 3 * 4 + 1] = dataArray[pos * 4 + 1];
		// array[initOffset + 3 * 4 + 2] = dataArray[pos * 4 + 2];
		// array[initOffset + 3 * 4 + 3] = dataArray[pos * 4 + 3];

		// ## formal 0:
		// for (let i = 0; i < 4; i++) {
		//     for (let j = 0; j < 4; j++) {
		//         const index = initOffset + i * 4 + j;
		//         array[index] = dataArray[pos * 4 + j];
		//     }
		// }
	}
}

// const dataTest = []
// const data2 = [
//     'Ax', 'Ay', 'Az',
//     'Bx', 'By', 'Bz',
//     'Cx', 'Cy', 'Cz',
//     'Dx', 'Dy', 'Dz'
// ];
// // updateVertexAt(2, dataTest, ['Ax', 'Ay', 'Az'], 3, -1, 4)
// updateVertex(dataTest, data2, 3, 0, 4, 4)
// // console.log(getElem(2, data2, 3, 0, 1, false));
// console.log(dataTest);

// benchmark
// const count = 10 * 10000 * 3;
// const testRan = [];
// for (let i = 0; i < count; i++) {
//     testRan.push(Math.random());
// }
//
// const target = new Float32Array(count * 4);
//
//
// // console.time('a')
// export function animate() {
//     updateVertex(target, testRan, 3, 0, count, 4);
//     requestAnimationFrame(animate)
// }
// animate();
// console.timeEnd('a')

export function getSegments(pointsArray: any[][]) {
	// 二维数组
	let dyadicArray: any[] = []
	if (pointsArray[0] === undefined) {
		return [0]
	}
	if (Array.isArray(pointsArray[0]) || pointsArray[0]['BYTES_PER_ELEMENT']) {
		dyadicArray = pointsArray
	} else {
		dyadicArray = [pointsArray]
	}

	return dyadicArray.map((segment) => segment.length / 3)
}

export type SegmentProperty = {
	// 包含几条线段
	segmentCount: number
	// 每条线段的点数
	segments: number[]
	// 总点数
	pointCount: number
	// 每个起始点的位置
	starts: number[]
	// 每个结束点的位置
	ends: number[]
}
export function getSegmentProperty(segments) {
	const r: SegmentProperty = {
		// 包含几条线段
		segmentCount: segments.length,
		// 每条线段的点数
		segments: segments,
		// 总点数
		pointCount: 0,
		// 每个起始点的位置
		starts: [],
		// 每个结束点的位置
		ends: [],
	}

	r.segments.forEach((c) => {
		r.pointCount += c
		// r.segmentsCode += ' ' + c;
	})

	if (r.segmentCount > 1) {
		const sep = [0]
		for (let i = 0; i < r.segmentCount; i++) {
			sep.push(r.segments[i] + sep[i])
		}
		r.starts = sep.slice(0, sep.length - 1)
		r.ends = sep.slice(1).map((item) => {
			return item - 1
		})
	} else {
		r.starts = [0]
		r.ends = [r.pointCount - 1] // @NOTE: 注意-1
	}

	return r
}

// const testData = [
//     [0,0,0, 1,1,1, 2,2,2],
//     [0,0,0, 1,1,1, 2,2,2],
//     [0,0,0, 1,1,1, 2,2,2, 3,3,3],
//     [0,0,0, 1,1,1, 2,2,2],
//     [0,0,0, 1,1,1, 2,2,2, 4,4,4],
//     [0,0,0, 1,1,1, 2,2,2],
// ]

// const testData = [
//     0,0,0, 1,1,1, 2,2,2,
//     0,0,0, 1,1,1, 2,2,2,
//     0,0,0, 1,1,1, 2,2,2, 3,3,3,
//     0,0,0, 1,1,1, 2,2,2,
//     0,0,0, 1,1,1, 2,2,2, 4,4,4,
//     0,0,0, 1,1,1, 2,2,2,
// ]

// const property = getSegmentProperty(getSegments(testData))
// console.log(property);

// @TODO 可以使用 ArrayBuffer.prototype.slice()来快速复制一个完整的index然后替换掉其中的ends
// @TODO 需要构造一个机制来管理一个足够大的初始化ArrayBuffer
export function updateIndex(index, segmentProperty, mag = 4) {
	const len = segmentProperty.pointCount - 1
	const ends = segmentProperty.ends
	// 四倍点
	if (mag === 4) {
		// 编辑所有index
		for (let i = 0; i < len; i++) {
			const ix6 = i * 6
			const ix4 = i * 4
			index[ix6 + 0] = ix4 + 2
			index[ix6 + 1] = ix4 + 3
			index[ix6 + 2] = ix4 + 4
			index[ix6 + 3] = ix4 + 4
			index[ix6 + 4] = ix4 + 3
			index[ix6 + 5] = ix4 + 5
		}
		// 空出线段中所有的间断部分
		ends.forEach((i) => {
			// @TODO fill
			const ix6 = i * 6
			index[ix6 + 0] = 0
			index[ix6 + 1] = 0
			index[ix6 + 2] = 0
			index[ix6 + 3] = 0
			index[ix6 + 4] = 0
			index[ix6 + 5] = 0
		})
		// 两倍点
	} else if (mag === 2) {
		// 编辑所有index
		for (let i = 0; i < len; i++) {
			const ix6 = i * 6
			const ix4 = i * 2
			index[ix6 + 0] = ix4 + 0
			index[ix6 + 1] = ix4 + 1
			index[ix6 + 2] = ix4 + 2
			index[ix6 + 3] = ix4 + 2
			index[ix6 + 4] = ix4 + 1
			index[ix6 + 5] = ix4 + 3
		}
		// 空出线段中所有的间断部分
		ends.forEach((i) => {
			// @TODO fill
			const ix6 = i * 6
			index[ix6 + 0] = 0
			index[ix6 + 1] = 0
			index[ix6 + 2] = 0
			index[ix6 + 3] = 0
			index[ix6 + 4] = 0
			index[ix6 + 5] = 0
		})
		// 原生单点
	} else if (mag === 1) {
		// 编辑所有index
		for (let i = 0; i < len; i++) {
			index[i * 2 + 0] = i
			index[i * 2 + 1] = i + 1
		}
		// 空出线段中所有的间断部分
		ends.forEach((item) => {
			// TODO NOTE 这里当初是为了啥？？？？
			// if (item < this.count - 1) {
			index[item * 2 + 0] = 0
			index[item * 2 + 1] = 0
			// }
		})
	} else {
		throw new Error(`${mag}`)
	}
}

// const index = [];
// updateIndex(index, property);
// console.log(index);

// @TODO 同index，提前构造一个初始化ArrayBuffer
export function updateSide(side, segmentProperty, mag = 4) {
	const count = segmentProperty.pointCount
	const starts = segmentProperty.starts
	const ends = segmentProperty.ends
	// 四倍点
	if (mag === 4) {
		// 编辑所有side
		for (let i = 0; i < count; i++) {
			side[i * 4 + 0] = 1
			side[i * 4 + 1] = -2
			side[i * 4 + 2] = 3
			side[i * 4 + 3] = -4
		}

		// 讲side中所有的起点和终点分别作特殊处理
		starts.forEach((item) => {
			// @TODO fill
			side[item * 4 + 0] += 10
			side[item * 4 + 1] += 10
			side[item * 4 + 2] += 10
			side[item * 4 + 3] += 10
		})
		ends.forEach((item) => {
			// @TODO fill
			side[item * 4 + 0] += 20
			side[item * 4 + 1] += 20
			side[item * 4 + 2] += 20
			side[item * 4 + 3] += 20
		})
		// 两倍点
	} else if (mag === 2) {
		// 编辑所有side
		for (let i = 0; i < count; i++) {
			side[i * 2 + 0] = 1
			side[i * 2 + 1] = -2
		}
		// 讲side中所有的起点和终点分别作特殊处理
		starts.forEach((item) => {
			side[item * 2 + 0] += 10
			side[item * 2 + 1] += 10
		})
		ends.forEach((item) => {
			side[item * 2 + 0] += 20
			side[item * 2 + 1] += 20
		})
		// 原生单点
	} else if (mag === 1) {
		return
	} else {
		throw new Error(`${mag}`)
	}
}

// const side = [];
// updateSide(side, property)
// console.log(side);

export function updateU(u, segmentProperty, mag = 4) {
	// 四倍点
	if (mag === 4) {
		segmentProperty.segments.reduce((pre, seg) => {
			for (let i = 0; i < seg; i++) {
				// 避免除以0造成NAN
				u[(pre + i) * 4 + 0] = i / (seg - 0.9999)
				u[(pre + i) * 4 + 1] = i / (seg - 0.9999)
				u[(pre + i) * 4 + 2] = i / (seg - 0.9999)
				u[(pre + i) * 4 + 3] = i / (seg - 0.9999)
			}
			return pre + seg
		}, 0)
		// 两倍点
	} else if (mag === 2) {
		segmentProperty.segments.reduce((pre, seg) => {
			for (let i = 0; i < seg; i++) {
				u[(pre + i) * 2 + 0] = i / (seg - 1)
				u[(pre + i) * 2 + 1] = i / (seg - 1)
			}
			return pre + seg
		}, 0)
		// 原生单点
	} else if (mag === 1) {
		segmentProperty.segments.reduce((pre, seg) => {
			for (let i = 0; i < seg; i++) {
				u[pre + i] = i / (seg - 1)
			}
			return pre + seg
		}, 0)
	} else {
		throw new Error(`${mag}`)
	}
}

// const u = [];
// updateU(u, property)
// console.log(u);

/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { TypedArray, AttributeDataType, DISPOSED, isDISPOSED } from '@gs.i/schema'

export interface Attr extends AttributeDataType {}
export class Attr implements AttributeDataType {
	/**
	 * 数据
	 * @note 用户可以直接修改这个值的引用，注意校验和旧引用的回收
	 */
	array

	/**
	 * attribute vector size
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer}
	 */
	itemSize

	/**
	 * array.length / itemSize
	 */
	get count() {
		return this.array && this.array !== DISPOSED ? this.array.length / this.itemSize : 0
	}

	/**
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer}
	 */
	normalized: boolean

	/**
	 * buffer是否需要动态更新（动态更新的buffer长度不可变）
	 * 如果需要原地更新，则 DYNAMIC_DRAW
	 * 如果上传一次则不再更新，或者更新需要重新上传一个新的buffer，则 STATIC_DRAW
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData}
	 */
	usage: 'STATIC_DRAW' | 'DYNAMIC_DRAW'

	/**
	 * 当前数据版本
	 * 如果需要更新数据，务必主动将 version ++
	 */
	version = 0

	/**
	 * 已经提交的数据版本
	 * @todo 不要暴露在interface里，应该记录在 conv 内部
	 * @deprecated
	 */
	commitedVersion?

	/**
	 * 脏区域
	 * @QianXun 保留数组形式，在convert时将多个ranges merge成一个
	 */
	updateRanges?

	/**
	 * 一次性数据（用完丢弃）
	 * 用于提示conv和renderer，数据是否需要在ram中保留，还是说上传vram之后应该从ram回收
	 * @note 该值可以 runtime 修改，false -> true, 则在下次判断版本后执行回收，true -> false 则不再执行回收逻辑
	 * @note @todo usage = DYNAMIC_DRAW 时，该值无效？ 始终不主动回收？
	 */
	disposable?: false

	constructor(
		array: TypedArray,
		itemSize: number,
		normalized = false,
		usage: 'STATIC_DRAW' | 'DYNAMIC_DRAW' = 'STATIC_DRAW'
	) {
		this.array = array
		this.itemSize = itemSize
		this.normalized = normalized
		this.usage = usage
	}
}

export function isAttrExisting(attr: AttributeDataType | undefined) {
	if (!attr) return false
	if (isDISPOSED(attr.array) || attr.count === 0) return false
	return true
}

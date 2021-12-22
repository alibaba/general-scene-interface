/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { TypedArray, AttributeDataType, DISPOSED, isDISPOSED } from '@gs.i/schema-scene'
import { specifyAttribute } from '@gs.i/processor-specify'

export interface Attr extends AttributeDataType {}
export class Attr implements AttributeDataType {
	/**
	 * array.length / itemSize
	 */
	get count() {
		return this.array && this.array !== DISPOSED ? this.array.length / this.itemSize : 0
	}

	/**
	 * 脏区域
	 * @deprecated use extension.EXT_buffer_partial_update.updateRanges instead
	 */
	get updateRanges() {
		return this.extensions?.EXT_buffer_partial_update?.updateRanges
	}
	set updateRanges(v) {
		if (!this.extensions) this.extensions = {}
		if (!this.extensions.EXT_buffer_partial_update) this.extensions.EXT_buffer_partial_update = {}

		this.extensions.EXT_buffer_partial_update.updateRanges = v
	}

	constructor(
		array: TypedArray,
		itemSize: AttributeDataType['itemSize'],
		normalized = false,
		usage: 'STATIC_DRAW' | 'DYNAMIC_DRAW' = 'STATIC_DRAW'
	) {
		this.array = array
		this.itemSize = itemSize
		this.normalized = normalized
		this.usage = usage

		specifyAttribute(this)
	}
}

/**
 * TODO delete this
 * @deprecated
 */
export function isAttrExisting(attr: AttributeDataType | undefined) {
	if (!attr) return false
	if (isDISPOSED(attr.array) || attr.count === 0) return false
	return true
}

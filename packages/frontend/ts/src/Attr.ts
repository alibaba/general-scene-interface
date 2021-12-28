/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import {
	TypedArray,
	AttributeBaseDataType,
	AttributeVec3DataType,
	AttributeVec2DataType,
	AttributeScalarDataType,
	AttributeVec4DataType,
	DISPOSED,
	isDISPOSED,
} from '@gs.i/schema-scene'
import { specifyAttribute } from '@gs.i/utils-specify'

export interface Attr<T extends AttributeBaseDataType['itemSize']> extends AttributeBaseDataType {}
export class Attr<T extends AttributeBaseDataType['itemSize']> implements AttributeBaseDataType {
	itemSize: T
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
		itemSize: T,
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
export function isAttrExisting(attr: AttributeBaseDataType | undefined) {
	if (!attr) return false
	if (isDISPOSED(attr.array) || attr.count === 0) return false
	return true
}

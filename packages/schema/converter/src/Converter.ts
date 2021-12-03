/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { MeshDataType } from '@gs.i/schema-scene'

export interface Converter {
	/**
	 * type
	 */
	readonly type: string

	/**
	 * 将gsiMesh转变为指定类型的场景树
	 * 为了保证Renderer中的cache能一直生效，必须对上一次和本次的数据做脏检查来按需增减对象
	 */
	convert: (mesh: MeshDataType) => any

	/**
	 * 手动销毁
	 */
	dispose: () => void
}

/**
 * Used for store any GSI private props for internal mesh processing
 *
 * @type {*}
 */
export const __GSI_MESH_INTERNAL_PROP_KEY_0__ = Symbol()

export type __GSI_MESH_INTERNAL_PROP_0__ = {
	_frustumCulled: boolean
	[key: string]: any
}

export function __defaultMeshInternalProp(): __GSI_MESH_INTERNAL_PROP_0__ {
	return {
		_frustumCulled: false,
	}
}

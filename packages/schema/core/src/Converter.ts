/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { MeshDataType } from './Mesh'

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

	// serialize: (inputScene: any) => MeshDataType

	/**
	 * 手动销毁
	 */
	dispose: () => void
}

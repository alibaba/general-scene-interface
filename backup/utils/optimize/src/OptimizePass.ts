/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { MeshDataType } from '@gs.i/schema'

export interface OptimizePass {
	readonly type: string
	update(gsiMesh: MeshDataType, params: { [key: string]: any }): any
}

/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { GeomDataType } from '@gs.i/schema'

export interface Geom extends GeomDataType {}
export class Geom {
	constructor(params: Partial<GeomDataType> = {}) {
		this.mode = 'TRIANGLES'
		this.attributes = {}
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
	}
}

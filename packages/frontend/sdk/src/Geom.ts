/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import IR from '@gs.i/schema-scene'
import { specifyGeometry } from '@gs.i/utils-specify'

export interface Geom extends IR.Geometry {} // this do member declarations for you
export class Geom implements IR.Geometry {
	/**
	 * boundingBox
	 * @deprecated use processor-bound to improve performance.
	 */
	get boundingBox() {
		return this.extensions?.EXT_geometry_bounds?.box
	}

	set boundingBox(v) {
		if (!this.extensions) this.extensions = {}
		if (!this.extensions.EXT_geometry_bounds) this.extensions.EXT_geometry_bounds = {}

		this.extensions.EXT_geometry_bounds.box = v
	}

	/**
	 * boundingSphere
	 * @deprecated use processor-bound to improve performance.
	 */
	get boundingSphere() {
		return this.extensions?.EXT_geometry_bounds?.sphere
	}
	set boundingSphere(v) {
		if (!this.extensions) this.extensions = {}
		if (!this.extensions.EXT_geometry_bounds) this.extensions.EXT_geometry_bounds = {}

		this.extensions.EXT_geometry_bounds.sphere = v
	}

	/**
	 * drawRange
	 * @deprecated use extensions.EXT_geometry_range.drawRange instead
	 */
	public get drawRange() {
		return this.extensions?.EXT_geometry_range?.drawRange
	}
	public set drawRange(v) {
		if (!this.extensions) this.extensions = {}
		if (!this.extensions.EXT_geometry_range) this.extensions.EXT_geometry_range = {}

		this.extensions.EXT_geometry_range.drawRange = v
	}

	constructor(params: Partial<IR.Geometry> = {}) {
		this.attributes = {}
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}

		specifyGeometry(this)
	}
}

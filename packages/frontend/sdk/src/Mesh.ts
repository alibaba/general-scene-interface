/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import IR from '@gs.i/schema-scene'
import { Vector3, Euler } from '@gs.i/utils-math'

import { specifyNode } from '@gs.i/utils-specify'
import { defaultMatrixProcessor } from './defaultProcessors'

export interface Mesh extends IR.RenderableNode {}
export class Mesh {
	name = 'Mesh'

	/**
	 * @deprecated use {@link IR.MaterialBase.extensions EXT_mesh_order}
	 * @deprecated rely on mechanism of renderers, may act very differently for different backends
	 * @deprecated do not use if you want this to work with different renderers
	 */
	get renderOrder() {
		return this.extensions?.EXT_mesh_order?.renderOrder
	}
	set renderOrder(v) {
		if (!this.extensions) this.extensions = {}
		if (!this.extensions.EXT_mesh_order) this.extensions.EXT_mesh_order = {}

		this.extensions.EXT_mesh_order.renderOrder = v
	}

	transform = new AutoVersionTransform3()

	constructor(params: Partial<Omit<IR.RenderableNode, 'transform'>> = {}) {
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}

		specifyNode(this)
	}

	add(child: IR.NodeLike) {
		if (child.parent) throw new Error('A IR.RenderableNode can only be added once.')
		this.children.add(child)
		child.parent = this
	}

	remove(child: IR.NodeLike) {
		if (child.parent !== this) throw new Error('Not your child.')
		this.children.delete(child)
		delete child.parent
	}

	/**
	 * Calculate and return the mesh worldMatrix immediately
	 * @note you can always assume this matrix is latest. no matter when did you changed any part of the tree
	 * @deprecated use processor-matrix for better performance
	 */
	getWorldMatrix(): number[] {
		return defaultMatrixProcessor.getWorldMatrix(this)
	}
}

export class PointLight extends Mesh implements IR.LuminousNode {
	name = 'PointLight'
	constructor(params: Partial<IR.LuminousEXT> = {}) {
		super()
		this.extensions = {
			EXT_luminous: {
				type: 'point',
				color: params.color,
				intensity: params.intensity,
				range: params.range,
			},
		}
		specifyNode(this)
	}
}

/**
 * A Transform3 that automatically marked as dirty when you changed any property
 * @note it is recommended to increase `.version` manually when you change something
 * @note this class is for folks who don't have the habit to mark something dirty explicitly
 */
export class AutoVersionTransform3 implements IR.Transform3TRS {
	version = 0

	readonly rotation: Euler
	readonly position: Vector3
	readonly scale: Vector3
	// readonly quaternion: Quaternion
	readonly quaternion: never

	constructor() {
		this.rotation = new Proxy(new Euler(), {
			// @note this works when user called a method that set a value
			set: (t, p, v, r) => {
				if (p === 'x' || p === 'y' || p === 'z' || p === 'order') this.version++
				t[p] = v
				return true
			},
		})

		this.position = new Proxy(new Vector3(), {
			set: (t, p, v, r) => {
				if (p === 'x' || p === 'y' || p === 'z') this.version++
				t[p] = v
				return true
			},
		})

		this.scale = new Proxy(new Vector3(1, 1, 1), {
			set: (t, p, v, r) => {
				if (p === 'x' || p === 'y' || p === 'z') this.version++
				t[p] = v
				return true
			},
		})

		// this.quaternion = new Proxy(new Quaternion(), {
		// 	set: (t, p, v, r) => {
		// 		if (p === 'x' || p === 'y' || p === 'z' || p === 'w') this.version++
		// 		t[p] = v
		// 		return true
		// 	},
		// })
	}
}

export function isBufferGeometry(geom?: IR.Geometry): boolean {
	return geom && geom['isBufferGeometry']
}
export function isThreeMaterial(matr?: IR.MaterialBase): boolean {
	return matr && matr['isMaterial']
}

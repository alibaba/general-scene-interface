/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import {
	MatrBaseDataType,
	GeomDataType,
	MeshDataType,
	RenderableMesh,
	Node,
	Transform3TRS,
} from '@gs.i/schema-scene'
import { Vector3, Euler, Quaternion } from '@gs.i/utils-math'

import { specifyMesh } from '@gs.i/processor-specify'
import { defaultMatrixProcessor } from './defaultProcessors'

export interface Mesh extends RenderableMesh, Node {}
export class Mesh {
	name = 'Mesh'

	/**
	 * @deprecated use {@link MatrBaseDataType.extensions EXT_mesh_order}
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

	constructor(params: Partial<Omit<MeshDataType, 'transform'>> = {}) {
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}

		specifyMesh(this)
	}

	add(child: MeshDataType) {
		if (child.parent) throw new Error('A RenderableMesh can only be added once.')
		this.children.add(child)
		child.parent = this
	}

	remove(child: MeshDataType) {
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

/**
 * A Transform3 that automatically marked as dirty when you changed any property
 * @note it is recommended to increase `.version` manually when you change something
 * @note this class is for folks who don't have the habit to mark something dirty explicitly
 */
export class AutoVersionTransform3 implements Transform3TRS {
	version = 0

	readonly rotation: Euler
	readonly position: Vector3
	readonly scale: Vector3
	readonly quaternion: Quaternion

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

		this.scale = new Proxy(new Vector3(), {
			set: (t, p, v, r) => {
				if (p === 'x' || p === 'y' || p === 'z') this.version++
				t[p] = v
				return true
			},
		})

		this.quaternion = new Proxy(new Quaternion(), {
			set: (t, p, v, r) => {
				if (p === 'x' || p === 'y' || p === 'z' || p === 'w') this.version++
				t[p] = v
				return true
			},
		})
	}
}

export function isBufferGeometry(geom?: GeomDataType): boolean {
	return geom && geom['isBufferGeometry']
}
export function isThreeMaterial(matr?: MatrBaseDataType): boolean {
	return matr && matr['isMaterial']
}

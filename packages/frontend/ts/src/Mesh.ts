/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import {
	MatrBaseDataType,
	GeomDataType,
	MeshDataType,
	__GSI_MESH_INTERNAL_PROP_KEY_0__,
	__GSI_MESH_INTERNAL_PROP_0__,
	__defaultMeshInternalProp,
} from '@gs.i/schema'
import { Transform3 } from '@gs.i/utils-transform'
import { Matrix4 } from '@gs.i/utils-math'

export interface Mesh extends MeshDataType {}
export class Mesh {
	name = 'RenderableMesh'

	// visibility
	visible = true

	// render control
	renderOrder = 0

	/**
	 * @todo Transformations
	 * glTF2 中将 transform 定义在 node 中，和 mesh 节点分离
	 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#transformations}
	 */
	// transform
	transform = new Transform3()

	// sub
	children = new Set<MeshDataType>()

	// extra
	extras: { [key: string]: any } = {}

	constructor(params: Partial<Omit<MeshDataType, 'transform'>> = {}) {
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
		// internal props
		this[__GSI_MESH_INTERNAL_PROP_KEY_0__] = __defaultMeshInternalProp()
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
	 * @note parent's worldMatrix will also be calculated
	 * @note The worldMatrix calculated will be cached in mesh.transform.worldMatrix array
	 * @param {boolean} [forceRecalcParents=false] Force recalculate all parents' worldMatrix
	 * @return {*}  {number[]}
	 * @memberof Mesh
	 */
	getWorldMatrix(forceRecalcParents = false): number[] {
		const tf = this.transform
		const internal = this[__GSI_MESH_INTERNAL_PROP_KEY_0__] as __GSI_MESH_INTERNAL_PROP_0__

		if (!internal._selfMat) {
			internal._selfMat = new Matrix4()
			internal._parentMat = new Matrix4()
			internal._worldMat = new Matrix4()
		}

		if (!tf.worldMatrix) {
			tf.worldMatrix = Array.from(tf.matrix)
		}

		if (this.parent) {
			// self matrix
			internal._selfMat.fromArray(tf.matrix)
			// parent's worldMatrix
			if (this.parent instanceof Mesh && forceRecalcParents) {
				internal._parentMat.fromArray(this.parent.getWorldMatrix(forceRecalcParents))
			} else if (this.parent.transform.worldMatrix) {
				// assume parent's worldMatrix is up to date
				internal._parentMat.fromArray(this.parent.transform.worldMatrix)
			} else {
				// using parent's local matrix
				internal._parentMat.fromArray(this.parent.transform.matrix)
			}
			// self matrix multiply parent's matrixWorld
			internal._worldMat
				.multiplyMatrices(internal._parentMat, internal._selfMat)
				.toArray(tf.worldMatrix)
		}

		return tf.worldMatrix
	}
}

export function isBufferGeometry(geom?: GeomDataType): boolean {
	return geom && geom['isBufferGeometry']
}
export function isThreeMaterial(matr?: MatrBaseDataType): boolean {
	return matr && matr['isMaterial']
}

// export interface ConvFromThree {
// 	(input: Mesh): RenderableMesh
// }
// export interface ConvToThree {
// 	(input: RenderableMesh, THREE: any): Mesh
// }

// export abstract class Converter {
// 	setRenderable
// }

/**
 * 将整个数据结构打平，放到一个buffer里
 * 相当于一个带 自解释 IDL 的 gltf
 */
// flatten: () => ArrayBuffer

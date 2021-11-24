/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Euler, Quaternion, Vector3, Matrix4 } from '@gs.i/utils-math'
import { Transform } from './Transform'

const mat4 = new Matrix4()
const quaternion = new Quaternion()

export class Transform3 implements Transform {
	// input
	position = new Vector3()
	rotation = new Euler()
	scale = new Vector3(1, 1, 1)

	// cache
	private _matrixArray: number[]
	// needsUpdate = false

	// output
	get matrix() {
		// 转换四元数
		quaternion.setFromEuler(this.rotation)
		// 合成
		// @note 这个函数十分高效，缓存可能不太划算
		mat4.compose(this.position, quaternion, this.scale)
		// 复制
		if (!this._matrixArray) this._matrixArray = []
		mat4.toArray(this._matrixArray)
		return this._matrixArray
	}

	set matrix(v: number[]) {
		mat4.fromArray(v)
		mat4.decompose(this.position, quaternion, this.scale)
		this.rotation.setFromQuaternion(quaternion)
	}

	worldMatrix = Transform3.identityArray()

	// update
	// update() {}

	static identityArray() {
		return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
	}
}

// export class Transform2 implements Transform {}

// usage
// mesh.transform : numebr[] | Transform3
// mesh.transform = new Transform3()
// mesh.transform.position.x++

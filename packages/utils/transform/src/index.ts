/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { TransformDataType } from '@gs.i/schema'
export * from './Transform3'

export function matrix4Equals(m1: number[], m2: number[]): boolean {
	if (m1.length !== m2.length) {
		return false
	}

	const length = m1.length
	for (let i = 0; i < length; i++) {
		if (m1[i] !== m2[i]) return false
	}

	return true
}
//
export function transformEquals(t1: TransformDataType, t2: TransformDataType): boolean {
	if (!t1.position || !t2.position || !t1.rotation || !t2.rotation || !t1.scale || !t2.scale) {
		return matrix4Equals(t1.matrix, t2.matrix)
	}

	const p1 = t1.position
	const p2 = t2.position
	const e1 = t1.rotation
	const e2 = t2.rotation
	const s1 = t1.scale
	const s2 = t2.scale
	if (
		p1.x === p2.x &&
		p1.y === p2.y &&
		p1.z === p2.z &&
		e1.x === e2.x &&
		e1.y === e2.y &&
		e1.z === e2.z &&
		e1.order === e2.order &&
		s1.x === s2.x &&
		s1.y === s2.y &&
		s1.z === s2.z
	) {
		return true
	} else {
		return false
	}
}

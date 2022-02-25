/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

// import IR from '@gs.i/schema-scene'
// import { specifyMaterial } from '@gs.i/utils-specify'

import { UnlitMaterial } from '@gs.i/frontend-sdk'

export function buildUvMaterial() {
	const matr = new UnlitMaterial()
	matr.vertGlobal = `
	`
	matr.fragOutput = `
	fragColor = vec4(vUv.x, vUv.y, 0.0, 1.0);
	`

	return matr
}

export const uvMaterial = buildUvMaterial()

export const normalMaterial = buildNormalMaterial()

export function buildNormalMaterial() {
	const matr = new UnlitMaterial()
	matr.fragOutput = `
		fragColor = vec4(normal.x, normal.y, normal.z, 1.0);
	`

	return matr
}

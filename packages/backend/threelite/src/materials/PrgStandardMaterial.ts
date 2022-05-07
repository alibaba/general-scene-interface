/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { MeshStandardMaterial, UniformsUtils, ShaderLib } from 'three-lite'
import type IR from '@gs.i/schema-scene'
import vs from './shaders/standard.vs.glsl'
import fs from './shaders/standard.fs.glsl'
import { Shaderlize } from './mixin'

const PrgStandardMaterial = Shaderlize(
	MeshStandardMaterial,
	UniformsUtils.clone(ShaderLib.standard.uniforms),
	vs,
	fs,
	false
)

export type TPrgStandardMaterial = ReturnType<typeof createPrgStandardMaterial>

export function createPrgStandardMaterial(matr: IR.Material) {
	const m = new PrgStandardMaterial()
	m.type = 'GSI-Standard'
	m.updateProgramable(matr)
	return m
}

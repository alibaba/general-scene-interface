/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { MeshBasicMaterial, UniformsUtils, ShaderLib } from 'three'
import type IR from '@gs.i/schema-scene'
import vs from './shaders/unlit.vs.glsl'
import fs from './shaders/unlit.fs.glsl'
import { Shaderlize } from './mixin'

const PrgBasicMaterial = Shaderlize(
	MeshBasicMaterial,
	UniformsUtils.clone(ShaderLib.basic.uniforms),
	vs,
	fs,
	false
)

export type TPrgBasicMaterial = ReturnType<typeof createPrgBasicMaterial>

export function createPrgBasicMaterial(matr: IR.Material) {
	const m = new PrgBasicMaterial()
	m.updateProgramable(matr)
	return m
}

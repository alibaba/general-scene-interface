/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { PointsMaterial, UniformsUtils, ShaderLib } from 'three'
import type IR from '@gs.i/schema-scene'
import vs from './shaders/point.vs.glsl'
import fs from './shaders/point.fs.glsl'
import { Shaderlize } from './mixin'

const PrgPointMaterial = Shaderlize(
	PointsMaterial,
	UniformsUtils.clone(ShaderLib.points.uniforms),
	vs,
	fs,
	false
)

export type TPrgPointMaterial = ReturnType<typeof createPrgPointMaterial>

export function createPrgPointMaterial(matr: IR.Material) {
	const m = new PrgPointMaterial()
	m.type = 'GSI-Point'
	m.updateProgramable(matr)
	return m
}

/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { MeshPhysicalMaterial, UniformsUtils, ShaderLib } from 'three'
import type IR from '@gs.i/schema-scene'
import vs from './shaders/standard.vs.glsl'
import fs from './shaders/standard.fs.glsl'
import { Shaderlize } from './mixin'

export const PrgPhysicalMaterial = Shaderlize(MeshPhysicalMaterial, vs, fs)

export type TPrgPhysicalMaterial = ReturnType<typeof createPrgPhysicalMaterial>

export function createPrgPhysicalMaterial(matr: IR.Material) {
	const m = new PrgPhysicalMaterial()
	m.type = 'GSI-Standard'
	m.lights = true
	m.uniforms = UniformsUtils.clone(ShaderLib.physical.uniforms)
	m.updateProgramable(matr)

	return m
}

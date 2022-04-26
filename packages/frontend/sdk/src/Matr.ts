/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import IR from '@gs.i/schema-scene'

import { specifyMaterial } from '@gs.i/utils-specify'

interface MatrBase extends IR.MaterialBase, IR.Programable {}
class MatrBase implements IR.MaterialBase {
	// set .version first because following setters use it.
	version = 0

	/**
	 * to simplify usage, init extensions now rather than when used.
	 *
	 * @note it is very important to init ALL THE POSSIBLE extensions in
	 *       this base class. if you extends it in subclass. it will be
	 *       replaced. but all the assignment was done by `super()`
	 */
	readonly extensions: NonNullable<Required<IR.MaterialBase['extensions']>> = {
		EXT_matr_advanced: {},
		EXT_matr_uv_transform: { matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1] },
		EXT_matr_programmable: {
			language: 'GLSL300',
			extension: '',
			defines: {},
			uniforms: {},
		},
		EXT_matr_programmable_point: {},
		EXT_matr_programmable_pbr: {},
	}

	// alias to extensions

	get language() {
		return this.extensions.EXT_matr_programmable.language
	}
	set language(v) {
		this.extensions.EXT_matr_programmable.language = v
	}
	get extension() {
		return this.extensions.EXT_matr_programmable.extension
	}
	set extension(v) {
		this.extensions.EXT_matr_programmable.extension = v
	}
	get defines() {
		return this.extensions.EXT_matr_programmable.defines
	}
	set defines(v) {
		this.extensions.EXT_matr_programmable.defines = v
	}
	get uniforms() {
		return this.extensions.EXT_matr_programmable.uniforms as {
			[name: string]: IR.Uniform // remove undefined
		}
	}
	set uniforms(v) {
		this.extensions.EXT_matr_programmable.uniforms = v
	}
	get global() {
		return this.extensions.EXT_matr_programmable.global
	}
	set global(v) {
		this.version++
		this.extensions.EXT_matr_programmable.global = v
	}
	get vertGlobal() {
		return this.extensions.EXT_matr_programmable.vertGlobal
	}
	set vertGlobal(v) {
		this.version++
		this.extensions.EXT_matr_programmable.vertGlobal = v
	}
	get vertGeometry() {
		return this.extensions.EXT_matr_programmable.vertGeometry
	}
	set vertGeometry(v) {
		this.version++
		this.extensions.EXT_matr_programmable.vertGeometry = v
	}
	get vertOutput() {
		return this.extensions.EXT_matr_programmable.vertOutput
	}
	set vertOutput(v) {
		this.version++
		this.extensions.EXT_matr_programmable.vertOutput = v
	}
	get fragGlobal() {
		return this.extensions.EXT_matr_programmable.fragGlobal
	}
	set fragGlobal(v) {
		this.version++
		this.extensions.EXT_matr_programmable.fragGlobal = v
	}
	get fragOutput() {
		return this.extensions.EXT_matr_programmable.fragOutput
	}
	set fragOutput(v) {
		this.version++
		this.extensions.EXT_matr_programmable.fragOutput = v
	}

	// legacy

	/**
	 * @deprecated use {@link IR.MaterialBase.opacity}
	 */
	get alphaCutoff() {
		return this.opacity
	}
	set alphaCutoff(v) {
		this.opacity = v
	}

	/**
	 * @deprecated use {@link IR.MaterialBase.extensions EXT_matr_advanced}
	 */
	get depthTest() {
		return this.extensions.EXT_matr_advanced?.depthTest
	}
	set depthTest(v) {
		this.version++
		this.extensions.EXT_matr_advanced.depthTest = v
	}

	/**
	 * @deprecated use {@link IR.MaterialBase.extensions EXT_matr_advanced}
	 */
	get depthWrite() {
		return this.extensions.EXT_matr_advanced?.depthWrite
	}
	set depthWrite(v) {
		this.version++
		this.extensions.EXT_matr_advanced.depthWrite = v
	}

	constructor(params: Partial<MatrBase>) {
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}

		specifyMaterial(this)
	}
}

export interface PbrMaterial extends IR.PbrMaterial, MatrBase, IR.ProgramablePbr {}
export class PbrMaterial extends MatrBase {
	get type() {
		return 'pbr' as const
	}

	name = 'MatrPbr'

	// @note @important use the same object in base class
	readonly extensions: Required<NonNullable<IR.PbrMaterial['extensions']>>

	get fragPreLighting() {
		return this.extensions.EXT_matr_programmable_pbr.fragPreLighting
	}
	set fragPreLighting(v) {
		this.version++
		this.extensions.EXT_matr_programmable_pbr.fragPreLighting = v
	}
	get fragGeometry() {
		return this.extensions.EXT_matr_programmable_pbr.fragGeometry
	}
	set fragGeometry(v) {
		this.version++
		this.extensions.EXT_matr_programmable_pbr.fragGeometry = v
	}

	constructor(params: Partial<PbrMaterial> = {}) {
		super(params)
	}
}
/**
 * @deprecated renamed to {@link PbrMaterial}
 */
export const MatrPbr = PbrMaterial

export interface UnlitMaterial extends MatrBase, IR.UnlitMaterial {}
export class UnlitMaterial extends MatrBase {
	get type() {
		return 'unlit' as const
	}

	name = 'MatrUnlit'

	// @note @important use the same object in base class
	readonly extensions: Required<NonNullable<IR.UnlitMaterial['extensions']>>

	constructor(params: Partial<UnlitMaterial> = {}) {
		super(params)
	}
}
/**
 * @deprecated renamed to {@link UnlitMaterial}
 */
export const MatrUnlit = UnlitMaterial

export interface PointMaterial extends IR.PointMaterial, MatrBase {}
export class PointMaterial extends MatrBase {
	get type() {
		return 'point' as const
	}

	name = 'MatrPoint'

	get vertPointGeometry() {
		return this.extensions.EXT_matr_programmable_point.vertPointGeometry
	}
	set vertPointGeometry(v) {
		this.version++
		this.extensions.EXT_matr_programmable_point.vertPointGeometry = v
	}

	// @note @important use the same object in base class
	readonly extensions: Required<NonNullable<IR.PointMaterial['extensions']>>

	constructor(params: Partial<PointMaterial> = {}) {
		super(params)
	}
}
/**
 * @deprecated renamed to {@link PointMaterial}
 */
export const MatrPoint = PointMaterial

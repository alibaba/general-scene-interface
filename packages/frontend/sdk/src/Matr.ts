/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import IR from '@gs.i/schema-scene'

import { specifyMaterial } from '@gs.i/utils-specify'

const pbrPrgProperties = ['fragPreLighting', 'fragGeometry'] as any[]
const pointPrgProperties = ['vertPointGeometry'] as any[]
const spritePrgProperties = ['vertSpriteGeometry'] as any[]
const prgProperties = [
	'language',
	'extension',
	'defines',
	'uniforms',
	'global',
	'vertGlobal',
	'vertGeometry',
	'vertOutput',
	'fragGlobal',
	'fragOutput',
] as any[]

/**
 * 筛选 proxy 中真正的 property 位置，使用这种方式来把所有 extensions 中的 key 映射到 matr 类上
 */
function getObject(target: IR.MaterialBase, property) {
	let o: any
	if (Reflect.has(target, property)) {
		o = target
	} else if (prgProperties.indexOf(property) > -1) {
		if (!target.extensions) target.extensions = {}
		if (!target.extensions.EXT_matr_programmable)
			target.extensions.EXT_matr_programmable = {
				language: 'GLSL300',
				extension: '',
				defines: {},
				uniforms: {},
			}

		o = target.extensions.EXT_matr_programmable
	} else if (pbrPrgProperties.indexOf(property) > -1) {
		if (!target.extensions) target.extensions = {}
		if (!target.extensions.EXT_matr_programmable_pbr)
			target.extensions.EXT_matr_programmable_pbr = {}

		o = target.extensions?.EXT_matr_programmable_pbr
	} else if (pointPrgProperties.indexOf(property) > -1) {
		if (!target.extensions) target.extensions = {}
		if (!target.extensions.EXT_matr_programmable_point)
			target.extensions.EXT_matr_programmable_point = {}

		o = target.extensions?.EXT_matr_programmable_point
	} else if (spritePrgProperties.indexOf(property) > -1) {
		if (!target.extensions) target.extensions = {}
		if (!target.extensions.EXT_matr_programmable_sprite)
			target.extensions.EXT_matr_programmable_sprite = {}

		o = target.extensions?.EXT_matr_programmable_sprite
	} else {
		o = target
	}

	return o || {}
}

interface MatrBase extends IR.MaterialBase, IR.Programable {}
class MatrBase implements IR.MaterialBase {
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
		return this.extensions?.EXT_matr_advanced?.depthTest
	}
	set depthTest(v) {
		if (!this.extensions) this.extensions = {}
		if (!this.extensions.EXT_matr_advanced) this.extensions.EXT_matr_advanced = {}

		this.extensions.EXT_matr_advanced.depthTest = v
	}

	/**
	 * @deprecated use {@link IR.MaterialBase.extensions EXT_matr_advanced}
	 */
	get depthWrite() {
		return this.extensions?.EXT_matr_advanced?.depthWrite
	}
	set depthWrite(v) {
		if (!this.extensions) this.extensions = {}
		if (!this.extensions.EXT_matr_advanced) this.extensions.EXT_matr_advanced = {}

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

		return new Proxy(this, {
			/**
			 * @note this object should be considered as IR for backend
			 * 		 get handler has performance issues
			 * 		 these properties are deprecated and write only
			 */
			// get: (target, property, receiver) => {
			// 	const o = getObject(target, property)
			// 	return o[property]
			// },
			set: (target, property, value, receiver) => {
				const o = getObject(target, property)
				o[property] = value

				return true
			},
		}) as MatrBase & IR.Programable
	}
}

export interface PbrMaterial extends IR.PbrMaterial, MatrBase, IR.ProgramablePbr {}
export class PbrMaterial extends MatrBase {
	get type() {
		return 'pbr' as const
	}

	name = 'MatrPbr'

	extensions: Required<Exclude<IR.PbrMaterial['extensions'], undefined>> = {
		EXT_matr_advanced: {},
		EXT_matr_programmable: {
			language: 'GLSL300',
			defines: {},
			uniforms: {},
			extension: '',
		},
		EXT_matr_programmable_pbr: {},
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

	extensions: Required<Exclude<IR.UnlitMaterial['extensions'], undefined>> = {
		EXT_matr_advanced: {},
		EXT_matr_programmable: {
			language: 'GLSL300',
			defines: {},
			uniforms: {},
			extension: '',
		},
	}

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

	vertPointGeometry?: string

	extensions: Required<Exclude<IR.PointMaterial['extensions'], undefined>> = {
		EXT_matr_advanced: {},
		EXT_matr_programmable: {
			language: 'GLSL300',
			defines: {},
			uniforms: {},
			extension: '',
		},
		EXT_matr_programmable_point: {},
	}

	constructor(params: Partial<IR.PointMaterial> = {}) {
		super(params)
	}
}
/**
 * @deprecated renamed to {@link PointMaterial}
 */
export const MatrPoint = PointMaterial

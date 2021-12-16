/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import {
	readonly,
	MatrBaseDataType,
	MatrPbrDataType,
	MatrUnlitDataType,
	MatrPointDataType,
	MatrSpriteDataType,
	UniformDataType,
	ShaderType,
	Programable,
	ProgramablePbr,
	ColorRGB,
	Double,
	TextureType,
} from '@gs.i/schema-scene'

import { specifyMaterial } from '@gs.i/processor-specify'

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
function getObject(target: MatrBaseDataType, property) {
	let o: any
	if (prgProperties.indexOf(property) > -1) {
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

interface MatrBase extends MatrBaseDataType, Programable {}
class MatrBase implements MatrBaseDataType {
	// legacy

	/**
	 * @deprecated use {@link MatrBaseDataType.opacity}
	 */
	get alphaCutoff() {
		return this.opacity
	}
	set alphaCutoff(v) {
		this.opacity = v
	}

	/**
	 * @deprecated use {@link MatrBaseDataType.extensions EXT_matr_advanced}
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
	 * @deprecated use {@link MatrBaseDataType.extensions EXT_matr_advanced}
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
			get: (target, property, receiver) => {
				const o = getObject(target, property)
				return o[property]
			},
			set: (target, property, value, receiver) => {
				const o = getObject(target, property)
				o[property] = value

				return true
			},
		}) as MatrBase & Programable
	}
}

export interface MatrPbr extends MatrPbrDataType, MatrBase, ProgramablePbr {}
export class MatrPbr extends MatrBase {
	get type() {
		return 'pbr' as const
	}

	name = 'MatrPbr'

	extensions: MatrPbrDataType['extensions']

	constructor(params: Partial<MatrPbr> = {}) {
		super(params)
	}
}

export interface MatrUnlit extends MatrBase, MatrUnlitDataType {}
export class MatrUnlit extends MatrBase {
	get type() {
		return 'unlit' as const
	}

	name = 'MatrUnlit'

	constructor(params: Partial<MatrUnlit> = {}) {
		super(params)
	}
}

export interface MatrPoint extends MatrPointDataType, MatrBase {}
export class MatrPoint extends MatrBase {
	get type() {
		return 'point' as const
	}

	name = 'MatrPoint'

	vertPointGeometry?: string

	extensions: MatrPointDataType['extensions']

	constructor(params: Partial<MatrPointDataType> = {}) {
		super(params)
	}
}

//
export interface MatrSprite extends MatrSpriteDataType, MatrBase {}
export class MatrSprite extends MatrBase {
	get type() {
		return 'sprite' as const
	}

	vertSpriteGeometry?: string

	name = 'MatrSprite'

	extensions: MatrSpriteDataType['extensions']

	constructor(params: Partial<MatrSpriteDataType> = {}) {
		super(params)
	}
}

/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Mesh } from '@gs.i/frontend-sdk'
import { GLineGeom } from './GLineGeom'
import { GLineMatr, GLinePointMatr } from './GLineMatr'
import { BBox, BSphere, ColorRGB, TextureType, Vec2 } from '@gs.i/schema-scene'

export interface DefaultGLineConfig {
	/**
	 * GLine实现方式等级
	 * 4倍点、2倍点、native GL line、native GL point
	 */
	level: 0 | 1 | 2 | 4

	opacity: number

	lineWidth: number

	usePerspective?: boolean

	/**
	 * 画布分辨率
	 */
	resolution: Vec2

	useColors: boolean

	transparent?: boolean

	/**
	 * 如果有colors，此项会被忽略
	 */
	color?: ColorRGB

	/**
	 * 是否需要频繁动态更新数据
	 */
	dynamic?: boolean

	/**
	 * u
	 */
	u?: boolean

	texture?: TextureType

	pointSize?: number

	/**
	 * NOTE: 用于判断一个点是否被废弃
	 * 由于GLSL中没有Infinity这样的常量，因此只能手工指定一个值
	 */
	infinity?: number

	/**
	 * 是否进行深度测试
	 */
	depthTest?: boolean

	/**
	 * Dispose positions/u/indices attributes after uploading to GPU
	 */
	positionsDisposable?: boolean

	/**
	 * Dispose colors attribute after uploading to GPU
	 */
	colorsDisposable?: boolean

	renderOrder?: number
}

export const DefaultConfig: DefaultGLineConfig = {
	level: 4,
	dynamic: false,
	u: true,
	color: { r: 1, g: 0.4, b: 0.1 },
	opacity: 1.0,
	lineWidth: 10.0,
	usePerspective: true,
	resolution: { x: 500, y: 500 },
	useColors: false,
	texture: undefined,
	positionsDisposable: false,
	colorsDisposable: false,
	pointSize: 5,
	depthTest: true,
	renderOrder: 0,
	infinity: 99999999.999,
}

/**
 * GLine
 * 继承GSI-Mesh, 可以直接被加入gsi场景中
 * @extends Mesh
 */
export class GLine extends Mesh {
	config: any
	level: 0 | 1 | 2 | 4

	material: GLineMatr | GLinePointMatr
	geometry: GLineGeom

	extensions: Exclude<Mesh['extensions'], undefined> = {}

	constructor(props: DefaultGLineConfig) {
		super()

		const config = {
			...DefaultConfig,
			...props,
		}

		this.config = config

		this.extensions.EXT_mesh_order = {
			renderOrder: config.renderOrder,
		}
		this.extensions.EXT_mesh_advanced = {
			frustumCulling: true,
		}

		if (![0, 1, 2, 4].includes(this.config.level)) {
			throw new Error(`GSI::GLine - Invalid level: ${this.config.level}, expected: 0 | 1 | 2 | 4`)
		}

		this.level = this.config.level

		this.geometry = new GLineGeom(this.config)

		if (this.level === 0) {
			this.material = new GLinePointMatr(this.config)
		} else {
			this.material = new GLineMatr(this.config)
		}
	}

	updateData(
		data,
		bounds: {
			box?: BBox
			sphere?: BSphere
		} = {}
	) {
		if (this.geometry) {
			return this.geometry.updateData(data, bounds)
		}
		throw new Error('GLine - no geometry found')
	}

	updateSubData(
		data,
		offset,
		length,
		bounds: {
			box?: BBox
			sphere?: BSphere
		} = {}
	) {
		if (this.geometry) {
			return this.geometry.updateSubData(data, offset, length, bounds)
		}
		throw new Error('GLine - no geometry found')
	}

	static get Geometry() {
		return GLineGeom
	}

	static get Material() {
		return GLineMatr
	}
}

/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

/* eslint-disable array-element-newline */
import { BBox, BSphere, ColorRGB, Texture, Vec2 } from '@gs.i/schema-scene'
import { Mesh } from '@gs.i/frontend-sdk'
import { SpriteData, SpriteGeom } from './SpriteGeom'
import { SpriteMatr } from './SpriteMatr'

export interface SpriteConfig {
	/**
	 *
	 */
	sizeAttenuation: boolean

	/**
	 * Whether to use attribute transforms (offset/scale/rotation)
	 */
	useAttributeTransform: boolean

	/**
	 * @default {r:1, g:1, b: 1}
	 */
	baseColorFactor?: ColorRGB

	/**
	 *
	 */
	baseColorTexture?: Texture

	/**
	 *
	 */
	uniformOffset?: Vec2

	/**
	 *
	 */
	uniformScale?: Vec2

	/**
	 *
	 */
	uniformRotation?: number

	/**
	 *
	 */
	depthTest?: boolean

	/**
	 *
	 */
	depthWrite?: boolean

	/**
	 *
	 */
	dynamic?: boolean

	/**
	 *
	 */
	disposable?: boolean
}

export const defaultConfig: SpriteConfig = {
	sizeAttenuation: false,
	useAttributeTransform: false,
	dynamic: false,
	disposable: false,
}

/**
 * GSI Sprite
 */
export class Sprite extends Mesh {
	readonly config: SpriteConfig
	geometry: SpriteGeom
	material: SpriteMatr

	// raycast(ray: Ray): any {}

	constructor(config: Partial<SpriteConfig> = {}) {
		super()
		this.config = {
			...defaultConfig,
			...config,
		}
		this.geometry = new SpriteGeom(this.config)
		this.material = new SpriteMatr(this.config)
	}

	updateData(
		data: SpriteData,
		bounds: {
			box?: BBox
			sphere?: BSphere
		} = {}
	) {
		return this.geometry.updateData(data, bounds)
	}

	updateSubData(
		data: Partial<SpriteData>,
		/**
		 * sprite count offset
		 */
		offset: number,
		/**
		 * sprite count length
		 */
		length: number,
		/**
		 * user input bounds
		 */
		bounds: {
			box?: BBox
			sphere?: BSphere
		} = {}
	) {
		return this.geometry.updateSubData(data, offset, length, bounds)
	}
}

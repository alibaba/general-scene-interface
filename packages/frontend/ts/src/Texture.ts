/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { ImageDataType, SamplerDataType, TextureType } from '@gs.i/schema'

export interface ImageData extends ImageDataType {}
export class ImageData {
	version = 0

	flipY = false

	constructor(params: Partial<ImageDataType> = {}) {
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
		// Check width & height of image data
		if (this.image) {
			if (this.image instanceof HTMLElement) {
				this.width = this.image.width
				this.height = this.image.height
			} else if (!this.width || !this.height) {
				throw new Error('width & height must be provided for image data: TypedArray | DataView . ')
			}
		}
	}
}

export interface Sampler extends SamplerDataType {}
export class Sampler {
	constructor(params: Partial<SamplerDataType> = {}) {
		// https://mariusschulz.com/articles/string-literal-types-in-typescript
		this.magFilter = 'LINEAR'
		this.minFilter = 'LINEAR'
		this.wrapS = 'REPEAT'
		this.wrapT = 'REPEAT'
		this.anisotropy = 1
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}
	}
}

export interface TextureData extends TextureType {}
export class TextureData {
	constructor(params: Partial<TextureType>) {
		this.sampler = new Sampler(params.sampler)
		this.image = new ImageData(params.image)
		this.transform = params.transform ? params.transform : [1, 0, 0, 0, 1, 0, 0, 0, 1]
	}
}

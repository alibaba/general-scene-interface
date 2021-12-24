/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { ImageDataType, SamplerDataType, TextureType, Int } from '@gs.i/schema-scene'
import { specifyTexture, specifyImage, specifySampler } from '@gs.i/utils-specify'

export interface ImageData extends ImageDataType {}
export class ImageData {
	/**
	 * @deprecated Use {@link ImageDataType.extensions}
	 */
	public get flipY() {
		return this.extensions?.EXT_image?.flipY
	}
	public set flipY(v) {
		if (!this.extensions) this.extensions = {}
		if (!this.extensions.EXT_image) this.extensions.EXT_image = {}

		this.extensions.EXT_image.flipY = v
	}

	constructor(params: {
		imageSource: Exclude<
			| ImageDataType['data']
			| ImageDataType['uri']
			| HTMLImageElement
			| HTMLCanvasElement
			| HTMLVideoElement,
			undefined
		>
		width?: Int
		height?: Int
	}) {
		const { imageSource, width, height } = params
		if (typeof imageSource === 'string') {
			this.uri = imageSource
		} else if (imageSource instanceof HTMLElement) {
			if (!this.extensions) this.extensions = {}
			if (!this.extensions.EXT_image) this.extensions.EXT_image = {}

			this.extensions.EXT_image.HTMLImage = imageSource
		} else {
			this.data = imageSource
		}

		this.width = width
		this.height = height

		specifyImage(this)
	}
}

export interface Sampler extends SamplerDataType {}
export class Sampler {
	constructor(params: Partial<SamplerDataType> = {}) {
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}

		specifySampler(this)
	}
}

export interface TextureData extends TextureType {}
export class TextureData {
	constructor(
		image: ConstructorParameters<typeof ImageData>[0],
		sampler: ConstructorParameters<typeof Sampler>[0]
	) {
		this.sampler = new Sampler(sampler)
		this.image = new ImageData(image)

		specifyTexture(this)
	}
}

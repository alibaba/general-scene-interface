/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { IR, Int } from '@gs.i/schema-scene'
import { specifyTexture, specifyImage, specifySampler } from '@gs.i/utils-specify'

export interface Image extends IR.Image {}
export class Image {
	/**
	 * @deprecated Use {@link Image.extensions}
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
			IR.Image['data'] | IR.Image['uri'] | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
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

/**
 * @deprecated
 */
export const ImageData = Image

export interface Sampler extends IR.Sampler {}
export class Sampler {
	constructor(params: Partial<Sampler> = {}) {
		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}

		specifySampler(this)
	}
}

export interface Texture extends IR.Texture {}
export class Texture {
	constructor(
		image: ConstructorParameters<typeof Image>[0],
		sampler: ConstructorParameters<typeof Sampler>[0]
	) {
		this.sampler = new Sampler(sampler)
		this.image = new Image(image)

		specifyTexture(this)
	}
}

/**
 * @deprecated
 */
export const TextureData = Texture

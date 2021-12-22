/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { TypedArray, Matrix, Versioned } from './basic'

/**
 * texture and sampler
 *
 * @参照 gltf2 贴图数据与采样器分离
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#texture-data}
 * sampler 与 texture 分离 符合 webgl2 和现代图形api 设计
 * 扩展数据源，兼容 three 的设计
 *
 * @todo Cube Texture
 * @todo Compressed Texture
 * @todo
 */

/**
 * Texture
 */
export interface Texture {
	sampler: SamplerDataType
	image: ImageDataType
	transform: Matrix
	extensions?: { [key: string]: any }
	extras?: any
}
/**
 * @deprecated use Texture instead
 * @alias Texture
 */
export type TextureData = Texture
/**
 * @deprecated use Texture instead
 * @alias Texture
 */
export type TextureType = Texture

/**
 * CubeTexture
 */
export interface CubeTexture {
	sampler: SamplerDataType
	images: ImageDataType[]
	extensions?: { [key: string]: any }
	extras?: any
}
/**
 * @deprecated use CubeTexture instead
 * @alias CubeTexture
 */
export type CubeTextureType = CubeTexture

/**
 * @note glTF2 标准没有提及 format 和 innerFormat
 * @link https://github.com/KhronosGroup/glTF/issues/835
 *
 * - 考虑到用户从外部输入的image基本都是 rgba png 或者 rgb jpeg
 * - 复杂 format 基本只会在流水线内部和后期逻辑中出现
 * - 这里交给转换器和渲染引擎选择合理的配置
 *
 * - if has `.data`, must not have `.uri` and `.extensions.EXT_image.HTMLImage`
 * - else if has `.uri`, must not have `.extensions.EXT_image.HTMLImage`
 * - else must have `.extensions.EXT_image.HTMLImage`
 */
export interface ImageDataType extends Versioned {
	/**
	 * 图片数据
	 *
	 * Array or buffer as Image Data
	 */
	data?: TypedArray | DataView

	/**
	 * Image宽高,
	 * 如果使用 array 数据，则需要
	 *
	 * If use array or buffer as Image Data.
	 * Width and height will be necessary
	 */
	width?: number
	/**
	 * Image宽高.
	 * 如果使用 array 数据，则需要
	 *
	 * If use array or buffer as Image Data.
	 * Width and height will be necessary
	 */
	height?: number

	/**
	 * 图片 uri
	 */
	uri?: string

	extensions?: {
		EXT_image?: {
			/**
			 * 是否反转Y轴坐标
			 * - gl.UNPACK_FLIP_Y_WEBGL
			 * - gltf2 不需要反转
			 * - three 需要反转
			 * @link https://github.com/KhronosGroup/glTF-Sample-Viewer/issues/16
			 *
			 * @default true
			 */
			flipY?: boolean

			/**
			 * HTML图片数据
			 */
			HTMLImage?: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
		}
		[key: string]: any
	}
	extras?: any
}

/**
 * Sampler 定义
 * 按照 webgpu 和 webgl2 的设计，把 sampler 和 texture data 分离开，兼容 webgl1
 */
export interface SamplerDataType {
	/**
	 * @default 'NEAREST'
	 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#samplermagfilter}
	 */
	magFilter: 'NEAREST' | 'LINEAR'

	/**
	 * @default 'NEAREST'
	 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#samplerminfilter}
	 */
	minFilter:
		| 'NEAREST'
		| 'LINEAR'
		| 'NEAREST_MIPMAP_NEAREST'
		| 'LINEAR_MIPMAP_NEAREST'
		| 'NEAREST_MIPMAP_LINEAR'
		| 'LINEAR_MIPMAP_LINEAR'

	/**
	 * @default 'CLAMP_TO_EDGE'
	 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#samplerwraps}
	 */
	wrapS: 'CLAMP_TO_EDGE' | 'MIRRORED_REPEAT' | 'REPEAT'
	wrapT: 'CLAMP_TO_EDGE' | 'MIRRORED_REPEAT' | 'REPEAT'

	/**
	 * @default 1
	 * 0 or 1 means close this feature
	 *
	 * 各向异性过滤级数
	 */
	anisotropy: 0 | 1 | 2 | 4 | 8 | 16

	extensions?: { [key: string]: any }
	extras?: any
}

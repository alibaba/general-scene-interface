/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { TypedArray } from './basic'

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

export interface TextureType {
	sampler: SamplerDataType
	image: ImageDataType
	transform?: number[]
	extensions?: { [key: string]: any }
	extras?: any
}

export interface CubeTextureType {
	sampler: SamplerDataType
	images: ImageDataType[]
	extensions?: { [key: string]: any }
	extras?: any
}

export interface ImageDataType {
	/**
	 * 图片 uri
	 */
	uri?: string

	/**
	 * 图片数据
	 */
	image?: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement | TypedArray | DataView

	/**
	 * 当前数据版本
	 * 如果需要更新，务必 主动 version ++
	 */
	version?: number

	/**
	 * Image宽高
	 * 如果使用 array 数据，务必指定
	 */
	width?: number
	height?: number

	/**
	 * @note glTF2 标准没有提及 format 和 innerFormat
	 * {@link https://github.com/KhronosGroup/glTF/issues/835}
	 * 考虑到用户从外部输入的image基本都是 rgba png 或者 rgb jpeg
	 * 复杂 format 基本只会在流水线内部和后期逻辑中出现
	 * 这里交给转换器和渲染引擎选择合理的配置
	 */
	format?: any

	/**
	 * 是否反转Y轴坐标
	 * gl.UNPACK_FLIP_Y_WEBGL
	 * gltf2 不需要反转
	 * three 需要反转
	 */
	flipY?: boolean
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
	magFilter?: 'NEAREST' | 'LINEAR'

	/**
	 * @default 'NEAREST'
	 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#samplerminfilter}
	 */
	minFilter?:
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
	wrapS?: 'CLAMP_TO_EDGE' | 'MIRRORED_REPEAT' | 'REPEAT'
	wrapT?: 'CLAMP_TO_EDGE' | 'MIRRORED_REPEAT' | 'REPEAT'

	/**
	 * @default 1
	 * 各向异性过滤级数
	 */
	anisotropy?: 1 | 2 | 4 | 8 | 16
}

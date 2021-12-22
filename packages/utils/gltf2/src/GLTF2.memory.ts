/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { TypedArray } from '@gs.i/schema-scene'
/**
 * GLTF2 的内存格式接口
 * gltf2 只提供了 json 格式，其中 uri 直接指向了 文件资源
 * 为了在程序运行时使用，需要定义一个 内存形式 的 gltf2
 */

import { Buffer, GlTf } from './GLTF'

export interface BufferM extends Buffer {
	data: TypedArray
}

/**
 * gltf2 的 内存格式 GLM（二进制格式是GLB）
 */
// export interface GLM extends Pick<GlTf, 'asset'|'buffer'|'bufferViews'|'images'|'materials'|'meshes'|'nodes'|'samplers'|''> {
// 	buffers: BufferM[]
// }

export interface GLM extends Required<GlTf> {}
export class GLM implements Required<GlTf> {
	'buffers': BufferM[]

	constructor() {
		this.asset = { version: '2.0' }
		this.scene = 0

		this.extensionsUsed = []
		this.extensionsRequired = []
		this.accessors = []
		this.animations = []
		this.buffers = []
		this.bufferViews = []
		this.cameras = []
		this.images = []
		this.materials = []
		this.meshes = []
		this.nodes = []
		this.samplers = []
		this.scenes = []
		this.skins = []
		this.textures = []
		this.extensions = {}
		this.extras = {}
	}
}

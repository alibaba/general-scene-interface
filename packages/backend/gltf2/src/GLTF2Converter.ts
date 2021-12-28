/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import type {
	MeshDataType,
	MatrBaseDataType,
	AttributeDataType,
	ColorRGB,
	TypedArray,
	LooseMeshDataType,
} from '@gs.i/schema-scene'

import {
	isMatrPbrDataType,
	isMatrUnlitDataType,
	isColorRGB,
	isTypedArray,
	isRenderableMesh,
} from '@gs.i/schema-scene'

import type { Converter } from '@gs.i/schema-converter'
import { Color } from '@gs.i/utils-math'

import { MatProcessor } from '@gs.i/processor-matrix'
import { specifyMesh } from '@gs.i/utils-specify'

import {
	GLTF,
	BufferM,
	GLM,
	ItemSizeToAccessorType,
	GeomModeToMeshPrimitive,
	typedArrayToComponentType,
	stringToArrayBuffer,
	getPaddedBufferSize,
	getPaddedArrayBuffer,

	//
	GLB_HEADER_BYTES,
	GLB_HEADER_MAGIC,
	GLB_VERSION,
	GLB_CHUNK_PREFIX_BYTES,
	GLB_CHUNK_TYPE_JSON,
	GLB_CHUNK_TYPE_BIN,
	//
	attrNameThreeToGltf,
	getMinMax,
} from '@gs.i/utils-gltf2'

/**
 * @note Be careful these values may be share universally if they are reference types
 * @note If you want to use reference types, make sure it's safe
 */
export const DefaultConfig = {
	/**
	 * 是否为 position 生成 accessor.min accessor.max
	 * gltf2 标准中不要求生成 min max 实际渲染中也不经常用到
	 * 但是 有些渲染器（包括 gltf validator）要求 position 必须带 min max
	 */
	genBoundsForPosition: true,
	/**
	 * 是否生成所有 accessor.min accessor.max
	 * gltf2 标准中不要求生成 min max 实际渲染中也不经常用到
	 * 但是 有些渲染器（包括 gltf validator）要求 position 必须带 min max
	 */
	genBoundsForAll: false,

	/**
	 * @note It is safe to use a matrix processor universally
	 */
	matrixProcessor: new MatProcessor(),
	/**
	 *
	 */
	extras: undefined as any,
}

export type ConvConfig = Partial<typeof DefaultConfig>

/**
 * GSI 到 GLTF2 的（runtime）实时转换
 * 按照 GSI 的设计，这里可以进行直接的语义转换
 * @note 一个 gsiMesh 只能被 conv 一次
 * @todo 避免修改原始 gsiMesh
 * @todo texture/sampler
 * @todo 资源去重
 * @todo 线性内存形式
 */
export class GLTF2Convertor implements Converter {
	/**
	 * type
	 */
	readonly type = 'GLTF2'

	_meshesCache = new WeakMap<MeshDataType, number>()
	_materialsCache = new WeakMap<MatrBaseDataType, number>()
	_accessorsCache = new WeakMap<AttributeDataType, number>()
	_nodesCache = new WeakMap<MeshDataType, number>()
	_texturesCache = new WeakMap()

	private config: typeof DefaultConfig

	constructor(config: ConvConfig = {}) {
		this.config = {
			...DefaultConfig,
			...config,
		}
	}

	/**
	 * specify a loose scene graph and convert it
	 * @param root
	 * @returns
	 */
	convertLoose(root: LooseMeshDataType): GLM {
		traverse(root as MeshDataType, (gsiMesh: MeshDataType) => {
			specifyMesh(gsiMesh)
		})

		return this.convert(root as MeshDataType)
	}

	/**
	 * 转换成 gltf2 内存格式
	 */
	convert(root: MeshDataType): GLM {
		// 初始化

		const result = new GLM()
		result.asset = {
			version: '2.0',
			generator: 'GSI-backend-glTF2',
		}

		// extensionsRequired is a subset of extensionsUsed. All values in extensionsRequired must also exist in extensionsUsed.
		result.extensionsUsed = ['KHR_materials_unlit']
		result.extensionsRequired = ['KHR_materials_unlit']

		result.scenes = [
			{
				name: 'sceneWrapper',
				nodes: [0],
			},
		]

		result.extras = {
			...(this.config.extras ?? {}),
		}

		// 用于记录资源编号
		// resource -> index

		this._meshesCache = new WeakMap()
		this._materialsCache = new WeakMap()
		this._accessorsCache = new WeakMap()
		this._nodesCache = new WeakMap()
		this._texturesCache = new WeakMap()

		// 遍历两遍
		// 第一遍生成所有 资源、index
		// 第二遍生成 node 树（添加 children）
		// 之所以要分两遍是因为第一次遍历的时候不知道 children 的 index
		// TODO 通过广度优先来简化成一次
		traverse(root, (gsiMesh: MeshDataType) => {
			const node: GLTF.Node = {
				matrix: this.config.matrixProcessor.getLocalMatrix(gsiMesh),
				// children: [],
			}

			const nodeIndex = result.nodes.length
			this._nodesCache.set(gsiMesh, nodeIndex)
			result.nodes.push(node)

			if (isRenderableMesh(gsiMesh)) {
				const matr = gsiMesh.material
				const geom = gsiMesh.geometry

				/**
				 * 处理 mesh
				 * @note 目前要求 一个 mesh 只包含 一个 primitive
				 */
				const primitive: GLTF.MeshPrimitive = {
					mode: GeomModeToMeshPrimitive[geom.mode],
					attributes: {},
				}

				const mesh: GLTF.Mesh = {
					name: gsiMesh.name,
					primitives: [primitive],
				}

				const meshIndex = result.meshes.length
				result.meshes.push(mesh)
				this._meshesCache.set(gsiMesh, meshIndex)

				node.mesh = meshIndex

				/**
				 * 处理 material 和 texture
				 * @todo texture 暂时不支持
				 */
				if (this._materialsCache.has(matr)) {
					primitive.material = this._materialsCache.get(matr)
				} else {
					let material: GLTF.Material
					if (isMatrPbrDataType(matr)) {
						material = {
							name: matr.name,
							pbrMetallicRoughness: {
								baseColorFactor: [...convColor(matr.baseColorFactor), matr.opacity],
								// baseColorTexture: { index: 1, texCoord: 1, },
								metallicFactor: matr.metallicFactor,
								roughnessFactor: matr.metallicFactor,
							},
							// normalTexture: { index: 1, texCoord: 1, },
							// occlusionTexture: { index: 1, texCoord: 1, },
							// emissiveTexture: { index: 1, texCoord: 1, },
							emissiveFactor: convColor(matr.emissiveFactor),
						}
					} else if (isMatrUnlitDataType(matr)) {
						// https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit
						material = {
							name: matr.name,
							pbrMetallicRoughness: {
								baseColorFactor: [...convColor(matr.baseColorFactor), matr.opacity],
								// baseColorTexture: { index: 1, texCoord: 1, },
								// fallback
								// https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit#extension-compatibility-and-fallback-materials
								roughnessFactor: 0.9,
								metallicFactor: 0.0,
							},
							// normalTexture: { index: 1, texCoord: 1, },
							// occlusionTexture: { index: 1, texCoord: 1, },
							// emissiveTexture: { index: 1, texCoord: 1, },
							// emissiveFactor: convColor(matr.baseColorFactor),
							extensions: { KHR_materials_unlit: {} },
						}
					} else {
						console.warn('遇到GLTF2无法兼容的材质', matr.type, matr)
						return
					}

					if (matr.name) {
						material.name = matr.name
					}
					if (matr.extras) {
						material['extras'] = matr.extras
					}

					const materialIndex = result.materials.length
					result.materials.push(material)
					this._materialsCache.set(matr, materialIndex)
					primitive.material = materialIndex
				}

				/**
				 * 处理 attribute
				 * @note 使用 内存对象 而非 uri 文件
				 * @note 这里不做buffer合并，因此 buffers / bufferViews / accessors 是按顺序一一对应的
				 */

				if (geom.indices) {
					// 复用 attribute
					if (this._accessorsCache.has(geom.indices)) {
						primitive.indices = this._accessorsCache.get(geom.indices)
					} else {
						const accessorIndex = result.accessors.length
						const attributeData = geom.indices

						if (!isTypedArray(attributeData.array)) {
							throw new Error('缺少必要的 attribute.array')
						}

						const typedArray = attributeData.array

						// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#accessor
						result.accessors.push({
							bufferView: accessorIndex,
							// 5120 BYTE 1
							// 5121 UNSIGNED_BYTE 1
							// 5122 SHORT 2
							// 5123 UNSIGNED_SHORT 2
							// 5125 UNSIGNED_INT 4
							// 5126 FLOAT 4
							componentType: typedArrayToComponentType(typedArray),
							count: attributeData.count,
							type: ItemSizeToAccessorType[attributeData.itemSize],

							// optional,
							// but may cause problems for some dumb renderers if empty
							byteOffset: 0,

							...(this.config.genBoundsForAll ? getMinMax(attributeData) : {}),
						})

						// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#bufferview
						result.bufferViews.push({
							buffer: accessorIndex,
							byteLength: typedArray.byteLength,
						})

						// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#buffers-and-buffer-views
						// 注意，这里是内存对象，如果需要传输，需要再加一步生成 gltf2 的 uri
						result.buffers.push({
							data: typedArray,
							byteLength: typedArray.byteLength,
						})

						this._accessorsCache.set(attributeData, accessorIndex)
						primitive.indices = accessorIndex
					}
				}

				for (const name in geom.attributes) {
					const attributeData = geom.attributes[name]
					if (Object.prototype.hasOwnProperty.call(geom.attributes, name) && attributeData) {
						// 复用 attribute
						if (this._accessorsCache.has(attributeData)) {
							const gltfAttrName = attrNameThreeToGltf(name)
							primitive.attributes[gltfAttrName] = this._accessorsCache.get(attributeData) as number
						} else {
							const accessorIndex = result.accessors.length

							if (!isTypedArray(attributeData.array)) {
								throw new Error('缺少必要的 attribute.array :' + name)
							}

							const typedArray = attributeData.array

							// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#accessor
							result.accessors.push({
								bufferView: accessorIndex,
								// 5120 BYTE 1
								// 5121 UNSIGNED_BYTE 1
								// 5122 SHORT 2
								// 5123 UNSIGNED_SHORT 2
								// 5125 UNSIGNED_INT 4
								// 5126 FLOAT 4
								componentType: typedArrayToComponentType(typedArray),
								count: attributeData.count,
								type: ItemSizeToAccessorType[attributeData.itemSize],

								// optional,
								// but may cause problems for some dumb renderers if empty
								byteOffset: 0,
								...(this.config.genBoundsForAll ||
								(this.config.genBoundsForPosition && name === 'position')
									? getMinMax(attributeData)
									: {}),
								// ...getMinMax(attributeData),
							})

							// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#bufferview
							result.bufferViews.push({
								buffer: accessorIndex,
								byteLength: typedArray.byteLength,
							})

							// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#buffers-and-buffer-views
							// 注意，这里是内存对象，如果需要传输，需要再加一步生成 gltf2 的 uri
							result.buffers.push({
								data: typedArray,
								byteLength: typedArray.byteLength,
							})

							this._accessorsCache.set(attributeData, accessorIndex)
							const gltfAttrName = attrNameThreeToGltf(name)
							primitive.attributes[gltfAttrName] = accessorIndex
						}
					}
				}
			}
		})
		traverse(root, (gsiMesh: MeshDataType) => {
			const nodeIndex = this._nodesCache.get(gsiMesh) as number
			const node = result.nodes[nodeIndex]

			// 把children对应的index加到result里
			// todo 浪费很多重复的查表操作
			gsiMesh.children.forEach((child) => {
				const childNodeIndex = this._nodesCache.get(child) as number

				if (node.children) {
					node.children.push(childNodeIndex)
				} else {
					node.children = [childNodeIndex]
				}
				// node.children?.push(childNodeIndex)
			})
		})

		// 必须删除 empty entity，否则 校验失败
		// @link https://github.khronos.org/glTF-Validator/

		Object.keys(result).forEach((key) => {
			if (Array.isArray(result[key]) && result[key].length === 0) {
				delete result[key]
			}
		})

		return result
	}

	dispose() {
		// TODO
	}

	/**
	 *
	 * @param glm 计算 buffer 合并信息，单进行具体的内存操作
	 */
	private _composeBufferInfo(glm: GLM) {
		/**
		 * arraybuffer 的 容量
		 */
		let byteLength = 0

		const typedArrays: TypedArray[] = []
		const byteOffsets: number[] = []

		// 计算 容量 和 bufferView 的 byteOffset
		glm.bufferViews.forEach((bufferView) => {
			const bufferIndex = bufferView.buffer
			const buffer = glm.buffers[bufferIndex]
			const typedArray = buffer.data

			typedArrays.push(typedArray)
			byteOffsets.push(byteLength)

			// TypedArray.byteLength 考虑了 TypedArray 的 offset 和 length，
			// 并不等于 TypedArray.buffer.byteLength
			// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray/byteLength#using_the_bytelength_property
			byteLength += bufferView.byteLength

			// 数据对齐
			// gltf2 要求对齐到 4 byte （放弃了对 int 64 float 64 的支持）
			const padding = byteLength % 4
			byteLength += padding
		})

		return {
			byteLength,
			typedArrays,
			byteOffsets,
		}
	}

	/**
	 * 把 gltf2 内存格式的 buffer 合并成一个内存对象
	 * @todo attribute 公用 buffer 的处理
	 */
	composeBuffer(glm: GLM) {
		const { byteLength, typedArrays, byteOffsets } = this._composeBufferInfo(glm)

		/**
		 * 合成后的 arraybuffer
		 */
		const composedBuffer = new ArrayBuffer(byteLength)
		const composedBufferView = new Uint8Array(composedBuffer)

		// 数据copy

		typedArrays.forEach((typedArray, index) => {
			// 创建等效的 Uint8Array 用于数据copy
			const uint8View = new Uint8Array(
				typedArray.buffer,
				typedArray.byteOffset,
				typedArray.byteLength
			)

			const bufferView = glm.bufferViews[index]
			const byteOffset = byteOffsets[index]

			bufferView.byteOffset = byteOffset
			bufferView.buffer = 0

			composedBufferView.set(uint8View, bufferView.byteOffset)
		})

		/**
		 * 合并后的buffer
		 */
		const buffer: BufferM = {
			data: composedBufferView,
			byteLength: byteLength,
		}

		// 释放掉旧的buffer
		glm.buffers = [buffer]
	}

	/**
	 * 转换成 json 和 bin 分离的 标准 gltf 格式
	 * @todo 可选 base64 把 bin 嵌入 json
	 * @param glm
	 */
	glmToGLTF(glm: GLM): [string, ArrayBuffer] {
		if (glm.buffers.length > 1) {
			this.composeBuffer(glm)
		}

		const bf = glm.buffers[0].data.buffer
		delete (glm as any).buffers[0].data
		glm.buffers[0].uri = 'buf.bin'

		return [JSON.stringify(glm), bf]
	}

	/**
	 * 转换为 GLB 二进制格式
	 * @todo 优化掉重复的内存分配和copy
	 */
	glmToGLB(glm: GLM): ArrayBuffer {
		if (glm.buffers.length > 1) {
			this.composeBuffer(glm)
		}

		const outputBuffer = glm.buffers[0].data.buffer
		delete (glm as any).buffers[0].data

		const outputJSON = JSON.stringify(glm)

		// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#glb-file-format-specification

		// Binary chunk.
		const binaryChunk = getPaddedArrayBuffer(outputBuffer, 0x00)
		const binaryChunkPrefix = new DataView(new ArrayBuffer(GLB_CHUNK_PREFIX_BYTES))
		binaryChunkPrefix.setUint32(0, binaryChunk.byteLength, true)
		binaryChunkPrefix.setUint32(4, GLB_CHUNK_TYPE_BIN, true)

		// JSON chunk.
		const jsonChunk = getPaddedArrayBuffer(stringToArrayBuffer(outputJSON), 0x20)
		const jsonChunkPrefix = new DataView(new ArrayBuffer(GLB_CHUNK_PREFIX_BYTES))
		jsonChunkPrefix.setUint32(0, jsonChunk.byteLength, true)
		jsonChunkPrefix.setUint32(4, GLB_CHUNK_TYPE_JSON, true)

		// GLB header.
		const header = new ArrayBuffer(GLB_HEADER_BYTES)
		const headerView = new DataView(header)
		headerView.setUint32(0, GLB_HEADER_MAGIC, true)
		headerView.setUint32(4, GLB_VERSION, true)
		const totalByteLength =
			GLB_HEADER_BYTES +
			jsonChunkPrefix.byteLength +
			jsonChunk.byteLength +
			binaryChunkPrefix.byteLength +
			binaryChunk.byteLength
		headerView.setUint32(8, totalByteLength, true)

		// compose
		const result = new Uint8Array(totalByteLength)
		result.set(new Uint8Array(header), 0)
		result.set(new Uint8Array(jsonChunkPrefix.buffer), GLB_HEADER_BYTES)
		result.set(new Uint8Array(jsonChunk), GLB_HEADER_BYTES + GLB_CHUNK_PREFIX_BYTES)
		result.set(
			new Uint8Array(binaryChunkPrefix.buffer),
			GLB_HEADER_BYTES + GLB_CHUNK_PREFIX_BYTES + jsonChunk.byteLength
		)
		result.set(
			new Uint8Array(binaryChunk),
			GLB_HEADER_BYTES + GLB_CHUNK_PREFIX_BYTES + jsonChunk.byteLength + GLB_CHUNK_PREFIX_BYTES
		)

		return result
	}

	/**
	 * 转换为 GLB 二进制格式 (加速版本)
	 * one-copy only version
	 */
	glmToGLBTurbo(glm: GLM): ArrayBuffer {
		/**
		 * 思路
		 * 标准要求buffer必须合并成一个
		 * 先计算 所有的 bufferView.byteOffset
		 * 更新 JSON 部分
		 * 最后在写入
		 */

		const bufferInfo = this._composeBufferInfo(glm)

		// 更新 json

		bufferInfo.typedArrays.forEach((typedArray, index) => {
			const bufferView = glm.bufferViews[index]
			const byteOffset = bufferInfo.byteOffsets[index]

			bufferView.byteOffset = byteOffset
			bufferView.buffer = 0
		})
		// 释放 旧的 buffer
		;(glm as any).buffers = [{ byteLength: bufferInfo.byteLength }]

		/**
		 * arraybuffer 的 容量
		 */
		let byteLength = GLB_HEADER_BYTES

		// JSON chunk 长度
		// prefix 长度
		byteLength += GLB_CHUNK_PREFIX_BYTES

		// 正文数据
		const jsonChunkData = stringToArrayBuffer(JSON.stringify(glm))
		// 正文长度
		const jsonChunkLength = getPaddedBufferSize(jsonChunkData.byteLength)

		byteLength += jsonChunkLength

		// binary chunk

		// binary chunk 长度
		// prefix 长度
		byteLength += GLB_CHUNK_PREFIX_BYTES

		byteLength += bufferInfo.byteLength

		/**
		 * 合成后的 arraybuffer
		 */
		const composedBuffer = new ArrayBuffer(byteLength)
		const composedBufferView = new Uint8Array(composedBuffer)

		// 数据写入

		// GLB header.

		const headerView = new DataView(composedBuffer)
		headerView.setUint32(0, GLB_HEADER_MAGIC, true)
		headerView.setUint32(4, GLB_VERSION, true)
		headerView.setUint32(8, byteLength, true)

		// json chunk

		// const jsonChunk = getPaddedArrayBuffer(stringToArrayBuffer(JSON.stringify(glm)), 0x20)
		const jsonChunkPrefix = new DataView(composedBuffer, GLB_HEADER_BYTES)
		jsonChunkPrefix.setUint32(0, jsonChunkLength, true)
		jsonChunkPrefix.setUint32(4, GLB_CHUNK_TYPE_JSON, true)

		const jsonChunkDataStart = GLB_HEADER_BYTES + GLB_CHUNK_PREFIX_BYTES
		const jsonChunkDataEnd = GLB_HEADER_BYTES + GLB_CHUNK_PREFIX_BYTES + jsonChunkLength
		composedBufferView.set(new Uint8Array(jsonChunkData), jsonChunkDataStart)
		for (let i = jsonChunkDataStart + jsonChunkData.byteLength; i < jsonChunkDataEnd; i++) {
			composedBufferView[i] = 0x20
		}

		// binary chunk

		// Binary chunk.
		const binaryChunkPrefix = new DataView(composedBuffer, jsonChunkDataEnd)
		binaryChunkPrefix.setUint32(0, bufferInfo.byteLength, true)
		binaryChunkPrefix.setUint32(4, GLB_CHUNK_TYPE_BIN, true)

		bufferInfo.typedArrays.forEach((typedArray, index) => {
			// 创建等效的 Uint8Array 用于数据copy
			const uint8View = new Uint8Array(
				typedArray.buffer,
				typedArray.byteOffset,
				typedArray.byteLength
			)

			const byteOffset = bufferInfo.byteOffsets[index]

			composedBufferView.set(uint8View, byteOffset + jsonChunkDataEnd + GLB_CHUNK_PREFIX_BYTES)
		})

		return composedBuffer
	}
}

function convColor(gsiColor: ColorRGB | string): number[] {
	if (isColorRGB(gsiColor)) {
		return [gsiColor.r, gsiColor.g, gsiColor.b]
	} else {
		return new Color(gsiColor).toArray()
	}
}

function traverse(mesh: MeshDataType, f: (mesh: MeshDataType) => void) {
	f(mesh)
	if (mesh.children) {
		mesh.children.forEach((child) => {
			traverse(child, f)
		})
	}
}

import { specifyGeometry } from '@gs.i/processor-specify'
/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import * as IR from '@gs.i/schema-scene' // type only, will be deleted after compiled
import { Quaternion } from '@gs.i/utils-math'

import { Specifier } from '@gs.i/processor-specify'

// import * as SDK from '@gs.i/frontend-sdk'

import {
	GLTF,
	BufferM,
	GLM,
	AccessorTypeToItemSize,
	MeshPrimitiveToGeomMode,
	decodeText,
	componentTypeToTypedArray,
	SamplerEnumToString,
	//
	GLB_HEADER_BYTES,
	GLB_HEADER_MAGIC,
	GLB_VERSION,
	GLB_CHUNK_PREFIX_BYTES,
	GLB_CHUNK_TYPE_JSON,
	GLB_CHUNK_TYPE_BIN,
	parseImageFromBufferView,
	attrNameGltfToThree,
} from '@gs.i/utils-gltf2'

/**
 * 数据转换使用
 */
const quaternion = new Quaternion()

/**
 * 接口补全
 * @note this processor only has pure functions
 * 		 it's okay to be put in global scope
 */
const specifier = new Specifier()

export class GLTF2Loader {
	private _meshesCache: IR.LooseMeshDataType[] = []
	private _materialsCache: IR.LooseMatrBase[] = []
	private _accessorsCache: IR.LooseAttribute[] = []
	private _nodesCache: IR.LooseMeshDataType[] = []

	private _texturesCache: IR.LooseTextureType[] = []

	parse(glm: GLM): IR.LooseMeshDataType {
		this._meshesCache = []
		this._materialsCache = []
		this._accessorsCache = []
		this._nodesCache = []

		this._texturesCache = []

		if (glm.buffers.length > 1) {
			throw new Error('暂时只支持 parse GLB （buffer需要合并成一个）')
		}

		const composedBuffer = glm.buffers[0].data.buffer

		// 资源处理

		// texture
		glm.textures?.forEach((texture) => {
			const gsiSampler: IR.LooseSamplerDataType = {}
			if (texture.sampler) {
				const gltfSampler = glm.samplers[texture.sampler]
				gsiSampler.magFilter = SamplerEnumToString[gltfSampler.magFilter || 9728]
				gsiSampler.minFilter = SamplerEnumToString[gltfSampler.minFilter || 9728]
				gsiSampler.wrapS = SamplerEnumToString[gltfSampler.wrapS || 10497]
				gsiSampler.wrapT = SamplerEnumToString[gltfSampler.wrapT || 10497]
			}

			const gsiImage: IR.LooseImageDataType = {}

			if (texture.source !== undefined) {
				const image: GLTF.Image = glm.images[texture.source]

				// NOTE TODO 这里要求必须符合 GLB 嵌入 Image 的规范
				// 暂时不支持 uri 外部 Image

				if (image.uri !== undefined) {
					throw new Error('GLB loader 暂时不支持外部 image uri')
				}
				if (image.bufferView === undefined) {
					throw new Error('GLB loader 需要 bufferView 来读取 image data')
				}
				if (image.mimeType === undefined) {
					throw new Error('GLB loader 需要指定 mimeType 来读取 image data')
				}

				const gltfBufferView = glm.bufferViews[image.bufferView]
				const uintBufferView = new Uint8Array(
					composedBuffer,
					gltfBufferView.byteOffset || 0,
					gltfBufferView.byteLength
				)

				const imageSourceURI = parseImageFromBufferView(image.mimeType, uintBufferView)
				gsiImage.uri = imageSourceURI
			} else {
				throw new Error('texture 缺少 source(image 数据)')
			}

			const gsiTexture: IR.LooseTextureType = {
				image: gsiImage,
				sampler: gsiSampler,
			}

			this._texturesCache.push(gsiTexture)
		})

		// attributes
		glm.accessors.forEach((accessor) => {
			const bufferViewIndex = accessor.bufferView as number
			const bufferView = glm.bufferViews[bufferViewIndex]
			const TypedArrayConstructor = componentTypeToTypedArray(accessor.componentType)

			if (bufferView.byteStride !== undefined) {
				// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
				// > effective stride equals the size of the element
				const effectiveStride =
					TypedArrayConstructor.BYTES_PER_ELEMENT * AccessorTypeToItemSize[accessor.type]

				if (effectiveStride !== bufferView.byteStride) {
					// interleaved
					console.warn('暂时不支持 interleaved/byteStride, 可能出现行为异常')
				}
			}

			const typedArray: IR.TypedArray = new TypedArrayConstructor(
				composedBuffer,
				(bufferView.byteOffset || 0) + (accessor.byteOffset || 0),
				// bufferView.byteLength / TypedArrayConstructor.BYTES_PER_ELEMENT
				AccessorTypeToItemSize[accessor.type] * accessor.count
			)

			const attributeData: IR.LooseAttribute = {
				array: typedArray,
				count: accessor.count,
				itemSize: AccessorTypeToItemSize[accessor.type],
				normalized: false,
				usage: 'STATIC_DRAW',
				version: 0,
			}

			this._accessorsCache.push(attributeData)
		})

		// materials
		glm.materials.forEach((material) => {
			let matr: IR.LooseMatrBase
			// unlit 材质
			// TODO 其他 extension 材质
			if (material.extensions && material.extensions.KHR_materials_unlit) {
				const baseColorFactor = material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1]
				const baseColorTextureIndex = material.pbrMetallicRoughness?.baseColorTexture?.index
				const baseColorTexture =
					baseColorTextureIndex !== undefined
						? this._texturesCache[baseColorTextureIndex]
						: undefined

				if ((material.pbrMetallicRoughness?.baseColorTexture?.texCoord || 0) !== 0) {
					console.warn('baseColorTexture.texCoord 必须为 0 或者 undefined，负责 uv 将会出现异常')
				}

				matr = {
					type: 'unlit',
					baseColorFactor: {
						r: baseColorFactor[0],
						g: baseColorFactor[1],
						b: baseColorFactor[2],
					},
					opacity: baseColorFactor[3],
					baseColorTexture,
				} as IR.LooseMatrUnlitDataType
			} else {
				// PBR 材质
				const baseColorFactor = material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1]
				const emissiveFactor = material.emissiveFactor || [0, 0, 0]
				const roughnessFactor = material.pbrMetallicRoughness?.roughnessFactor || 0.5
				const metallicFactor = material.pbrMetallicRoughness?.metallicFactor || 0.5

				const baseColorTextureIndex = material.pbrMetallicRoughness?.baseColorTexture?.index
				const baseColorTexture =
					baseColorTextureIndex !== undefined
						? this._texturesCache[baseColorTextureIndex]
						: undefined
				if ((material.pbrMetallicRoughness?.baseColorTexture?.texCoord || 0) !== 0) {
					console.warn('baseColorTexture.texCoord 必须为 0 或者 undefined，负责 uv 将会出现异常')
				}

				const metallicRoughnessTextureIndex =
					material.pbrMetallicRoughness?.metallicRoughnessTexture?.index
				const metallicRoughnessTexture =
					metallicRoughnessTextureIndex !== undefined
						? this._texturesCache[metallicRoughnessTextureIndex]
						: undefined
				if ((material.pbrMetallicRoughness?.metallicRoughnessTexture?.texCoord || 0) !== 0) {
					console.warn(
						'metallicRoughnessTexture.texCoord 必须为 0 或者 undefined，负责 uv 将会出现异常'
					)
				}

				const normalTextureIndex = material.normalTexture?.index
				const normalTexture =
					normalTextureIndex !== undefined ? this._texturesCache[normalTextureIndex] : undefined
				if ((material.normalTexture?.texCoord || 0) !== 0) {
					console.warn('normalTexture.texCoord 必须为 0 或者 undefined，负责 uv 将会出现异常')
				}

				const emissiveTextureIndex = material.emissiveTexture?.index
				const emissiveTexture =
					emissiveTextureIndex !== undefined ? this._texturesCache[emissiveTextureIndex] : undefined
				if ((material.emissiveTexture?.texCoord || 0) !== 0) {
					console.warn('emissiveTexture.texCoord 必须为 0 或者 undefined，负责 uv 将会出现异常')
				}

				const occlusionTextureIndex = material.occlusionTexture?.index
				const occlusionTexture =
					occlusionTextureIndex !== undefined
						? this._texturesCache[occlusionTextureIndex]
						: undefined
				if (occlusionTexture && material.occlusionTexture?.texCoord !== 1) {
					console.warn('occlusionTexture.texCoord 必须为 1, uv 将会出现异常')
				}

				matr = {
					type: 'pbr',
					baseColorFactor: {
						r: baseColorFactor[0],
						g: baseColorFactor[1],
						b: baseColorFactor[2],
					},
					opacity: baseColorFactor[3],
					emissiveFactor: {
						r: emissiveFactor[0],
						g: emissiveFactor[1],
						b: emissiveFactor[2],
					},
					metallicFactor,
					roughnessFactor,

					baseColorTexture,
					metallicRoughnessTexture,
					normalTexture,
					emissiveTexture,
					occlusionTexture,
				} as IR.LooseMatrPbrDataType
			}

			if (material.name) {
				matr.name = material.name
			}
			if (material.extras) {
				matr['extras'] = material.extras
			}

			this._materialsCache.push(matr)
		})

		// mesh/group
		//第一遍，创建所有 gsiMesh
		glm.nodes.forEach((node) => {
			const gsiMesh: IR.LooseMeshDataType = {
				children: new Set(),
			}

			/**
			 * 矩阵
			 * 人可读的是 row-major order
			 * SDK.Matrix(three.matrix) .set 接受的 是 row-major order
			 * webgl 要求的是 column-major order
			 * glsl matrix 是 column-major order
			 * SDK.Matrix(three.matrix) 内部计算和 element 存储的是 column-major order
			 * SDK.Matrix(three.matrix) .fromArray 接受的是 column-major order
			 */

			// gltf2 可以 使用 matrix 或者 可选的 translation/rotation/scale
			if (node.matrix) {
				gsiMesh.transform = { matrix: node.matrix, version: 0 }
			} else {
				gsiMesh.transform = {
					version: 0,
				}
				if (node.translation)
					gsiMesh.transform.position = {
						x: node.translation[0],
						y: node.translation[1],
						z: node.translation[2],
					}
				// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#node
				// xyzw
				if (node.rotation)
					gsiMesh.transform.quaternion = {
						x: node.rotation[0],
						y: node.rotation[1],
						z: node.rotation[2],
						w: node.rotation[3],
					}
				if (node.scale)
					gsiMesh.transform.scale = {
						x: node.scale[0],
						y: node.scale[1],
						z: node.scale[2],
					}
			}

			if (node.mesh !== undefined) {
				// 这是个 GSI mesh

				const gsiRenderableMesh = gsiMesh as IR.LooseRenderableMesh

				const mesh = glm.meshes[node.mesh]
				const primitive = mesh.primitives[0]

				gsiRenderableMesh.geometry = specifyGeometry({ attributes: {} })
				gsiRenderableMesh.geometry.mode = MeshPrimitiveToGeomMode[primitive.mode as number]

				if (primitive.indices !== undefined) {
					gsiRenderableMesh.geometry.indices = this._accessorsCache[primitive.indices]
				}

				for (const name in primitive.attributes) {
					if (Object.prototype.hasOwnProperty.call(primitive.attributes, name)) {
						/**
						 * gltf2 对 attributes name 有规定，可以这里不做转换，交给 backend 去实现
						 * https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes
						 * POSITION NORMAL TANGENT TEXCOORD_0 TEXCOORD_1 COLOR_0
						 *
						 * 也可以在这里转换成 three 的 flavor
						 * position normal uv uv2 color
						 *
						 * three 内置材质不允许 自定义 uv 指向
						 * color normal 这些必须用 uv
						 * ao light 这些必须用 uv2
						 * 可以通过修改 three pbr 材质
						 * 这里暂时不支持与 three 不同的指向
						 *
						 * @note 暂时转成 three 的 flavor
						 * @note 暂时不允许指定 texCoord，如果和 three 不符，直接warning
						 */

						// gsiMesh.geometry.attributes[name.toLowerCase()] = this._accessorsCache[
						// gsiMesh.geometry.attributes[name] = this._accessorsCache[primitive.attributes[name]]

						const threeAttrName = attrNameGltfToThree(name)
						gsiRenderableMesh.geometry.attributes[threeAttrName] =
							this._accessorsCache[primitive.attributes[name]]
					}
				}

				if (primitive.material !== undefined) {
					gsiRenderableMesh.material = this._materialsCache[primitive.material]
				} else {
					// gltf2: 如果没有分配，则使用 默认 material
					// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#default-material
					gsiRenderableMesh.material = { type: 'unlit' } as IR.LooseMatrUnlitDataType
				}
			}

			// 否则就是个普通的 group

			this._meshesCache.push(gsiMesh)
		})

		// 第二遍，建树
		glm.nodes.forEach((node, nodeIndex) => {
			const gsiMesh = this._meshesCache[nodeIndex]

			if (node.children && node.children.length) {
				node.children.forEach((childNodeIndex) => {
					const child = this._meshesCache[childNodeIndex]

					;(gsiMesh.children as Set<IR.LooseMeshDataType>).add(child)
					// child.parent = gsiMesh // will be done by specifier
				})
			}
		})

		const result = { children: new Set() } as IR.LooseNode
		glm.scenes[0].nodes?.forEach((nodeIndex) => {
			const mesh = this._meshesCache[nodeIndex]

			;(result.children as Set<IR.LooseMeshDataType>).add(mesh)
		})

		return result
	}

	glbToGLM(glb: ArrayBuffer): GLM {
		// @note _下划线开头的，可以用于交验 和 常量是否一致，如果不一致说明版本不支持

		const composedBuffer = glb
		const composedBufferView = new Uint8Array(composedBuffer)

		// decode header

		const headerView = new DataView(composedBuffer)
		const _GLB_HEADER_MAGIC = headerView.getUint32(0, true)
		const _GLB_VERSION = headerView.getUint32(4, true)
		const byteLength = headerView.getUint32(8, true)

		// decode json chunk
		const jsonChunkPrefix = new DataView(composedBuffer, GLB_HEADER_BYTES)
		const jsonChunkLength = jsonChunkPrefix.getUint32(0, true)
		const _GLB_CHUNK_TYPE_JSON = jsonChunkPrefix.getUint32(4, true)

		const jsonChunkDataStart = GLB_HEADER_BYTES + GLB_CHUNK_PREFIX_BYTES
		const jsonChunkDataEnd = GLB_HEADER_BYTES + GLB_CHUNK_PREFIX_BYTES + jsonChunkLength

		// 这里可以查找尾部的 0x20 来确定json内容的长度，但是 0x20 是空格，应该不影响 json 的 parse

		const jsonChunkDataView = new Uint8Array(composedBuffer, jsonChunkDataStart, jsonChunkLength)
		const jsonString = decodeText(jsonChunkDataView)
		const glm: GLM = JSON.parse(jsonString)

		// decode binary chunk

		const binaryChunkPrefix = new DataView(composedBuffer, jsonChunkDataEnd)
		const bufferInfo_byteLength = binaryChunkPrefix.getUint32(0, true)
		const _GLB_CHUNK_TYPE_BIN = binaryChunkPrefix.getUint32(4, true)

		// 直接把 buffer 指向 整个 composedBuffer，
		// 并把所有的 bufferView 加上 offset，
		// 来避免所有的内存拷贝
		// zero-copy mapping

		glm.buffers[0].byteLength = byteLength
		glm.buffers[0].data = composedBufferView
		glm.bufferViews.forEach((bufferView) => {
			;(bufferView.byteOffset as number) += jsonChunkDataEnd + GLB_CHUNK_PREFIX_BYTES
		})

		return glm
	}
}

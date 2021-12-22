/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { UpdateRanges, TypedArray, BBox, BSphere, DISPOSED, Versioned, Int } from './basic'

/**
 * geometry data
 * @todo morph
 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#primitive}
 */
export interface GeomDataType {
	/**
	 * - const GLenum POINTS                         = 0x0000;
	 * - const GLenum LINES                          = 0x0001;
	 * - const GLenum LINE_LOOP                      = 0x0002;
	 * - const GLenum LINE_STRIP                     = 0x0003;
	 * - const GLenum TRIANGLES                      = 0x0004;
	 * - const GLenum TRIANGLE_STRIP                 = 0x0005;
	 * - const GLenum TRIANGLE_FAN                   = 0x0006;
	 * @default TRIANGLES
	 */
	mode: 'TRIANGLES' | 'LINES' | 'POINTS' | 'SPRITE'

	/**
	 * attributes data
	 */
	attributes: {
		/**
		 * @important
		 *
		 * 标准PBR材质需要的标准Attributes
		 * glTF2有严格的规定 {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes}
		 * Babylon 和 unity3D 相似，单命名规则不同
		 * three 中只对 position 有要求，其他都由材质定义
		 * 数据可视化引擎 不应该做这种要求
		 * 但是 需要配合 pbr material，这里必须做规范
		 *
		 * three 内置材质不允许 自定义 uv 指向
		 * color normal 这些必须用 uv
		 * ao light 这些必须用 uv2
		 *
		 * gltf2 则允许自定义 每个 texture 的 texCoord 选择
		 *
		 * @todo 这个是 three 的 flavor，要不要作为 GSI 的 flavor，还是用 GLTF2 的
		 *
		 * three.js PBR
		 * - position
		 * - normal
		 * - color
		 * - uv
		 * - uv2
		 *
		 * gltf2 PBR
		 * {@link https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes}
		 * - POSITION
		 * - NORMAL
		 * - COLOR_0
		 * - TANGENT
		 * - TEXCOORD_0
		 * - TEXCOORD_1
		 *
		 * babylon.js PBR
		 * {@link https://github.com/BabylonJS/Babylon.js/blob/2eeb0ce1918fff3f98c1bd10ac943d26384cc181/dist/previous%20releases/babylon.2.1.d.ts#L4148}
		 * - positions
		 * - normals
		 * - colors
		 * - uvs
		 * - uv2s
		 *
		 * unity3d PBR
		 * {@link https://docs.unity3d.com/2020.2/Documentation/ScriptReference/Mesh.html}
		 * - vertices
		 * - normals
		 * - colors
		 * - uv
		 * - uv2~8
		 */

		// position?: AttributeDataType
		// normal?: AttributeDataType
		// uv?: AttributeDataType
		// uv2?: AttributeDataType
		// color?: AttributeDataType

		// 自定义材质
		[name: string]: AttributeDataType
	}

	/**
	 * 索引
	 */
	indices?: AttributeDataType

	extensions?: {
		/**
		 * User specified bounding for this geometry.
		 * - Not necessary because static geometry bounds are calculated when used.
		 * - Only use this if the geometry is dynamic or should have padding when culling.
		 */
		EXT_geometry_bounds?: {
			/**
			 * axes align bounding box
			 * with min-vec3 and max-vec3
			 */
			box?: BBox
			sphere?: BSphere
		}

		/**
		 * draw range of indexed geometry
		 */
		EXT_geometry_range?: {
			/**
			 * 绘制区域（索引）
			 */
			drawRange?: { start: Int; count: Int }
		}

		/**
		 * instanced geometry
		 * @TODO
		 */
		EXT_geometry_instance?: {}

		[key: string]: any
	}
	extras?: any
}

/**
 * attribute 数据
 * @todo gltf offset
 * @todo stride (interpolation)
 * @todo instanced
 */
export interface AttributeDataType extends Versioned {
	/**
	 * attribute name
	 */
	// readonly name: string

	/**
	 * 数据
	 * @note 用户可以直接修改这个值的引用，注意校验和旧引用的回收
	 */
	array: TypedArray | DISPOSED

	/**
	 * attribute vector size
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer}
	 */
	itemSize: 1 | 2 | 3 | 4

	/**
	 * array.length / itemSize
	 * TODO delete it
	 * @deprecated
	 */
	count: number

	/**
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer}
	 */
	normalized: boolean

	/**
	 * buffer是否需要动态更新（动态更新的buffer长度不可变）
	 * - 如果需要原地更新，则 DYNAMIC_DRAW
	 * - 如果上传一次则不再更新，或者更新需要重新上传一个新的buffer，则 STATIC_DRAW
	 * {@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData}
	 */
	usage: 'STATIC_DRAW' | 'DYNAMIC_DRAW' // Usage

	/**
	 * 已经提交的数据版本
	 * @todo 不要暴露在interface里，应该记录在 conv 内部
	 * @note 保留该属性，外部使用者可据此判断update提交何时成功
	 * @delete 外部使用者 不应该从 scene graph 上读取值来判断时机
	 */
	// committedVersion: number

	/**
	 * 一次性数据（用完丢弃）
	 * - 用于提示conv和renderer，数据是否需要在ram中保留，还是说上传vram之后应该从ram回收
	 * @note 该值可以 runtime 修改，false -> true, 则在下次判断版本后执行回收，true -> false 则不再执行回收逻辑
	 * @note @todo usage = DYNAMIC_DRAW 时，该值无效？ 始终不主动回收？
	 */
	disposable: boolean

	extensions?: {
		EXT_buffer_partial_update?: {
			/**
			 * 脏区域
			 * @QianXun 保留数组形式，在convert时将多个ranges merge成一个
			 */
			updateRanges?: UpdateRanges
		}
	}
}

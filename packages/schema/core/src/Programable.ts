/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { ColorRGB, Vec2, Vec3, Vec4 } from './basic'
import { CubeTextureType, TextureType } from './Texture'

/**
 * ### 可编程材质接口
 * 作为通用材质的可编程插槽接口定义,
 * 提供插槽，在不需要重写材质或者copy代码的情况下扩展材质行为.
 *
 * 插槽编程是为了避免：
 * - 自定义材质无法在不同底层引擎中通用（不同引擎的材质代码结构完全不同）
 * - 自定义材质无法随引擎和底层库升级（three版本一直无法升级的原因之一）
 *
 * 原则是：
 * - 不干涉引擎内置的光照过程
 *
 * 定位类似于 unity3D 的 shader language,
 * 基于 glsl 和 three 作出简化
 */
export interface Programable {
	/**
	 * @section ShaderLanguage版本
	 */

	/**
	 * language type
	 * @default GLSL300
	 */
	language: 'GLSL100' | 'GLSL300' | 'WLSL'

	/**
	 * @section pre processors
	 */

	/**
	 * extension declarations
	 * @default ''
	 */
	extension: string

	/**
	 * @glsl #define name value
	 * @default {}
	 */
	defines: { [name: string]: string | boolean | number | undefined }

	/**
	 * @section  数据输入
	 */

	/**
	 * uniform inputs
	 * @glsl uniform TYPE name;
	 * @default {}
	 */
	uniforms: { [name: string]: UniformDataType | undefined }

	/**
	 * whether this material modifies geometry data in shaders, if true, should not do raycasting in CPU side.
	 * @default false
	 * @note enable this in these circumstances:
	 * - vertex positions of this object is modified in shader
	 * - visibility of this object is modified in shader
	 * - you have a better method to pick this material than standard raycasting
	 */
	vertexModified?: boolean

	/**
	 * attributes declaration
	 * @glsl attribute TYPE name;
	 */
	// attributes: { [name: string]: ShaderType }

	/**
	 * varying declaration
	 * @glsl varying TYPE name;
	 */
	// varyings: { [name: string]: ShaderType }

	/**
	 * global scope shader codes (out side of main function)
	 * - for vert and frag shaders
	 * - usually for global functions or static values.
	 */
	global?: string

	/**
	 * @section vertex shader 通用代码
	 */

	/**
	 * global scope shader codes (out side of main function)
	 * - for vertex shader
	 * - usually for global functions or static values.
	 */
	vertGlobal?: string

	/**
	 * 在vertex shader中可以（并且只能）在此处对 position/normal/uv 进行修改
	 * @param vec3 position - [modifiable]
	 * @param vec3 normal - [modifiable]
	 * @param vec2 uv - [modifiable] If no uv attribute provided, the value will be [0, 0]
	 * @param mat4 modelMatrix - [readonly]: The mesh's modelMatrix
	 * @param mat4 modelViewMatrix - [readonly]: Equals to viewMatrix * modelMatrix
	 * @param mat4 projectionMatrix - [readonly]
	 * @param mat3 normalMatrix - [readonly]: Equals to inverse transpose of modelViewMatrix
	 */
	vertGeometry?: string

	/**
	 * vertex shader的最终输出结果阶段，输出 varyings，并可以对gl_Position做最终修改
	 *
	 * Output stage of vertex shader. glPosition are given and modifiable.
	 *
	 * @param vec3 modelViewPosition - [readonly]
	 * @param mat4 modelViewMatrix - [readonly]
	 * @param mat4 projectionMatrix - [readonly]
	 * @param vec4 glPosition - [modifiable]
	 * @context all global variables including varyings, uniforms, attributes, etc
	 */
	vertOutput?: string

	/**
	 * @section fragment shader 通用代码
	 */
	/**
	 * fragment shader main 函数前 插入的 glsl 代码
	 * - for fragment shader
	 * - 用于声明或实现全局变量、全局函数
	 */
	fragGlobal?: string

	/**
	 * 在fragment shader阶段对fragColor颜色做最终的修改
	 * @param vec4 fragColor
	 */
	fragOutput?: string

	/**
	 * @section 管线相关的插槽
	 * 交给每个特定材质去实现
	 */
}

export interface ProgramablePbr {
	/**
	 * @section Custom Shader
	 * 理论上，对所有 PBR 的输入参数进行 编程控制
	 * 就可以实现所有 PBR 场景中需要的渲染效果
	 * 而不应该对渲染管线本身做修改（这样的修改都是不可跨引擎、跨版本使用的）
	 */
	/**
	 * 在内置PBR材质渲染流程前对材质参数 diffuse emissive metalness roughness 进行最后修改
	 * @param vec4 diffuse 漫反射颜色
	 * @param vec3 emissive 自发光色
	 * @param float metalness 金属度
	 * @param float roughness 粗糙度
	 */
	fragPreLighting?: string

	/**
	 * fragment shader main 函数中 光照计算之前
	 * 在此处插入代码可对 modelViewPosition 和 normal 进行修改，注意：normal在输出前需经过归一化
	 * @param vec3 modelViewPosition 模型和视图变换后的空间位置
	 * @param vec3 normal 法向量
	 */
	fragGeometry?: string
}

/**
 * @example vec2 vec3 float sampler2D ...
 */
export type ShaderType = string

export type UniformDataType = {
	/**
	 * 数值、对象或Texture
	 * 增加了数组对象
	 */
	value: number | Vec2 | Vec3 | Vec4 | ColorRGB | TextureType | CubeTextureType | number[]
}

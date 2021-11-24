/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { UniformDataType, ShaderType } from './basic'

/**
 * 可编程材质 - PrgBaseDataType
 * 作为通用材质的可编程插槽接口定义
 * 提供插槽，在不需要重写材质或者copy代码的情况下扩展材质行为
 * 插槽编程是为了避免：
 * - 自定义材质无法在不同底层引擎中通用（不同引擎的材质代码结构完全不同）
 * - 自定义材质无法随引擎和底层库升级（three版本一直无法升级的原因之一）
 * 原则是：
 * - 不干涉引擎内置的光照过程
 *
 * 定位类似于 unity3D 的 shader language
 * 基于 glsl 和 three 作出简化
 */
export interface PrgBaseDataType {
	/**
	 * @section ShaderLanguage版本
	 */
	language?: 'GLSL100' | 'GLSL300' | 'WLSL'

	/**
	 * @section 预处理环节
	 */
	/**
	 * 预处理标示
	 * @glsl #define name value
	 */
	defines?: { [name: string]: string | boolean | number | undefined }

	/**
	 * 首行定义，通常用来声明 插件 或者 glsl 版本
	 */
	extension?: string

	/**
	 * @section  数据输入
	 */
	/**
	 * 输入变量，全局变量，每帧自动传入
	 * @glsl uniform TYPE name;
	 */
	uniforms?: { [name: string]: UniformDataType }

	/**
	 * 输入变量，每个顶点传入，这里定义的变量可以被后端glsl300 to 100进行版本转换
	 * @glsl attribute TYPE name;
	 */
	attributes?: { [name: string]: ShaderType }

	/**
	 * 差值变量，vertex shader 输出，fragment shader 输入
	 * 这里定义的变量可以被后端glsl300to100进行版本转换
	 * 如果按照glsl300标准写，前面不需要加in/out，例如：vec2 vUv;
	 * @glsl varying TYPE name;
	 */
	varyings?: { [name: string]: ShaderType }

	/**
	 * @section vertex shader 通用代码
	 */
	/**
	 * vertex shader main 函数前 插入的 glsl 代码
	 * 用于声明或实现全局变量(uniforms)、全局函数
	 */
	preVert?: string

	/**
	 * 在vertex shader中可以（并且只能）在此处对 position/normal/uv 进行修改
	 * @param vec3 position - [modifiable]
	 * @param vec3 normal - [modifiable]
	 * @param vec2 uv - [modifiable] 如果未使用贴图则uv为(0, 0)
	 * @param mat4 modelMatrix - [readonly]: The mesh's modelMatrix
	 * @param mat4 modelViewMatrix - [readonly]: Equals to viewMatrix * modelMatrix
	 * @param mat4 projectionMatrix - [readonly]
	 * @param mat3 normalMatrix - [readonly]: Equals to inverse transpose of modelViewMatrix
	 */
	vertGeometry?: string

	/**
	 * vertex shader的最终输出结果阶段，可以对gl_Position做最终修改
	 * 若在此处修改了 glPosition (注意没有下划线)，渲染管线会在后续直接使用此处的输出结果
	 * @param vec3 modelViewPosition - [modifiable]
	 * @param mat4 modelViewMatrix - [readonly]
	 * @param mat4 projectionMatrix - [readonly]
	 * @param vec4 glPosition - [modifiable]
	 */
	vertOutput?: string

	/**
	 * vertex shader main 函数 结束前插入的 glsl 代码
	 * 用户在返回前对输出值做最后的修改
	 * @deprecated
	 */
	postVert?: string

	/**
	 * @section fragment shader 通用代码
	 */
	/**
	 * fragment shader main 函数前 插入的 glsl 代码
	 * 用于声明或实现全局变量、全局函数
	 */
	preFrag?: string

	/**
	 * @delete
	 * fragment shader main 函数开始时插入的 glsl代码
	 * 可以进行一些预计算，只能获取到从varying uniforms变量
	 */
	// fragBegin?: string

	/**
	 * @delete
	 * fragment shader main 函数 结束前插入的 glsl 代码
	 * 用户在返回前对输出值做最后的修改
	 */
	// postFrag?: string

	/**
	 * @section 管线相关的插槽
	 * 交给每个特定材质去实现
	 */
}

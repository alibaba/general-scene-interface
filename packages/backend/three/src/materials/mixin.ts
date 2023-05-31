/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 *
 * @description
 *
 * three 判断 material 是否为 shader material 的机制是：
 * - material.type 不属于内置 matr 的 type
 * - 同时 !isRawShaderMaterial
 * 如果判断为 shader material，则会用 custom shader 创建 program。并用 material.uniforms 作为 uniforms.
 *
 * custom defines 没有区别对待，所有 material 都可以拥有 material.defines。
 *
 * 内置 material 的 uniforms 和 defines 的更新，则使用 material.isMeshStandardMaterial 来判断。
 *
 * 这种机制下，可以让一个 material 即可以自定义shader，又可以想内置 material 一样自动更新材质、灯光等属性：
 *
 * - 给 内置 Material 加上 ShaderMaterial 的默认属性
 * - type 换成 three 不能识别的
 * - 加上 内置Material 的 uniforms （因为 shader material 默认不会获得内置 material 的 uniform ）
 *
 */

import { Material, UniformsUtils } from 'three'
import type IR from '@gs.i/schema-scene'

export function Shaderlize<TBase extends new (...args: any[]) => Material>(
	ThreeMaterial: TBase,
	vs: string,
	fs: string
) {
	return class ShaderMaterial extends ThreeMaterial {
		/**
		 * SHADER_NAME
		 */
		type = 'GSI-Material'

		/**
		 * Add ShaderMaterial flag
		 */
		readonly isShaderMaterial = true

		/**
		 * from THREE.ShaderMaterial
		 */

		defines = {} as { [name: string]: string | boolean | number | undefined }
		uniforms = {} as { [name: string]: { value: any } }
		uniformsGroups = [] as any[]

		vertexShader = '' as string
		fragmentShader = '' as string

		linewidth = 1

		wireframe = false
		wireframeLinewidth = 1

		fog = false // set to use scene fog
		clipping = false // set to use user-defined clipping planes

		/**
		 * @note change it to true if needs lights info in shaders
		 */
		lights = false // set to use scene lights

		extensions = {
			derivatives: false, // set to use derivatives
			fragDepth: false, // set to use fragment depth values
			drawBuffers: false, // set to use draw buffers
			shaderTextureLOD: false, // set to use shader texture LOD
		}

		/**
		 * @note three r139 seems removed `position` and `uv2`
		 */
		// When rendered geometry doesn't include these attributes but the material does,
		// use these default values in WebGL. This avoids errors when buffer data is missing.
		defaultAttributeValues = {
			position: [0, 0, 0],
			normal: [0, 0, 0],
			color: [1, 1, 1],
			uv: [0, 0],
			uv1: [0, 0],
		}

		index0AttributeName = undefined
		uniformsNeedUpdate = false

		glslVersion = null

		/**
		 * call this after construction or Programable changed
		 */
		updateProgramable(gsiMatr: IR.Material) {
			const programable: IR.Programable =
				gsiMatr.extensions?.EXT_matr_programmable || ({} as IR.Programable)

			const programablePbr: IR.ProgramablePbr = gsiMatr.extensions?.EXT_matr_programmable_pbr || {}
			const programablePoint = gsiMatr.extensions?.EXT_matr_programmable_point || {}

			// language check

			if (!programable.language) {
				programable.language = 'GLSL300'
			} else if (programable.language !== 'GLSL100' && programable.language !== 'GLSL300') {
				throw new Error(
					`GSI::Matr.programable.language type '${programable.language}' is not supported`
				)
			}

			// programable slots

			this.vertexShader = vs
				.replace(RE.Global, programable.global || '')
				.replace(RE.VertGlobal, programable.vertGlobal || '')
				.replace(RE.VertGeometry, programable.vertGeometry || '')
				.replace(RE.VertOutput, programable.vertOutput || '')
				.replace(RE.VertPointSize, programablePoint.vertPointGeometry || '')

			this.fragmentShader = fs
				.replace(RE.Global, programable.global || '')
				.replace(RE.FragGlobal, programable.fragGlobal || '')
				.replace(RE.FragOutput, programable.fragOutput || '')
				.replace(RE.FragPreLighting, programablePbr.fragPreLighting || '')
				.replace(RE.FragGeometry, programablePbr.fragGeometry || '')
		}

		copy(source): this {
			super.copy(source)

			this.fragmentShader = source.fragmentShader
			this.vertexShader = source.vertexShader

			this.uniforms = UniformsUtils.clone(source.uniforms)

			this.defines = Object.assign({}, source.defines)

			this.wireframe = source.wireframe
			this.wireframeLinewidth = source.wireframeLinewidth

			this.lights = source.lights
			this.clipping = source.clipping

			this.extensions = Object.assign({}, source.extensions)

			this.glslVersion = source.glslVersion

			return this
		}
	}
}
const RE = {
	// #pragma GSI_INSERT_Global
	Global: /^[ \t]*#pragma GSI_INSERT_Global/gm,

	// #pragma GSI_INSERT_VertGlobal
	VertGlobal: /^[ \t]*#pragma GSI_INSERT_VertGlobal/gm,
	// #pragma GSI_INSERT_VertGeometry
	VertGeometry: /^[ \t]*#pragma GSI_INSERT_VertGeometry/gm,
	// #pragma GSI_INSERT_VertOutput
	VertOutput: /^[ \t]*#pragma GSI_INSERT_VertOutput/gm,
	// #pragma GSI_INSERT_VertPointSize
	VertPointSize: /^[ \t]*#pragma GSI_INSERT_VertPointSize/gm,

	// #pragma GSI_INSERT_FragGlobal
	FragGlobal: /^[ \t]*#pragma GSI_INSERT_FragGlobal/gm,
	// #pragma GSI_INSERT_FragOutput
	FragOutput: /^[ \t]*#pragma GSI_INSERT_FragOutput/gm,
	// #pragma GSI_INSERT_FragPreLighting
	FragPreLighting: /^[ \t]*#pragma GSI_INSERT_FragPreLighting/gm,
	// #pragma GSI_INSERT_FragGeometry
	FragGeometry: /^[ \t]*#pragma GSI_INSERT_FragGeometry/gm,
}

// eslint-disable-next-line @typescript-eslint/ban-types
// type Constructor = new (...args: any[]) => {}
// eslint-disable-next-line @typescript-eslint/ban-types
// type GConstructor<T = {}> = new (...args: ConstructorParameters<T>) => T
// type GConstructor<T = {}> = new (...args: any[]) => T

// type MaterialLike = GConstructor<Material>
// type MaterialLike = new (...args: ConstructorParameters<Material>) => Material

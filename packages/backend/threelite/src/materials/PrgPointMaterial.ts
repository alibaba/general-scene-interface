/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { PointsMaterial, UniformsUtils, ShaderLib } from 'three-lite'
import IR, { Programable } from '@gs.i/schema-scene'
// import { genPreShaderCode } from './utils'
import vs from './PrgPointMatr.vs.glsl'
import fs from './PrgPointMatr.fs.glsl'

export class PrgPointMaterial extends PointsMaterial {
	type = 'GSI-PointsMaterial'

	// Add ShaderMaterial flag
	isShaderMaterial = true

	defines: { [name: string]: any } = {}
	uniforms: { [name: string]: any } = UniformsUtils.clone(ShaderLib.points.uniforms)

	vertexShader = ''
	fragmentShader = ''

	linewidth = 1

	wireframe = false
	wireframeLinewidth = 1

	fog = false // set to use scene fog
	lights = false // set to use scene lights
	clipping = false // set to use user-defined clipping planes

	skinning = false // set to use skinning attribute streams
	morphTargets = false // set to use morph targets
	morphNormals = false // set to use morph normals

	extensions = {
		derivatives: true, // set to use derivatives
		fragDepth: true, // set to use fragment depth values
		drawBuffers: true, // set to use draw buffers
		shaderTextureLOD: true, // set to use shader texture LOD
	}

	// When rendered geometry doesn't include these attributes but the material does,
	// use these default values in WebGL. This avoids errors when buffer data is missing.
	defaultAttributeValues = {
		position: [0, 0, 0],
		normal: [0, 0, 0],
		color: [1, 1, 1],
		uv: [0, 0],
		uv2: [0, 0],
	}

	index0AttributeName = undefined
	uniformsNeedUpdate = false

	glslVersion = null

	constructor(gsiMatr: IR.PointMaterial) {
		super()
		// this.setValues(gsiMatr as any) // Set parent class parameters

		const programable: Programable =
			gsiMatr.extensions?.EXT_matr_programmable || ({} as Programable)
		const programablePoint: any = gsiMatr.extensions?.EXT_matr_programmable_point || {}

		if (!programable.language) {
			programable.language = 'GLSL300'
		} else if (programable.language !== 'GLSL100' && programable.language !== 'GLSL300') {
			throw new Error(
				`GSI::Matr.programable.language type '${programable.language}' is not supported`
			)
		}

		// Set shader codes
		// const preCodes = genPreShaderCode(gsiMatr)
		const preCodes = {} as any

		this.vertexShader = vs
			.replace(/\$\$GSI_INSERT<Attributes>/g, preCodes.attributes || '') // remove
			.replace(/\$\$GSI_INSERT<Varyings>/g, preCodes.varyingsVert || '') // remove
			.replace(/\$\$GSI_INSERT<Uniforms>/g, preCodes.uniforms || '') // remove
			.replace(
				/\$\$GSI_INSERT<PreVert>/g,
				(programable.global || '') + '\n' + (programable.vertGlobal || '')
			)
			.replace(/\$\$GSI_INSERT<VertGeometry>/g, programable.vertGeometry || '')
			.replace(/\$\$GSI_INSERT<VertOutput>/g, programable.vertOutput || '')
			.replace(/\$\$GSI_INSERT<VertPointSize>/g, programablePoint.vertPointGeometry || '')
			.replace(/\$\$GSI_INSERT<PostVert>/g, /* programable.postVert || */ '') // remove

		this.fragmentShader = fs
			.replace(/\$\$GSI_INSERT<Varyings>/g, preCodes.varyingsFrag || '') // remove
			.replace(/\$\$GSI_INSERT<Uniforms>/g, preCodes.uniforms || '') // remove
			.replace(
				/\$\$GSI_INSERT<PreFrag>/g,
				(programable.global || '') + '\n' + (programable.fragGlobal || '')
			)
			.replace(/\$\$GSI_INSERT<FragColor>/g, programable.fragOutput || '')

		// this.onBeforeCompile = (shader) => {
		// 	shader['extensionDerivatives'] = true
		// 	shader['extensionShaderTextureLOD'] = true
		// }
	}

	copy(source) {
		PointsMaterial.prototype.copy.call(this, source)

		this.fragmentShader = source.fragmentShader
		this.vertexShader = source.vertexShader

		this.uniforms = UniformsUtils.clone(source.uniforms)

		this.defines = Object.assign({}, source.defines)

		this.wireframe = source.wireframe
		this.wireframeLinewidth = source.wireframeLinewidth

		this.lights = source.lights
		this.clipping = source.clipping

		this.skinning = source.skinning

		this.morphTargets = source.morphTargets
		this.morphNormals = source.morphNormals

		this.extensions = Object.assign({}, source.extensions)

		this.glslVersion = source.glslVersion

		return this
	}
}

/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { THREE } from 'gl2'
import { MatrUnlitDataType } from '@gs.i/schema'
import { genPreShaderCode } from './utils'
import vs from './PrgUnlitMatr.vs.glsl'
import fs from './PrgUnlitMatr.fs.glsl'

export class PrgBasicMaterial extends THREE.MeshBasicMaterial {
	type = 'ShaderMaterial'

	// Add ShaderMaterial flag
	isShaderMaterial = true

	defines = {}
	uniforms = {}

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
		derivatives: false, // set to use derivatives
		fragDepth: false, // set to use fragment depth values
		drawBuffers: false, // set to use draw buffers
		shaderTextureLOD: false, // set to use shader texture LOD
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

	constructor(gsiMatr: MatrUnlitDataType) {
		super()
		// this.setValues(gsiMatr as any) // Set parent class parameters

		if (!gsiMatr.language) {
			gsiMatr.language = 'GLSL300'
		} else if (gsiMatr.language !== 'GLSL100' && gsiMatr.language !== 'GLSL300') {
			throw new Error(`GSI::Matr.language type '${gsiMatr.language}' is not supported`)
		}

		this.lights = true
		this.defines = {}

		// Set shader codes
		const preCodes = genPreShaderCode(gsiMatr)

		this.vertexShader = vs
			.replace(/\$\$GSI_INSERT<Attributes>/g, preCodes.attributes || '')
			.replace(/\$\$GSI_INSERT<Varyings>/g, preCodes.varyingsVert || '')
			.replace(/\$\$GSI_INSERT<Uniforms>/g, preCodes.uniforms || '')
			.replace(/\$\$GSI_INSERT<PreVert>/g, gsiMatr.preVert || '')
			.replace(/\$\$GSI_INSERT<VertGeometry>/g, gsiMatr.vertGeometry || '')
			.replace(/\$\$GSI_INSERT<VertOutput>/g, gsiMatr.vertOutput || '')
			.replace(/\$\$GSI_INSERT<PostVert>/g, gsiMatr.postVert || '')

		this.fragmentShader = fs
			.replace(/\$\$GSI_INSERT<Varyings>/g, preCodes.varyingsFrag || '')
			.replace(/\$\$GSI_INSERT<Uniforms>/g, preCodes.uniforms || '')
			.replace(/\$\$GSI_INSERT<PreFrag>/g, gsiMatr.preFrag || '')
			.replace(/\$\$GSI_INSERT<FragColor>/g, gsiMatr.fragColor || '')
	}

	copy(source) {
		THREE.MeshBasicMaterial.prototype.copy.call(this, source)

		this.fragmentShader = source.fragmentShader
		this.vertexShader = source.vertexShader

		this.uniforms = THREE.UniformsUtils.clone(source.uniforms)

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

import uuidv4 from 'uuid/v4';
import { WebGLShader, ShaderChunk, ShaderLib, UniformsUtils, constants } from '../../utils/threeHelper';
import CHUNKS2 from '../shaders/chunks';
// import shaderLib2 from '../shaders/lib';
const { NoToneMapping, AddOperation, MixOperation, MultiplyOperation, EquirectangularRefractionMapping, CubeRefractionMapping, SphericalReflectionMapping, EquirectangularReflectionMapping, CubeUVRefractionMapping, CubeUVReflectionMapping, CubeReflectionMapping, PCFSoftShadowMap, PCFShadowMap, CineonToneMapping, Uncharted2ToneMapping, ReinhardToneMapping, LinearToneMapping, GammaEncoding, RGBDEncoding, RGBM16Encoding, RGBM7Encoding, RGBEEncoding, sRGBEncoding, LinearEncoding } = constants;

// shaderMaterial的100到300转换
// const transpile = require('glsl-100-to-300')
// const tokenize = require('glsl-tokenizer')
// const stringify = require('glsl-token-string')

// 合并GL2的shader和THREE的shader
const CHUNKS = {
	...ShaderChunk,
	...CHUNKS2,
}

// const SHADERLIB = {
// 	...ShaderLib,
// 	...shaderLib2,
// }

// let programIdCount = 0;

/**
 * 编译连接一个Program并初始化相关信息
 */
export default class Program {
	constructor(gl, material, threeProgramParameters, accelerateShadow) {
		this.gl = gl;
		this.uuid = uuidv4();

		if (!material.isMaterial) { throw new Error('not material'); }
		if (!material.defines) { material.defines = {}; }

		// 内置Material的处理：GL2方案

        // // THREE原生普通Material需要先烘焙成GL能处理的格式
		// if (!material.isShaderMaterial && !material.vertexShader) {
		// 	// 加上这些信息让GL2可以绘制
		// 	// @NOTE: THREE的内置Material是不带glsl的，而是在render时才生成
		// 	if (material.isMeshPhongMaterial) {
		// 		material.vertexShader = shaderLib2.blinphong_vs;
		// 		material.fragmentShader = shaderLib2.blinphong_fs;
		// 		material.defines.GL2_PHONG = true;
		// 		// TODO: phisical的支持
		// 		// TODO: 光效参数转换以得到相近的结果
		// 		// material.shininess /= 2;
		// 	} else if (material.isMeshLambertMaterial) {
		// 		material.vertexShader = shaderLib2.lambert_vs;
		// 		material.fragmentShader = shaderLib2.lambert_fs;
		// 		material.defines.GL2_LAMBERT = true;
		// 	} else if (material.isMeshBasicMaterial || material.isLineBasicMaterial) {
		// 		material.vertexShader = shaderLib2.basic_vs;
		// 		material.fragmentShader = shaderLib2.basic_fs;
		// 		material.defines.GL2_BASIC = true;
		// 	} else if (material.isPointsMaterial) {
		// 		material.vertexShader = shaderLib2.point_vs;
		// 		material.fragmentShader = shaderLib2.point_fs;
		// 		material.defines.GL2_POINT = true;
		// 	} else if (material.isMeshDepthMaterial) {
		// 		const shader = ShaderLib.depth;
		// 		material.vertexShader = `#include <stdvs>\n` + shader.vertexShader;
		// 		material.fragmentShader = `#include <stdfs>\n` + shader.fragmentShader;
		// 		material.defines.GL2_DEPTH = true;
		// 		material.defines.THREE_DEPTH = true;
		// 	} else if (material.isMeshDistanceMaterial) {
		// 		const shader = ShaderLib.distanceRGBA;
		// 		material.vertexShader = `#include <stdvs>\n` + shader.vertexShader;
		// 		material.fragmentShader = `#include <stdfs>\n` + shader.fragmentShader;
		// 		material.defines.GL2_DISTANCE = true;
		// 		material.defines.THREE_DISTANCE = true;
		// 	} else if (material.isShadowMaterial) {
		// 		const shader = ShaderLib.shadow;
		// 		material.vertexShader = `#include <stdvs>\n` + shader.vertexShader;
		// 		material.fragmentShader = `#include <stdfs>\n` + shader.fragmentShader;
		// 		material.defines.GL2_SHADOW = true;
		// 		material.defines.THREE_SHADOW = true;
		// 	} else {
		// 		console.error('暂时不支持的Material', material);
		// 		throw new Error('暂时不支持的Material');
		// 	}
		//
		// 	// @TODO 是否应该向THREE一样动态判断
		// 	if (material.map) {
		// 		material.defines.USE_MAP = 1;
		// 	}
		// }
		//
        // // shaderMaterial（WebGL1）和RawShaderMaterial（WebGL2）可以直接支持
		//
		// const vsCode = this.packShaderCode(material, 'vs');
		// const fsCode = this.packShaderCode(material, 'fs');

		// 内置Material的处理：THREE原生方案

		let vsCode, fsCode;

		{
			const parameters = threeProgramParameters
			material.name = material.name || material.type
			parameters.accelerateShadow = accelerateShadow
			if (parameters.shaderID) {
				var shader = ShaderLib[ parameters.shaderID ];
				// material.uniforms = UniformsUtils.clone( shader.uniforms )
				material.vertexShader = shader.vertexShader
				material.fragmentShader = shader.fragmentShader;

				if (material.onBeforeCompile) {
					material.onBeforeCompile(material, null); // TODO 第二个参数为renderer; uniforms不存在
				}

				[vsCode, fsCode] = this.packShaderCodeTHREE(material, parameters)
			} else if (!material.isRawShaderMaterial) {
				// shaderMaterial
				if (material.onBeforeCompile) {
					material.onBeforeCompile(material, null); // TODO 第二个参数为renderer; uniforms不存在
				}

				[vsCode, fsCode] = this.packShaderCodeTHREE(material, parameters)
			} else {
				if (material.onBeforeCompile) {
					material.onBeforeCompile(material, null); // TODO 第二个参数为renderer; uniforms不存在
				}
				vsCode = this.packShaderCode(material, 'vs');
				fsCode = this.packShaderCode(material, 'fs');
			}
		}

        // THREE.WebGLShader只做了一件事：出错之后给报错加上行号 :) 不用白不用
		const vs = new WebGLShader(gl, gl.VERTEX_SHADER, vsCode);
		const fs = new WebGLShader(gl, gl.FRAGMENT_SHADER, fsCode);
		this.glProgram = gl.createProgram();
		gl.attachShader(this.glProgram, vs);
		gl.attachShader(this.glProgram, fs);
        // TF特有的步骤
		this.tfVaryings = {};
		if (material.transformFeedback) {
			this.useTransformFeedback = true;
			gl.transformFeedbackVaryings(
				this.glProgram,
				material.tfVaryings,
				gl.SEPARATE_ATTRIBS
			);
			material.tfVaryings.forEach((varying, index) => {
				this.tfVaryings[varying] = index;
			})
		}
		gl.linkProgram(this.glProgram);
		if ( !gl.getProgramParameter(this.glProgram, gl.LINK_STATUS) ) {
			const info = gl.getProgramInfoLog(this.glProgram);
			throw 'Could not compile WebGL program. \n\n' + info;
		}

		// clean up
		gl.deleteShader( vs );
		gl.deleteShader( fs );

		this.attributes = fetchAttributeLocations(gl, this.glProgram);
		const {uniforms, blocks} = getUniforms(gl, this.glProgram);
		this.uniforms = uniforms;
		this.blocks = blocks;
	}

	// 注入shader库
	static injectShader(name, glsl) {
		if (!isString(name) || !isString(glsl)) {
			throw new Error('injectShader: wrong parameters', name, glsl)
		}
		if (CHUNKS[name]) {
			console.warn(`${name} aready in CHUNKS, and will be rewrite by yours`);
		}
		CHUNKS[name] = glsl
	}

    /**
     * 组装shader代码（version 300 es）
     * @param  {THREE.Material} material
     * @param  {String} [type='vs']
     * @return {String}
     */
	packShaderCode(material, type='vs') {
		// const parameters = material.sceneParameters || {}
		// 对THREE.ShaderMaterial兼容，来降低迁移成本
		// if (!material.isRawShaderMaterial) {
		// 	return this.packShaderCodeTHREE(material, type);
		// }

		material.defines.GL2 = true;

		let code = '';

        // define处理
		const defines = generateDefines(material.defines);

        // 核心
		if (type == 'fs') {
			code += material.fragmentShader;
		} else {
			code += material.vertexShader;
		}

        // include
		code = parseIncludes(code, defines);
		// code = replaceLightNums(code, material.sceneParameters);
		// code = unrollLoops(code);

		return code;
	}

	/**
     * 组装shader代码（version 300 es）
     * @param  {THREE.Material} material
     * @param  {Object} parameters
     * @return {Array[String, String]}
     */
	packShaderCodeTHREE(material, parameters) {
		// NOTE 兼容THREE，THREE的shader定义类似于我们的Material
		const shader = material

		var defines = material.defines;

		var vertexShader = material.vertexShader;
		var fragmentShader = material.fragmentShader;

		var shadowMapTypeDefine = 'SHADOWMAP_TYPE_BASIC';

		if ( parameters.shadowMapType === PCFShadowMap ) {

			shadowMapTypeDefine = 'SHADOWMAP_TYPE_PCF';

		} else if ( parameters.shadowMapType === PCFSoftShadowMap ) {

			shadowMapTypeDefine = 'SHADOWMAP_TYPE_PCF_SOFT';

		}

		var envMapTypeDefine = 'ENVMAP_TYPE_CUBE';
		var envMapModeDefine = 'ENVMAP_MODE_REFLECTION';
		var envMapBlendingDefine = 'ENVMAP_BLENDING_MULTIPLY';

		if ( parameters.envMap ) {

			switch ( material.envMap.mapping ) {

				case CubeReflectionMapping:
				case CubeRefractionMapping:
					envMapTypeDefine = 'ENVMAP_TYPE_CUBE';
					break;

				case CubeUVReflectionMapping:
				case CubeUVRefractionMapping:
					envMapTypeDefine = 'ENVMAP_TYPE_CUBE_UV';
					break;

				case EquirectangularReflectionMapping:
				case EquirectangularRefractionMapping:
					envMapTypeDefine = 'ENVMAP_TYPE_EQUIREC';
					break;

				case SphericalReflectionMapping:
					envMapTypeDefine = 'ENVMAP_TYPE_SPHERE';
					break;

			}

			switch ( material.envMap.mapping ) {

				case CubeRefractionMapping:
				case EquirectangularRefractionMapping:
					envMapModeDefine = 'ENVMAP_MODE_REFRACTION';
					break;

			}

			switch ( material.combine ) {

				case MultiplyOperation:
					envMapBlendingDefine = 'ENVMAP_BLENDING_MULTIPLY';
					break;

				case MixOperation:
					envMapBlendingDefine = 'ENVMAP_BLENDING_MIX';
					break;

				case AddOperation:
					envMapBlendingDefine = 'ENVMAP_BLENDING_ADD';
					break;

			}

		}

		// var gammaFactorDefine = ( renderer.gammaFactor > 0 ) ? renderer.gammaFactor : 1.0;
		var gammaFactorDefine = 1.0;

		// console.log( 'building new program ' );

		//

		// var customExtensions = generateExtensions( material.extensions, parameters, extensions );
		var customExtensions = '' // generateExtensions( material.extensions, parameters, extensions );

		var customDefines = generateDefines( defines );

		//

		// var program = gl.createProgram();

		var prefixVertex, prefixFragment;

		// if ( material.isRawShaderMaterial ) {
		//
		// 	prefixVertex = [
		//
		// 		customDefines
		//
		// 	].filter( filterEmptyLine ).join( '\n' );
		//
		// 	if ( prefixVertex.length > 0 ) {
		//
		// 		prefixVertex += '\n';
		//
		// 	}
		//
		// 	prefixFragment = [
		//
		// 		customExtensions,
		// 		customDefines
		//
		// 	].filter( filterEmptyLine ).join( '\n' );
		//
		// 	if ( prefixFragment.length > 0 ) {
		//
		// 		prefixFragment += '\n';
		//
		// 	}
		//
		// } else
		{

			prefixVertex = [

				'precision ' + parameters.precision + ' float;',
				'precision ' + parameters.precision + ' int;',

				// webgl2
				'precision ' + parameters.precision + ' sampler2D;',
				'precision ' + parameters.precision + ' sampler2DShadow;',

				'#define SHADER_NAME ' + shader.name,

				customDefines,

				parameters.supportsVertexTextures ? '#define VERTEX_TEXTURES' : '',

				'#define GAMMA_FACTOR ' + gammaFactorDefine,

				// '#define MAX_BONES ' + parameters.maxBones,
				( parameters.useFog && parameters.fog ) ? '#define USE_FOG' : '',
				( parameters.useFog && parameters.fogExp ) ? '#define FOG_EXP2' : '',

				parameters.map ? '#define USE_MAP' : '',
				parameters.envMap ? '#define USE_ENVMAP' : '',
				parameters.envMap ? '#define ' + envMapModeDefine : '',
				parameters.lightMap ? '#define USE_LIGHTMAP' : '',
				parameters.aoMap ? '#define USE_AOMAP' : '',
				parameters.emissiveMap ? '#define USE_EMISSIVEMAP' : '',
				parameters.bumpMap ? '#define USE_BUMPMAP' : '',
				parameters.normalMap ? '#define USE_NORMALMAP' : '',
				( parameters.normalMap && parameters.objectSpaceNormalMap ) ? '#define OBJECTSPACE_NORMALMAP' : '',
				parameters.displacementMap && parameters.supportsVertexTextures ? '#define USE_DISPLACEMENTMAP' : '',
				parameters.specularMap ? '#define USE_SPECULARMAP' : '',
				parameters.roughnessMap ? '#define USE_ROUGHNESSMAP' : '',
				parameters.metalnessMap ? '#define USE_METALNESSMAP' : '',
				parameters.alphaMap ? '#define USE_ALPHAMAP' : '',
				parameters.vertexColors ? '#define USE_COLOR' : '',

				parameters.flatShading ? '#define FLAT_SHADED' : '',

				parameters.skinning ? '#define USE_SKINNING' : '',
				parameters.useVertexTexture ? '#define BONE_TEXTURE' : '',

				parameters.morphTargets ? '#define USE_MORPHTARGETS' : '',
				parameters.morphNormals && parameters.flatShading === false ? '#define USE_MORPHNORMALS' : '',
				parameters.doubleSided ? '#define DOUBLE_SIDED' : '',
				parameters.flipSided ? '#define FLIP_SIDED' : '',

				parameters.shadowMapEnabled ? '#define USE_SHADOWMAP' : '',
				parameters.shadowMapEnabled ? '#define ' + shadowMapTypeDefine : '',

				parameters.sizeAttenuation ? '#define USE_SIZEATTENUATION' : '',

				// parameters.logarithmicDepthBuffer ? '#define USE_LOGDEPTHBUF' : '',
				// parameters.logarithmicDepthBuffer && extensions.get( 'EXT_frag_depth' ) ? '#define USE_LOGDEPTHBUF_EXT' : '',

				'uniform mat4 modelMatrix;',
				'uniform mat4 modelViewMatrix;',
				'uniform mat4 projectionMatrix;',
				'uniform mat4 viewMatrix;',
				'uniform mat3 normalMatrix;',
				'uniform vec3 cameraPosition;',

				'attribute vec3 position;',
				'attribute vec3 normal;',
				'attribute vec2 uv;',

				'#ifdef USE_COLOR',

				'	attribute vec3 color;',

				'#endif',

				'#ifdef USE_MORPHTARGETS',

				'	attribute vec3 morphTarget0;',
				'	attribute vec3 morphTarget1;',
				'	attribute vec3 morphTarget2;',
				'	attribute vec3 morphTarget3;',

				'	#ifdef USE_MORPHNORMALS',

				'		attribute vec3 morphNormal0;',
				'		attribute vec3 morphNormal1;',
				'		attribute vec3 morphNormal2;',
				'		attribute vec3 morphNormal3;',

				'	#else',

				'		attribute vec3 morphTarget4;',
				'		attribute vec3 morphTarget5;',
				'		attribute vec3 morphTarget6;',
				'		attribute vec3 morphTarget7;',

				'	#endif',

				'#endif',

				'#ifdef USE_SKINNING',

				'	attribute vec4 skinIndex;',
				'	attribute vec4 skinWeight;',

				'#endif',

				'\n'

			].filter( filterEmptyLine ).join( '\n' );

			prefixFragment = [

				customExtensions,

				'precision ' + parameters.precision + ' float;',
				'precision ' + parameters.precision + ' int;',

				// webgl2
				'precision ' + parameters.precision + ' sampler2D;',
				'precision ' + parameters.precision + ' sampler2DShadow;',

				'#define SHADER_NAME ' + shader.name,

				customDefines,

				parameters.alphaTest ? '#define ALPHATEST ' + parameters.alphaTest + ( parameters.alphaTest % 1 ? '' : '.0' ) : '', // add '.0' if integer

				'#define GAMMA_FACTOR ' + gammaFactorDefine,

				( parameters.useFog && parameters.fog ) ? '#define USE_FOG' : '',
				( parameters.useFog && parameters.fogExp ) ? '#define FOG_EXP2' : '',

				parameters.map ? '#define USE_MAP' : '',
				parameters.envMap ? '#define USE_ENVMAP' : '',
				parameters.envMap ? '#define ' + envMapTypeDefine : '',
				parameters.envMap ? '#define ' + envMapModeDefine : '',
				parameters.envMap ? '#define ' + envMapBlendingDefine : '',
				parameters.lightMap ? '#define USE_LIGHTMAP' : '',
				parameters.aoMap ? '#define USE_AOMAP' : '',
				parameters.emissiveMap ? '#define USE_EMISSIVEMAP' : '',
				parameters.bumpMap ? '#define USE_BUMPMAP' : '',
				parameters.normalMap ? '#define USE_NORMALMAP' : '',
				( parameters.normalMap && parameters.objectSpaceNormalMap ) ? '#define OBJECTSPACE_NORMALMAP' : '',
				parameters.specularMap ? '#define USE_SPECULARMAP' : '',
				parameters.roughnessMap ? '#define USE_ROUGHNESSMAP' : '',
				parameters.metalnessMap ? '#define USE_METALNESSMAP' : '',
				parameters.alphaMap ? '#define USE_ALPHAMAP' : '',
				parameters.vertexColors ? '#define USE_COLOR' : '',

				parameters.gradientMap ? '#define USE_GRADIENTMAP' : '',

				parameters.flatShading ? '#define FLAT_SHADED' : '',

				parameters.doubleSided ? '#define DOUBLE_SIDED' : '',
				parameters.flipSided ? '#define FLIP_SIDED' : '',

				parameters.shadowMapEnabled ? '#define USE_SHADOWMAP' : '',
				parameters.shadowMapEnabled ? '#define ' + shadowMapTypeDefine : '',

				parameters.premultipliedAlpha ? '#define PREMULTIPLIED_ALPHA' : '',

				parameters.physicallyCorrectLights ? '#define PHYSICALLY_CORRECT_LIGHTS' : '',

				// parameters.logarithmicDepthBuffer ? '#define USE_LOGDEPTHBUF' : '',
				// parameters.logarithmicDepthBuffer && extensions.get( 'EXT_frag_depth' ) ? '#define USE_LOGDEPTHBUF_EXT' : '',

				// parameters.envMap && extensions.get( 'EXT_shader_texture_lod' ) ? '#define TEXTURE_LOD_EXT' : '',
				'#define TEXTURE_LOD_EXT',

				'uniform mat4 viewMatrix;',
				'uniform vec3 cameraPosition;',

				// ( parameters.toneMapping !== NoToneMapping ) ? '#define TONE_MAPPING' : '',
				// ( parameters.toneMapping !== NoToneMapping ) ? ShaderChunk[ 'tonemapping_pars_fragment' ] : '', // this code is required here because it is used by the toneMapping() function defined below
				// ( parameters.toneMapping !== NoToneMapping ) ? getToneMappingFunction( 'toneMapping', parameters.toneMapping ) : '',

				parameters.dithering ? '#define DITHERING' : '',

				( parameters.outputEncoding || parameters.mapEncoding || parameters.envMapEncoding || parameters.emissiveMapEncoding ) ? ShaderChunk[ 'encodings_pars_fragment' ] : '', // this code is required here because it is used by the various encoding/decoding function defined below
				parameters.mapEncoding ? getTexelDecodingFunction( 'mapTexelToLinear', parameters.mapEncoding ) : '',
				parameters.envMapEncoding ? getTexelDecodingFunction( 'envMapTexelToLinear', parameters.envMapEncoding ) : '',
				parameters.emissiveMapEncoding ? getTexelDecodingFunction( 'emissiveMapTexelToLinear', parameters.emissiveMapEncoding ) : '',
				parameters.outputEncoding ? getTexelEncodingFunction( 'linearToOutputTexel', parameters.outputEncoding ) : '',

				parameters.depthPacking ? '#define DEPTH_PACKING ' + material.depthPacking : '',

				'\n'

			].filter( filterEmptyLine ).join( '\n' );


			// GLSL 3.0 conversion
			prefixVertex = [
				'#version 300 es\n',
				'#define attribute in',
				'#define varying out',
				'#define texture2D texture',
				'#define useWebGL2 1',
				parameters.accelerateShadow ? '#define accelerateShadow 1' : '',
			].join( '\n' ) + '\n' + prefixVertex;

			prefixFragment = [
				'#version 300 es\n',
				'#define varying in',
				'layout(location = 0) out highp vec4 pc_fragColor;',
				'layout(location = 1) out highp vec4 fragColor1;',
				'layout(location = 2) out highp vec4 fragColor2;',
				'layout(location = 3) out highp vec4 fragColor3;',
				'layout(location = 4) out highp vec4 fragColor4;',
				'layout(location = 5) out highp vec4 fragColor5;',
				'layout(location = 6) out highp vec4 fragColor6;',
				'layout(location = 7) out highp vec4 fragColor7;',
				'#define fragColor0 pc_fragColor',
				'#define gl_FragColor pc_fragColor',
				'#define gl_FragDepthEXT gl_FragDepth',
				'#define texture2D texture',
				'#define textureCube texture',
				'#define texture2DProj textureProj',
				'#define texture2DLodEXT textureLod',
				'#define texture2DProjLodEXT textureProjLod',
				'#define textureCubeLodEXT textureLod',
				'#define texture2DGradEXT textureGrad',
				'#define texture2DProjGradEXT textureProjGrad',
				'#define textureCubeGradEXT textureGrad',
				'#define useWebGL2 1',
				parameters.accelerateShadow ? '#define accelerateShadow 1' : '',
			].join( '\n' ) + '\n' + prefixFragment;
		}

		vertexShader = parseIncludes( vertexShader );
		vertexShader = replaceLightNums( vertexShader, parameters );
		vertexShader = replaceClippingPlaneNums( vertexShader, parameters );

		fragmentShader = parseIncludes( fragmentShader );
		fragmentShader = replaceLightNums( fragmentShader, parameters );
		fragmentShader = replaceClippingPlaneNums( fragmentShader, parameters );

		vertexShader = unrollLoops( vertexShader );
		fragmentShader = unrollLoops( fragmentShader );

		// debugger
		//
		// var vertexGlsl = stringify(transpile.vertex(tokenize(prefixVertex + vertexShader)));
		// var fragmentGlsl = stringify(transpile.fragment(tokenize(prefixFragment + fragmentShader)));

		var vertexGlsl = prefixVertex + vertexShader;
		var fragmentGlsl = prefixFragment + fragmentShader;

		return [vertexGlsl, fragmentGlsl]
	}

}


// from three.js WebGLProgram
// @Simon 加入对define的特殊处理
function parseIncludes( string, defines ) {

	var pattern = /^[ \t]*#include +<([\w\d.]+)>/gm;

	function replace( match, include ) {

		var replace = include === 'defines' ? defines : CHUNKS[ include ];

		if ( replace === undefined ) {

			throw new Error( 'Can not resolve #include <' + include + '>' );

		}

		return parseIncludes( replace, defines );

	}

	if (string === undefined) {
		throw new Error('GL2::internal error # 5337589')
	}

	return string.replace( pattern, replace );

}


// 获取uniform
// @Simon
function getUniforms(gl, program) {
    // NOTE: 注意block里面的总是会被当做active，而且必须绑定！！！
	const total = gl.getProgramParameter( program, gl.ACTIVE_UNIFORMS );
	const uniforms = {};
	const blocks = {};
	const uniformNames = [];

	for (let i = 0; i < total; i++) {
		const activeInfo = gl.getActiveUniform( program, i );
		const location = gl.getUniformLocation( program, activeInfo.name );
		uniforms[activeInfo.name] = {location, activeInfo, _i: i};
		uniformNames.push(activeInfo.name);
	}

    // REF: https://www.packtpub.com/books/content/opengl-40-using-uniform-blocks-and-uniform-buffer-objects

    // @TODO 似乎就是从0开始顺序排序，没必要调接口
	const uniformIndices = gl.getUniformIndices(program, uniformNames) || []; // Firefox可能会返回null

    // @NOTE 和getActiveUniform拿到的WebGLActiveInfo.type是一样的
	const types = gl.getActiveUniforms(program, uniformIndices, gl.UNIFORM_TYPE);

    // @NOTE 非block内的Uniform得到的是-1，blockID从0开始
	const blockIndecis = gl.getActiveUniforms(program, uniformIndices, gl.UNIFORM_BLOCK_INDEX);

    // @NOTE block内的Uniform得到的是-1
	const offsets = gl.getActiveUniforms(program, uniformIndices, gl.UNIFORM_OFFSET);

	const sizes = gl.getActiveUniforms(program, uniformIndices, gl.UNIFORM_SIZE);

	uniformNames.forEach((uniformName, i) => {
		const blockIndex = blockIndecis[i];
		uniforms[uniformName].index = uniformIndices[i];
		uniforms[uniformName].type = types[i];
		uniforms[uniformName].blockIndex = blockIndex;
		uniforms[uniformName].blockName = undefined;
		uniforms[uniformName].offset = offsets[i];
		uniforms[uniformName].size = sizes[i];
		uniforms[uniformName].name = uniformName;

		if (blockIndex > -1) {
            // 找到一个block

            // 分配binding point（如果不分配会全部使用0）
			gl.uniformBlockBinding(program, blockIndex, blockIndex);

			const name = gl.getActiveUniformBlockName(program, blockIndex);
			const size = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE);
			const binding = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_BINDING);
			blocks[name] = { index: blockIndex, size, binding, name };
			uniforms[uniformName].blockName = name;
		}
	})

	// console.log(uniforms, blocks);
	return {uniforms, blocks};
}


function getBlocks(gl, program) {

}


// NOTE 下面是 THREE.WebGLProgram 复制过来的 ==========================

function getEncodingComponents( encoding ) {

	switch ( encoding ) {

		case LinearEncoding:
			return [ 'Linear', '( value )' ];
		case sRGBEncoding:
			return [ 'sRGB', '( value )' ];
		case RGBEEncoding:
			return [ 'RGBE', '( value )' ];
		case RGBM7Encoding:
			return [ 'RGBM', '( value, 7.0 )' ];
		case RGBM16Encoding:
			return [ 'RGBM', '( value, 16.0 )' ];
		case RGBDEncoding:
			return [ 'RGBD', '( value, 256.0 )' ];
		case GammaEncoding:
			return [ 'Gamma', '( value, float( GAMMA_FACTOR ) )' ];
		default:
			throw new Error( 'unsupported encoding: ' + encoding );

	}

}

function getTexelDecodingFunction( functionName, encoding ) {

	var components = getEncodingComponents( encoding );
	return 'vec4 ' + functionName + '( vec4 value ) { return ' + components[ 0 ] + 'ToLinear' + components[ 1 ] + '; }';

}

function getTexelEncodingFunction( functionName, encoding ) {

	var components = getEncodingComponents( encoding );
	return 'vec4 ' + functionName + '( vec4 value ) { return LinearTo' + components[ 0 ] + components[ 1 ] + '; }';

}

function getToneMappingFunction( functionName, toneMapping ) {

	var toneMappingName;

	switch ( toneMapping ) {

		case LinearToneMapping:
			toneMappingName = 'Linear';
			break;

		case ReinhardToneMapping:
			toneMappingName = 'Reinhard';
			break;

		case Uncharted2ToneMapping:
			toneMappingName = 'Uncharted2';
			break;

		case CineonToneMapping:
			toneMappingName = 'OptimizedCineon';
			break;

		default:
			throw new Error( 'unsupported toneMapping: ' + toneMapping );

	}

	return 'vec3 ' + functionName + '( vec3 color ) { return ' + toneMappingName + 'ToneMapping( color ); }';

}


function generateExtensions( extensions, parameters, rendererExtensions ) {

	extensions = extensions || {};

	var chunks = [
		( extensions.derivatives || parameters.envMapCubeUV || parameters.bumpMap || ( parameters.normalMap && ! parameters.objectSpaceNormalMap ) || parameters.flatShading ) ? '#extension GL_OES_standard_derivatives : enable' : '',
		( extensions.fragDepth || parameters.logarithmicDepthBuffer ) && rendererExtensions.get( 'EXT_frag_depth' ) ? '#extension GL_EXT_frag_depth : enable' : '',
		( extensions.drawBuffers ) && rendererExtensions.get( 'WEBGL_draw_buffers' ) ? '#extension GL_EXT_draw_buffers : require' : '',
		( extensions.shaderTextureLOD || parameters.envMap ) && rendererExtensions.get( 'EXT_shader_texture_lod' ) ? '#extension GL_EXT_shader_texture_lod : enable' : ''
	];

	return chunks.filter( filterEmptyLine ).join( '\n' );

}


function generateDefines( defines ) {

	var chunks = [];

	for ( var name in defines ) {

		var value = defines[ name ];

		if ( value === false ) continue;

		chunks.push( '#define ' + name + ' ' + value );

	}

	return chunks.join( '\n' );

}


function replaceLightNums( string, parameters ) {

	return string
		.replace( /NUM_DIR_LIGHTS/g, parameters.numDirLights )
		.replace( /NUM_SPOT_LIGHTS/g, parameters.numSpotLights )
		.replace( /NUM_RECT_AREA_LIGHTS/g, parameters.numRectAreaLights )
		.replace( /NUM_POINT_LIGHTS/g, parameters.numPointLights )
		.replace( /NUM_HEMI_LIGHTS/g, parameters.numHemiLights );

}


function unrollLoops( string ) {

	var pattern = /#pragma unroll_loop[\s]+?for \( int i \= (\d+)\; i < (\d+)\; i \+\+ \) \{([\s\S]+?)(?=\})\}/g;

	function replace( match, start, end, snippet ) {

		var unroll = '';

		for ( var i = parseInt( start ); i < parseInt( end ); i ++ ) {

			unroll += snippet.replace( /\[ i \]/g, '[ ' + i + ' ]' );

		}

		return unroll;

	}

	return string.replace( pattern, replace );

}


function fetchAttributeLocations( gl, program ) {

	var attributes = {};

	var n = gl.getProgramParameter( program, gl.ACTIVE_ATTRIBUTES );

	for ( var i = 0; i < n; i ++ ) {

		var info = gl.getActiveAttrib( program, i );
		var name = info.name;

		// console.log( 'THREE.WebGLProgram: ACTIVE VERTEX ATTRIBUTE:', name, i );

		attributes[ name ] = gl.getAttribLocation( program, name );

	}

	return attributes;

}


function filterEmptyLine( string ) {

	return string !== '';

}

function replaceClippingPlaneNums( string, parameters ) {

	return string
		.replace( /NUM_CLIPPING_PLANES/g, parameters.numClippingPlanes )
		.replace( /UNION_CLIPPING_PLANES/g, ( parameters.numClippingPlanes - parameters.numClipIntersection ) );

}


// Simon
function isString(str){
	if(Object.prototype.toString.call(str) === "[object String]"){
		return true;
	}else{
		return false;
	}
}
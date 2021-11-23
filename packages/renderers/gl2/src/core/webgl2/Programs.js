import Program from './Program';
import { constants } from '../../utils/threeHelper'
const { BackSide, DoubleSide, CubeUVRefractionMapping, CubeUVReflectionMapping, GammaEncoding, LinearEncoding, ObjectSpaceNormalMap } = constants;
// import Program3 from './Program3';

/**
 * 集中管理Program，一个material一个Program，避免重复编译
 */
export default class Programs {
	constructor(gl, state) {
		this.gl = gl;
		this.state = state;

		// programs wont be able to release if we manage them only by hash
		// 这种做法的优势是可以跨material复用Program
		// 这样会导致一个material只能有一个Program，无法响应Program的变化

		// 编译过的所有Program
		this.code2programs = {};

		this.matr2programs = new WeakMap()
	}

	dispose() {
		this.code2programs = {}
		this.matr2programs = new WeakMap()
	}

	set(material, env) {
		// 首先尝试直接拿matr对应的Program
		let program = this.matr2programs.get(material)

		// 快速判断该材质是否需要更换Program
		if ( program && material.needsUpdate === false ) {
			if ( material.fog && program.fog !== env.fog ) {
				material.needsUpdate = true;
			} else if ( material.lights && program.lightsHash !== env.lights.hash ) {
				material.needsUpdate = true;
			}
		}

		// 如果拿不到或者 高matr需要更换Program
		if (!program || material.needsUpdate) {
			// 就尝试用code去拿
			let threeProgramParameters = {}
			if (!material.isRawShaderMaterial) {
				threeProgramParameters = getThreeProgramParameters(
					material, env.shadowMap, env.shadows, env.lights, env.fog, env.object,
				)
			}
			const hash = getProgramCode(material, threeProgramParameters);
			program = this.code2programs[hash]

			// 如果还拿不到，说明没编译过该种Program
			if (!program) {
				// 编译
				program = new Program(this.gl, material, threeProgramParameters, env.accelerateShadow);

				const dispose = () => {
					delete this.code2programs[hash]
					this.matr2programs.delete(material)
					// TODO 主动dispose之后重新使用并没有创建新的program，会导致出错
					// this.gl.deleteProgram(program.glProgram)
					material.removeEventListener( 'dispose', dispose )
				}
				material.addEventListener( 'dispose', dispose )
			}

			// 用于快速判断是否需要替换Program
			program.fog = env.fog
			program.lightsHash = env.lights.hash

			this.code2programs[hash] = program
			this.matr2programs.set(material, program)
			material.needsUpdate = false
		}

		// 如果编译过，就使用
		const ifChanged = this.state.useProgram(program.glProgram);
		return {
			currentProgram: program,
			ifChanged, // Program是否切换了
		};
	}

	// 向include库中注入自定义shader库
	injectShader(name, glsl) {
		Program.injectShader(name, glsl);
	}

	// set(material, env) {
	// 	// @TODO sceneProperties的变化需要考虑进来
	// 	// @TODO 这样会导致旧的Program不被释放
	// 	if (!program || (material.needsUpdate === true)) {
	// 		let threeProgramParameters = {}
	// 		if (!material.isRawShaderMaterial) {
	// 			threeProgramParameters = getThreeProgramParameters(
	// 				material, env.shadowMap, env.shadows, env.lights, env.fog, env.object,
	// 			)
	// 		}
	// 		program = new Program(this.gl, material, threeProgramParameters)
	// 		this.programsCache.set(material, program)
	// 		material.needsUpdate = false
	// 	}

	// 	let threeProgramParameters = {}
	// 	if (!material.isRawShaderMaterial) {
	// 		threeProgramParameters = getThreeProgramParameters(
	// 			material, env.shadowMap, env.shadows, env.lights, env.fog, env.object,
	// 		)
	// 	}
	// 	const hash = getProgramCode(material, threeProgramParameters);
	// 	// 如果没编译过或者需要重新编译，就编译
	// 	if (!this.programsCache[hash]) {
	// 		this.programsCache[hash] = new Program(this.gl, material, threeProgramParameters);
	// 	}
	// 	// 如果编译过，就使用
	// 	const ifChanged = this.state.useProgram(this.programsCache[hash].glProgram);
	// 	return {
	// 		currentProgram: this.programsCache[hash],
	// 		ifChanged, // Program是否切换了
	// 	};
	// }

	// getHash(material) {
	// 	if (material.needsUpdate) {
    //         // Three内置的Material可以复用，shaderMaterial除非UUID一致否则不复用
	// 		if (material.isShaderMaterial) {
	// 			material.hash = material.uuid + Object.entries(material.defines).join();
	// 		} else {
	// 			// 如果一个材质被复制多次而且参数不一样，就不能复用
	// 			material.hash = material.type + Object.entries(material.defines).join();
	// 		}
	// 		material.needsUpdate = false;
	// 	}
	//
	// 	return material.hash;
	// }
}

// THREE.js

const parameterNames = [
	"precision", "supportsVertexTextures", "map", "mapEncoding", "envMap", "envMapMode", "envMapEncoding",
	"lightMap", "aoMap", "emissiveMap", "emissiveMapEncoding", "bumpMap", "normalMap", "objectSpaceNormalMap", "displacementMap", "specularMap",
	"roughnessMap", "metalnessMap", "gradientMap",
	"alphaMap", "combine", "vertexColors", "fog", "useFog", "fogExp",
	"flatShading", "sizeAttenuation", "logarithmicDepthBuffer", "skinning",
	"maxBones", "useVertexTexture", "morphTargets", "morphNormals",
	"maxMorphTargets", "maxMorphNormals", "premultipliedAlpha",
	"numDirLights", "numPointLights", "numSpotLights", "numHemiLights", "numRectAreaLights",
	"shadowMapEnabled", "shadowMapType", "toneMapping", 'physicallyCorrectLights',
	"alphaTest", "doubleSided", "flipSided", "numClippingPlanes", "numClipIntersection", "depthPacking", "dithering"
];

function getProgramCode( material, parameters ) {

	var array = [];

	if ( parameters.shaderID ) {

		array.push( parameters.shaderID );

	} else {

		array.push( material.fragmentShader );
		array.push( material.vertexShader );

	}

	if ( material.defines !== undefined ) {

		for ( var name in material.defines ) {

			array.push( name );
			array.push( material.defines[ name ] );

		}

	}

	for ( var i = 0; i < parameterNames.length; i ++ ) {

		array.push( parameters[ parameterNames[ i ] ] );

	}

	array.push( (material.onBeforeCompile || '').toString() );

	// array.push( renderer.gammaOutput );

	return array.join();

};

const shaderIDs = {
	MeshDepthMaterial: 'depth',
	MeshDistanceMaterial: 'distanceRGBA',
	MeshNormalMaterial: 'normal',
	MeshBasicMaterial: 'basic',
	MeshLambertMaterial: 'lambert',
	MeshPhongMaterial: 'phong',
	MeshToonMaterial: 'phong',
	MeshStandardMaterial: 'physical',
	MeshPhysicalMaterial: 'physical',
	LineBasicMaterial: 'basic',
	LineDashedMaterial: 'dashed',
	PointsMaterial: 'points',
	ShadowMaterial: 'shadow'
};

function getTextureEncodingFromMap( map, gammaOverrideLinear ) {

	var encoding;

	if ( ! map ) {

		encoding = LinearEncoding;

	} else if ( map.isTexture ) {

		encoding = map.encoding;

	} else if ( map.isWebGLRenderTarget ) {

		console.warn( "THREE.WebGLPrograms.getTextureEncodingFromMap: don't use render targets as textures. Use their .texture property instead." );
		encoding = map.texture.encoding;

	}

	// add backwards compatibility for WebGLRenderer.gammaInput/gammaOutput parameter, should probably be removed at some point.
	if ( encoding === LinearEncoding && gammaOverrideLinear ) {

		encoding = GammaEncoding;

	}

	return encoding;

}

export function getThreeProgramParameters(material, shadowMap, shadows, lights, fog, object) {

	var shaderID = shaderIDs[ material.type ];

	// heuristics to create shader parameters according to lights in the scene
	// (not to blow over maxLights budget)

	const maxBones = 0
	const precision = material.precision || 'highp'
	const nClipPlanes = 0
	const nClipIntersection = 0

	// var currentRenderTarget = renderer.getRenderTarget();

	const capabilities = {
		maxVertexTextures: 16,
		floatVertexTextures: true,
		maxTextures: 16,
		logarithmicDepthBuffer: false,
	}

	// NOTE 覆盖THREE接口，不提供线性空间
	const gammaInput = false
	const gammaOutput = false
	const currentRenderTarget = null

	var parameters = {

		shaderID: shaderID,

		precision: precision,
		supportsVertexTextures: capabilities.vertexTextures,
		outputEncoding: getTextureEncodingFromMap( ( ! currentRenderTarget ) ? null : currentRenderTarget.texture, gammaOutput ),
		map: !! material.map,
		mapEncoding: getTextureEncodingFromMap( material.map, gammaInput ),
		envMap: !! material.envMap,
		envMapMode: material.envMap && material.envMap.mapping,
		envMapEncoding: getTextureEncodingFromMap( material.envMap, gammaInput ),
		envMapCubeUV: ( !! material.envMap ) && ( ( material.envMap.mapping === CubeUVReflectionMapping ) || ( material.envMap.mapping === CubeUVRefractionMapping ) ),
		lightMap: !! material.lightMap,
		aoMap: !! material.aoMap,
		emissiveMap: !! material.emissiveMap,
		emissiveMapEncoding: getTextureEncodingFromMap( material.emissiveMap, gammaInput ),
		bumpMap: !! material.bumpMap,
		normalMap: !! material.normalMap,
		objectSpaceNormalMap: material.normalMapType === ObjectSpaceNormalMap,
		displacementMap: !! material.displacementMap,
		roughnessMap: !! material.roughnessMap,
		metalnessMap: !! material.metalnessMap,
		specularMap: !! material.specularMap,
		alphaMap: !! material.alphaMap,

		gradientMap: !! material.gradientMap,

		combine: material.combine,

		vertexColors: material.vertexColors,

		fog: !! fog,
		useFog: material.fog,
		fogExp: ( fog && fog.isFogExp2 ),

		flatShading: material.flatShading,

		sizeAttenuation: material.sizeAttenuation,
		logarithmicDepthBuffer: capabilities.logarithmicDepthBuffer,

		skinning: material.skinning && maxBones > 0,
		maxBones: maxBones,
		useVertexTexture: capabilities.floatVertexTextures,

		morphTargets: material.morphTargets,
		morphNormals: material.morphNormals,
		// maxMorphTargets: renderer.maxMorphTargets,
		// maxMorphNormals: renderer.maxMorphNormals,

		numDirLights: lights.directional.length,
		numPointLights: lights.point.length,
		numSpotLights: lights.spot.length,
		numRectAreaLights: lights.rectArea.length,
		numHemiLights: lights.hemi.length,

		numClippingPlanes: nClipPlanes,
		numClipIntersection: nClipIntersection,

		dithering: material.dithering,

		shadowMapEnabled: shadowMap.enabled && object.receiveShadow && shadows.length > 0,
		shadowMapType: shadowMap.type,

		// toneMapping: renderer.toneMapping,
		// physicallyCorrectLights: renderer.physicallyCorrectLights,

		premultipliedAlpha: material.premultipliedAlpha,

		alphaTest: material.alphaTest,
		doubleSided: material.side === DoubleSide,
		flipSided: material.side === BackSide,

		depthPacking: ( material.depthPacking !== undefined ) ? material.depthPacking : false

	};

	return parameters;
}

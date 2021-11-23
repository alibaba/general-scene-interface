import ThreeProxy from '../utils/threeHelper';
import { constants, WebGLSpriteRenderer } from '../utils/threeHelper';
import {
	refreshUniformsCommon,
	refreshUniformsLine,
	refreshUniformsDash,
	refreshUniformsPoints,
	// refreshUniformsFog,
	refreshUniformsLambert,
	refreshUniformsPhong,
	refreshUniformsToon,
	refreshUniformsStandard,
	refreshUniformsPhysical,
	refreshUniformsDepth,
	refreshUniformsDistance,
	refreshUniformsNormal,
	// markUniformsLightsNeedsUpdate,
} from '../utils/threeHelper/materialUtils'

import State from './webgl2/State.js';
import Attributes from './webgl2/Attributes.js';
// import Uniforms from './webgl2/Uniforms.js';
import Uniforms from './webgl2/Uniforms2.js';
import Textures from './webgl2/Textures.js';
import Programs from './webgl2/Programs.js';
import RenderTargets from './webgl2/RenderTargets.js';
// import Block from './webgl2/Block.js';
import Blocks from './webgl2/Blocks.js';
import ShadowMap from './webgl2/ShadowMap';

import { getBrowserInfo, getWebGLInfo } from '../utils/fun';

/**
* WebGL2Renderer
* @NOTE:
* 		把所有的Attribute、Uniform、texture、renderTarget集中管理
*   	一方面能够集中控制资源分配（主要是插槽）
*    	另一方面能够让其他类都作为逻辑类而不需要保存gl上下文
*    	能给开发带来极大的方便（Babylon的弱点）
*     	也是THREE十分值得学习的地方
*/
export default class Renderer {
	constructor(props) {
		this.width = props.width || 500;
		this.height = props.height || 500;
		this.viewport = [0, 0, this.width, this.height];
		this.autoClear = props.autoClear || true;
		// GL2 性能优化
		this.autoResetTextureUnit = props.autoResetTextureUnit || true;

		props.canvas = props.canvas !== undefined ? props.canvas : document.createElement('canvas');
		this.canvas = props.canvas

		this.props = props;

		this.browser = getBrowserInfo();
		this.gpu = getWebGLInfo();

		this.threeProxy = new ThreeProxy();
		// 创建上下文
		this.gl = createContex(props);
		this.context = this.gl;
		// 管理状态
		this.state = new State(this.gl, props);
		// 管理Attributes
		this.attributes = new Attributes(this.gl, this.state);
		// 管理贴图
		this.textures = new Textures(this.gl, this.state);
		// 管理Uniform
		this.uniforms = new Uniforms(this.gl, this.textures);
		this.blocks = new Blocks(this.gl);
		// 管理shader程序
		this.programs = new Programs(this.gl, this.state);
		// 管理renderTarget
		this.renderTargets = new RenderTargets(this.gl, this.state,  this.textures);
		// 阴影贴图渲染器
		this.shadowMap = new ShadowMap(this);

        // 默认值
		this.defaultColor = {r: 0.5, g: 0.5, b: 0.5};
		this.defaultShininess = 30;
		this.defaultPointSize = 1;

        // state cache，用于避免重复操作
		this._currentMaterialId = -1; // 每帧清空
		this._currentObjectId = -1; // 每帧清空
		this._currentGeometryId = -1; // 每帧清空
		this._currentCamera = null; // 每帧清空
		this._currentRenderTarget = null; // 跨帧

		// this.commonBlocks = {
		// 	COMMON: new Block('COMMON'),
		// 	// LIGHTS: new Block('LIGHTS'),
		// };

		// 整个场景共用的信息，共享信息
		this.sharedUniforms = {}

		// 兼容THREE
		this.vr = {};

		// THREE的sprite处理非常特殊
		this.spriteRenderer = new WebGLSpriteRenderer(this, this.gl, this.state, this.textures, {precision: 'lowp'})

		// dispose之后不应该再试图渲染，不然会报各种不可预知的错误
		this.disposed = false

		this.capabilities = {
			maxFragmentUniforms: Infinity,
			maxVertexUniforms: Infinity,
		}

		// tone mapping
		this.toneMapping = constants.LinearToneMapping;
		this.toneMappingExposure = 1.0;
		this.toneMappingWhitePoint = 1.0;
	}

	dispose() {
		this.disposed = true
		const gl = this.gl
		// ThreeProxy
		this.threeProxy.dispose()
		// 
		this.state.dispose()
		this.attributes.dispose()
		this.textures.dispose()
		this.uniforms.dispose()
		this.blocks.dispose()
		this.programs.dispose()
		this.renderTargets.dispose()
		// three没有这两个接口
		// this.shadowMap.dispose()
		// this.spriteRenderer.dispose()

		// context
		gl.getExtension('WEBGL_lose_context').loseContext()
	}

	get currentRenderState() {return this.threeProxy.currentRenderState}
	set currentRenderState(v) {this.threeProxy.currentRenderState = v}

	/**
	* 渲染一帧（一个pass）
	* @TODO renderTarget需要换成RTSet，WebGL2支持多target，且可以用blit实现快速拷贝
	* 		RTSet [
	* 			[rt00, rt01, rt02], // blit三份副本
	* 			rt1, // 第二个Buffer
	* 			rt2, // 第三个Buffer
	* 		]
	* @TODO 再加两个param：DepthRenderTarget
	* @param  {THREE.Scene} scene
	* @param  {THREE.Camera} camera
	* @param  {RenderTarget} renderTarget
	* @param  {Bool} forceClear
	*/
	render(scene, camera, renderTarget, forceClear = false) {
		if (this.disposed) {
			throw new Error('GL2::This renderer is disposed! Create a new one.')
		}
		// reset caching for this frame
		// 以下省略操作只在一帧内有效，跨帧则必须重复操作
		this._currentMaterialId = - 1;
		this._currentObjectId = -1;
		this._currentGeometryId = -1;
		this._currentCamera = null;

		scene.onBeforeRender( this, scene, camera, renderTarget );

		this.threeProxy.update(scene, camera);

		const shadowsArray = this.currentRenderState.state.shadowsArray;
		this.shadowMap.render( shadowsArray, scene, camera );

		this.currentRenderState.setupLights( camera );

		if ( renderTarget !== undefined ) {
			this.setRenderTarget(renderTarget);
		}

		// shadow map reset
		this.state.buffers.color.setClear(...(this.props.clearColor || [0, 0, 0, 1]));
		(this.autoClear || forceClear) && this.state.clear();

		const opaqueObjects = this.threeProxy.currentRenderList.opaque;
		const transparentObjects = this.threeProxy.currentRenderList.transparent;

		// opaque pass (front-to-back order)
		if ( opaqueObjects.length ) this.renderObjects( opaqueObjects, scene, camera );
		// transparent pass (back-to-front order)
		if ( transparentObjects.length ) this.renderObjects( transparentObjects, scene, camera );

		if (this.currentRenderState.state.spritesArray.length) {
			this.state.unbindVAO();
			this.spriteRenderer.render( this.currentRenderState.state.spritesArray, scene, camera );
		}

		this.renderTargets.blit(renderTarget);

		this.state.buffers.depth.setTest( true );
		this.state.buffers.depth.setMask( true );
		this.state.buffers.color.setMask( true );

		this.state.setPolygonOffset( false );

		this.currentRenderState = null
	}

	/**
	* 渲染一个renderList
	* @param  {Array[THREE.Mesh]} renderList
	* @param  {THREE.Scene} scene
	* @param  {THREE.Camera} camera
	* @param  {THREE.Material} overrideMaterial
	*/
	renderObjects(renderList, scene, camera, overrideMaterial) {
		renderList.forEach(renderItem => {
			const object = renderItem.object;
			const geometry = renderItem.geometry;
			const material = overrideMaterial ? overrideMaterial : renderItem.material;
			const group = renderItem.group;
			this.renderObject(object, scene, camera, geometry, material, group);
		});
	}

	/**
	* 渲染一个mesh
	* @param  {Mesh} object
	* @param  {THREE.Scene} scene
	* @param  {THREE.Camera} camera
	* @param  {THREE.Geometry} geometry
	* @param  {THREE.Material} material
	* @param  {Object} group
	*/
	renderObject(object, scene, camera, geometry, material, group) {
		if (!object.isMesh && !object.isLine && !object.isPoints || !object.visible) { return; }

		object.onBeforeRender && object.onBeforeRender(this, scene, camera, geometry, material, group);
		this.currentRenderState = this.threeProxy.renderStates.get( scene, camera );
		// this.currentRenderState = this.threeProxy.currentRenderState
		// this.currentRenderState.setupLights( camera );

		object.modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
		object.normalMatrix.getNormalMatrix(object.modelViewMatrix);

		this.renderBufferDirect(camera, null, geometry, material, object, group, scene);

		object.onAfterRender && object.onAfterRender(object, scene, camera, geometry, material, group);
		this.currentRenderState = this.threeProxy.renderStates.get( scene, camera );
		// this.currentRenderState = this.threeProxy.currentRenderState
		// this.currentRenderState.setupLights( camera );
	}

	// 接口与THREE保持一致
	renderBufferDirect( camera, fog, geometry, material, object, group, scene ) {
		// NOTE 特殊优化，针对Polaris，不影响其他任何部分
		// if (!!group && group.count === 0) return

		// 对应Three.WebGLRenderer.renderBufferDirect
		// 根据material设置状态
		this.state.setMaterial(material);

        // 重置贴图数量，详见Textures注释
		this.autoResetTextureUnit && this.textures.resetUnit();

		// 编译连接，切换program
		// @NOTE: three内置shader编译需要环境信息
		const _env = {
			shadowMap: this.shadowMap,
			shadows: this.currentRenderState.state.shadowsArray,
			lights: this.currentRenderState.state.lights.state,
			fog: fog,
			object: object,

			// chrome73 patch
			accelerateShadow: false
		};
		const {currentProgram, ifChanged: programChaneged} = this.programs.set(material, _env);
		// currentProgram = this.programs.set(material);

		// @TODO: 对应THREE.Renderer.setProgram
		// @TODO: 这一部分逻辑混乱而且没有和THREE保持一致
		// 避免重复操作的判断
        // @NOTE
        // 		这里避免的都是在一帧内的重复操作
        // 		如果两个物体共用Program(Material)，就不需要更新
        // 			- 颜色等材质信息
        // 			- 光
        // 			- 贴图
        // 		如果共用Program和相机，就不用更新视图矩阵和投影矩阵
        // 		如果共用Program和物体，就不用更新模型矩阵 TODO: THREE似乎漏掉了这个优化点
        // 		如果共用Program和Geom，就不用更新Attribute
        // @NOTE
        // 		在一帧内，一个Program可能对应多个Material
        // 		一个geometry对应多个Material
        // 		一个geometry对应多个Program， 但是Program变化后依然要重新绑定VAO（Attribute的index可能变化）
		let refreshProgram = false;
		let refreshMaterial = false;
		let refreshObject = false;
		let refreshGeometry = false;
		let refreshCamera = false;
		// let refresh Lights = false;
		let rebindUBO = false;

		if (programChaneged) {
			refreshProgram = true;
			refreshMaterial = true;
			// refreshObject = true;
			refreshGeometry = true; // shader会影响到Vertex绑定，切换program必须重新绑定
			// refreshCamera = true;
			rebindUBO = true;
		}

		if (material.id !== this._currentMaterialId) {
			refreshMaterial = true;
			// rebindUBO = true;
			this._currentMaterialId = material.id;
		}

		if (object.id !== this._currentObjectId) {
			refreshObject = true;
			this._currentObjectId = object.id;
		}

		if (geometry.id !== this._currentGeometryId) {
			// console.log(geometry.id, this._currentGeometryId);
			refreshGeometry = true;
			this._currentGeometryId = geometry.id;
		}

		if (camera !== this._currentCamera) {
			refreshCamera = true;
			this._currentCamera = camera;
		}

		// geometry和program没有变化则跳过
		// 		- program的id不变则完全不变
		// 		- 但是geometry的ID不变也可能会发生变化
		// 			- 通过onBeforeRender等回掉在渲染过程内改变Geometry
		// 			- 非常不正常的使用方式，暂时不考虑
		// 如果 用到 TransformFeedback，则必须调用 set，不然VAO和TFO绑定都会错误
		if (material.transformFeedback) refreshGeometry = true

		if (refreshGeometry) {
			this.attributes.set(geometry, material, currentProgram);
		}

		if (refreshMaterial) {
			// 自己的常规uniforms
			let commonUniforms = this.getCommonUniforms(object, camera, material);

			// 场景共享的uniform
			// commonUniforms = {...commonUniforms, ...this.sharedUniforms};

			if (!refreshCamera) {
				// @TODO 为什么不能删
				// delete commonUniforms.cameraPosition;
				// delete commonUniforms.projectionMatrix;
			}

			if (!refreshObject) {
				// @TODO 为什么不能删
				// delete commonUniforms.modelMatrix;
			}

			if (!refreshCamera && !refreshObject) {
				// @TODO 为什么不能删
				// delete commonUniforms.modelViewMatrix;
				// delete commonUniforms.normalMatrix;
			}

			commonUniforms = {
				...commonUniforms,
				// ...this.sharedUniforms,
				...this.getMaterialUniforms(material, camera), // 内置Material类型
			};
			// if (refreshMaterial) {
			// }

			// console.log(commonUniforms.modelViewMatrix.elements);
			this.uniforms.set(material, currentProgram, commonUniforms);
			this.blocks.set(material, currentProgram, this.commonBlocks);

		} else {

			const commonUniforms = this.getCommonUniforms(object, camera, material);
			// this.uniforms.set(material, currentProgram, commonUniforms);
			this.uniforms.setCommonUniforms(material, currentProgram, commonUniforms);

		}

		if (rebindUBO) {
			this.blocks.bindUBOs();
		}

		this.draw(object, geometry, material, group);
	}

	/**
	 * 拼装通用Uniform
	 * @param  {Mesh} object
	 * @param  {THREE.Camera} camera
	 * @param  {THREE.Material} material
	 * @return {Object}
	 */
	getCommonUniforms(object, camera, material) {
		// 对应 @link THREE.Renderer.refreshUniformsCommon
		// @NOTE: 简单起见，这些就不写value了
		const commonUniforms = {
			// NOTE 避免100版本的glsl中commonBlock中的Uniform都为空
			// NOTE 性能问题
			// NOTE 不使用commonblock，对性能提升没有帮助

            // 矩阵
			modelViewMatrix: {value: object.modelViewMatrix},
			normalMatrix: {value: object.normalMatrix},
			modelMatrix: {value: object.matrixWorld},

			projectionMatrix: {value: camera.projectionMatrix},
			cameraPosition: {value: camera.position},

			// @TODO 移到MaterialUniforms里面
			pointSize: {value: material.size || this.defaultPointSize},
		};

		return commonUniforms;
	}

	// 内置Material类型中的Uniforms
	getMaterialUniforms(material, camera) {
		if (material.isRawShaderMaterial) return {};

		const uniforms = {}

		if ( material.lights ) {


			// wire up the material to this renderer's lighting state
			const lights = this.currentRenderState.state.lights;

			uniforms.ambientLightColor = { value: lights.state.ambient };
			uniforms.directionalLights = { value: lights.state.directional };
			uniforms.spotLights = { value: lights.state.spot };
			uniforms.rectAreaLights = { value: lights.state.rectArea };
			uniforms.pointLights = { value: lights.state.point };
			uniforms.hemisphereLights = { value: lights.state.hemi };

			// debugger
			uniforms.directionalShadowMap = { value: lights.state.directionalShadowMap };
			uniforms.directionalShadowMatrix = { value: lights.state.directionalShadowMatrix };
			uniforms.spotShadowMap = { value: lights.state.spotShadowMap };
			uniforms.spotShadowMatrix = { value: lights.state.spotShadowMatrix };
			uniforms.pointShadowMap = { value: lights.state.pointShadowMap };
			uniforms.pointShadowMatrix = { value: lights.state.pointShadowMatrix };
			// TODO (abelnation): add area lights shadow info to uniforms

		}

		if ( material.isMeshPhongMaterial ||
			material.isMeshLambertMaterial ||
			material.isMeshBasicMaterial ||
			material.isMeshStandardMaterial ||
			material.isShaderMaterial ||
			material.skinning ) {

			uniforms.viewMatrix = {value: camera.matrixWorldInverse}
			// p_uniforms.setValue( _gl, 'viewMatrix', camera.matrixWorldInverse );

		}


		// refresh uniforms common to several materials

		// if ( fog && material.fog ) {
		//
		// 	refreshUniformsFog( uniforms, fog );
		//
		// }

		if ( material.isMeshBasicMaterial ) {

			refreshUniformsCommon( uniforms, material );

		} else if ( material.isMeshLambertMaterial ) {

			refreshUniformsCommon( uniforms, material );
			refreshUniformsLambert( uniforms, material );

		} else if ( material.isMeshPhongMaterial ) {

			refreshUniformsCommon( uniforms, material );

			if ( material.isMeshToonMaterial ) {

				refreshUniformsToon( uniforms, material );

			} else {

				refreshUniformsPhong( uniforms, material );

			}

		} else if ( material.isMeshStandardMaterial ) {

			refreshUniformsCommon( uniforms, material );

			if ( material.isMeshPhysicalMaterial ) {

				refreshUniformsPhysical( uniforms, material );

			} else {

				refreshUniformsStandard( uniforms, material );

			}

		} else if ( material.isMeshDepthMaterial ) {

			refreshUniformsCommon( uniforms, material );
			refreshUniformsDepth( uniforms, material );

		} else if ( material.isMeshDistanceMaterial ) {

			refreshUniformsCommon( uniforms, material );
			refreshUniformsDistance( uniforms, material );

		} else if ( material.isMeshNormalMaterial ) {

			refreshUniformsCommon( uniforms, material );
			refreshUniformsNormal( uniforms, material );

		} else if ( material.isLineBasicMaterial ) {

			refreshUniformsLine( uniforms, material );

			if ( material.isLineDashedMaterial ) {

				refreshUniformsDash( uniforms, material );

			}

		} else if ( material.isPointsMaterial ) {

			refreshUniformsPoints( uniforms, material, 1, this.canvas.height );

		} else if ( material.isShadowMaterial ) {

			uniforms.color = {value: material.color};
			uniforms.opacity = {value: material.opacity};

		}



		// if (material.map) {
		// 	uniforms.map = material.map;
		// 	// uniforms.USE_MAP = 1.0;
		//
		// 	// @TODO: 极不常更新的Uniform应该避免更新
		// 	const uvScaleMap = material.map;
		// 	const offset = uvScaleMap.offset;
		// 	const repeat = uvScaleMap.repeat;
		// 	const rotation = uvScaleMap.rotation;
		// 	const center = uvScaleMap.center;
		// 	uvScaleMap.matrix.setUvTransform(offset.x, offset.y, repeat.x, repeat.y, rotation, center.x, center.y);
		// 	uniforms.uvTransform = uvScaleMap.matrix;
		// }

		return uniforms;
	}

	getMaterialDefines(material) {
		if (material.isShaderMaterial) return material.defines;

		const defines = {};

		// if (material.map) {
		// 	defines.USE_MAP = 1;
		// }

		return defines;
	}

	/**
	 * 更新场景信息（该物体以外的信息，这些信息被整个场景共用）(Material需要的，Object以外的信息)
	 * @param  {[type]} scene [description]
	 * @param  {[type]} camera [description]
	 * @return {[type]}        [description]
	 */
	updateSceneParameters(scene, camera) {
		// 光源
		// this.sceneParameters.numPointLights = 0;
		// this.sceneParameters.numHemiLights = 0;
		// this.sceneParameters.numDirLights = 0;
		//
		const uniforms = this.sharedUniforms;

		uniforms.projectionMatrix = {value: camera.projectionMatrix};
		uniforms.cameraPosition = {value: camera.position};

		// // 常规Blocks
		// this.commonBlocks.COMMON.uniforms = uniforms;
		//
		// this.commonBlocks.COMMON.needsUpdate = true;
	}

	/**
	 * 更新光源、相机位置、投影矩阵等共用信息（这些信息在一帧内不会变化）
	 * @param  {THREE.Camera} camera
	 */
	// updateCommonBlocksAndDefines(camera) {
	// 	// this.commonDefines.USE_POINT_LIGHT = 0;
	// 	// this.commonDefines.USE_AMBIENT_LIGHT = 0;
	// 	// this.commonDefines.USE_DIRECTIONAL_LIGHT = 0;
	//
	// 	const uniforms = {
	// 		projectionMatrix: camera.projectionMatrix,
	// 		cameraPosition: camera.position,
	// 	};
	//
	// 	// this.threeProxy.lightsArray.forEach(light => {
	// 	// 	if (light.isPointLight) {
	// 	// 		// 点光源
	// 	// 		const lightIndex = this.commonDefines.USE_POINT_LIGHT;
	// 	// 		this.commonDefines.USE_POINT_LIGHT ++;
	// 	// 		uniforms[`pointLights[${lightIndex}].position`] = light.position;
	// 	// 		uniforms[`pointLights[${lightIndex}].color`] = light.color.clone().multiplyScalar(light.intensity);
	// 	// 		uniforms[`pointLights[${lightIndex}].distance`] = light.distance || 1000;
	// 	// 		// uniforms[`pointLights[${lightIndex}].distance`] = 0.4;
	// 	// 		uniforms[`pointLights[${lightIndex}].decay`] = light.decay || 1;
	// 	//
	// 	// 	} else if (light.isAmbientLight) {
	// 	// 		// 全局光
	// 	// 		const lightIndex = this.commonDefines.USE_AMBIENT_LIGHT;
	// 	// 		this.commonDefines.USE_AMBIENT_LIGHT ++;
	// 	// 		// uniforms[`ambientLights[${lightIndex}].intensity`] = light.intensity;
	// 	// 		uniforms[`ambientLights[${lightIndex}].color`] = light.color.clone().multiplyScalar(light.intensity);
	// 	// 		// uniforms[`ambientLights[${lightIndex}].distance`] = 0.3;
	// 	//
	// 	// 	} else if (light.isDirectionalLight) {
	// 	// 		// 平行光
	// 	// 		const lightIndex = this.commonDefines.USE_DIRECTIONAL_LIGHT;
	// 	// 		this.commonDefines.USE_DIRECTIONAL_LIGHT ++;
	// 	// 		uniforms[`directionalLights[${lightIndex}].direction`] = light.direction;
	// 	// 		uniforms[`directionalLights[${lightIndex}].color`] = light.color.clone().multiplyScalar(light.intensity);
	// 	// 	}
	// 	// });
	// 	// 常规Blocks
	// 	this.commonBlocks.COMMON.uniforms = uniforms;
	//
	// 	this.commonBlocks.COMMON.needsUpdate = true;
	// }
	//

	// setProgram(material) {
	// 	this.programs.set(material);
	// }
	// setAttributes(geometry, material) {}
	// setUniforms() {}

	/**
	* 调用一个Mesh的绘制方法
	* @param  {THREE.Mesh} object
	* @param  {THREE.Geometry} geometry
	* @param  {THREE.Material} material
	* @param  {Object} group
	*/
	draw(object, geometry, material, group) {
		let dataCount = 0;

		if (geometry.index) {
            // drawElements
			dataCount = geometry.index.count;
		} else if (geometry.attributes.position) {
            // drawArrays
			dataCount = geometry.attributes.position.count;
		} else {
			// drawArrays 且无 position，那就随便选一个attributes
			const attrs = Object.keys(geometry.attributes);
			if (attrs.length === 0) {
				throw new Error('GL2::BufferGeometry must have one or more attributes');
			}

			dataCount = attrs[0][1].count;
		}

		// const group = null; // @NOTE: group对我们来说没啥必要
		const rangeFactor = 1;
		const rangeStart = geometry.drawRange.start * rangeFactor;
		const rangeCount = geometry.drawRange.count * rangeFactor;

		const groupStart = group !== null ? group.start * rangeFactor : 0;
		const groupCount = group !== null ? group.count * rangeFactor : Infinity;

		const drawStart = Math.max( rangeStart, groupStart );
		const drawEnd = Math.min(dataCount, rangeStart + rangeCount, groupStart + groupCount) - 1;

		const drawCount = Math.max( 0, drawEnd - drawStart + 1 );

		// console.log(dataCount, drawStart, drawCount);

		// console.log(dataCount, drawCount, type, drawStart * bytesPerElement);

		if ( drawCount === 0 ) return;

		let drawMode, tfMode;
		if (object.isMesh) {
			switch (object.drawMode) {
				case constants.TrianglesDrawMode:
					drawMode = this.gl.TRIANGLES;
					break;
				case constants.TriangleStripDrawMode:
					drawMode = this.gl.TRIANGLE_STRIP;
					break;
				case constants.TriangleFanDrawMode:
					drawMode = this.gl.TRIANGLE_FAN;
					break;
				default:
					console.error('unsupported drawMode:', object.drawMode);
			}
			tfMode = this.gl.TRIANGLES;
		} else if (object.isLine) {
			if (object.isLineSegments) {
				drawMode = this.gl.LINES;
			} else if (object.isLineLoop) {
				drawMode = this.gl.LINE_LOOP;
			} else {
				drawMode = this.gl.LINE_STRIP;
			}
			tfMode = this.gl.LINES;
		} else if (object.isPoints) {
			drawMode = this.gl.POINTS;
			tfMode = this.gl.POINTS;
		} else {
			throw new Error('暂时不支持的类型', object);
		}

		// transform feedback
		if (material.transformFeedback && geometry.index) {
			console.error('GL2::Shall not use index for TranformFeedback')
		}

		if (geometry.index) {
            // drawElements
			const index = this.attributes.get(geometry.index);

			if (!index) {
				console.error('注意！！！如果你看到这个bug，立刻截图，不要关掉页面，切换一个tab')
				console.log(object.name, geometry.id, material.name, material.type, geometry.index, this._currentGeometryId)
				debugger
				throw new Error('GL2:: 找不到index数据')
			}

			const type = index.type;
			const bytesPerElement = index.bytesPerElement;
			if (geometry.isInstancedBufferGeometry) {
				if (geometry.maxInstancedCount > 0) {
					this.gl.drawElementsInstanced(drawMode, drawCount, type, drawStart * bytesPerElement, geometry.maxInstancedCount);
				}
			} else {
				// debugger
				this.gl.drawElements(drawMode, drawCount, type, drawStart * bytesPerElement);
			}
		} else {
            // drawArrays
			if (geometry.isInstancedBufferGeometry) {
				if (geometry.maxInstancedCount > 0) {
					if (material.transformFeedback) {
						throw new Error('GL2::addFeedback:: 暂未支持 InterleavedBufferAttribute')
					}
					this.gl.drawArraysInstanced(drawMode, drawStart, drawCount, geometry.maxInstancedCount);
				}
			} else {
				if (material.transformFeedback) {
					this.state.beginTransformFeedback(tfMode);

					// 这里有可能出现下一轮读取的时候上一轮写入未完成的问题
					// 手工测试发现flush能够避免这种情况而fence没啥用

					// fence
					// const sync = this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
					// this.gl.waitSync(sync, 0, this.gl.TIMEOUT_IGNORED);
					// 根据 es_3.2_spec 4.1 DeleteSync 不影响sync的作用
					// this.gl.deleteSync(sync);

					this.gl.flush()
					// this.gl.finish()

					this.gl.drawArrays(drawMode, drawStart, drawCount);
					this.state.endTransformFeedback();
				} else {
					this.gl.drawArrays(drawMode, drawStart, drawCount);
				}
			}
		}
	}

	setViewport(x, y, width, height) {
		// this.viewport = [ x, this.height - y - height, width, height ]
		this.viewport = [ x, y, width, height ]
		this.state.setViewport( ...this.viewport );
	}

	setSize(width, height, updateStyle) {
		this.canvas.width = width
		this.canvas.height = height
		this.width = width
		this.height = height

		console.log(this.canvas.width)

		if ( updateStyle ) {

			this.canvas.style.width = width + 'px';
			this.canvas.style.height = height + 'px';

		}

		this.setViewport( 0, 0, width, height )
	}

	getSize() {
		return {
			height: this.canvas.height,
			width: this.canvas.width,
		}
	}

	getDrawingBufferSize() {
		return {
			height: this.canvas.height,
			width: this.canvas.width,
		}
	}

	setRenderTarget(renderTarget) {
		if (renderTarget !== this._currentRenderTarget) {
			this._currentRenderTarget = renderTarget;
			if (renderTarget) {
				this.renderTargets.set(renderTarget);
			} else {
				// @TODO: 这里应该避免重复操作，毕竟并不总是需要pass
				this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
				// this.gl.viewport(...this.viewport);
				this.state.setViewport(...this.viewport)
			}
		}
	}

	getRenderTarget() {
		return this._currentRenderTarget
	}

	setPixelRatio(v) {
		// this.ratio = v
		console.warn('TODO setPixelRatio')
	}
	getPixelRatio() {
		// return this.ratio
		return 1
	}

	clear(color, depth, stencil) {
		var bits = 0;

		if ( color === undefined || color ) bits |= this.gl.COLOR_BUFFER_BIT;
		if ( depth === undefined || depth ) bits |= this.gl.DEPTH_BUFFER_BIT;
		if ( stencil === undefined || stencil ) bits |= this.gl.STENCIL_BUFFER_BIT;

		this.gl.clear( bits );
	}


	// 向include库中注入自定义shader库
	injectShader(name, glsl) {
		this.programs.injectShader(name, glsl);
	}

	// 主动重制贴图单元（从0开始分配）
	resetTextureUnit() {
		this.textures.resetUnit();
	}

	getContext() {
		return this.gl;
	}

	getClearAlpha() {
		return (this.props.clearColor || [0, 0, 0, 1])[3]
	}

	setClearAlpha(alpha) {
		const colorOld = (this.props.clearColor || [0, 0, 0, 1])
		this.props.clearColor = [colorOld[0], colorOld[1], colorOld[2], alpha]
	}

	getClearColor() {
		const color = (this.props.clearColor || [0, 0, 0, 1])
		return {
			r: color[0],
			g: color[1],
			b: color[2],
		}
	}

	setClearColor(color) {
		const colorOld = (this.props.clearColor || [0, 0, 0, 1])
		this.props.clearColor = [color.r, color.g, color.b, colorOld[3]]
	}
}

/**
* helper：创建上下文
* @param  {Object} props 配置项
* @return {GLContext}
*/
function createContex(props) {
	const contextAttributes = {
		alpha: props.alpha !== undefined ? props.alpha : true,
		depth: props.depth !== undefined ? props.depth : true,
		stencil: props.stencil !== undefined ? props.stencil : false,
		antialias: props.antialias !== undefined ? props.antialias : true,
		premultipliedAlpha: props.premultipliedAlpha !== undefined ? props.premultipliedAlpha : true,
		preserveDrawingBuffer: props.preserveDrawingBuffer !== undefined ? props.preserveDrawingBuffer : false,
		powerPreference: props.powerPreference !== undefined ? props.powerPreference : 'default',
		desynchronized: props.desynchronized !== undefined ? props.desynchronized : false,
	};
	

	const gl = props.canvas.getContext('webgl2', contextAttributes);

	if (props.desynchronized && gl.getContextAttributes().desynchronized) {
		console.log('BETA: Low latency canvas supported.');
	} else {
		console.warn('Low latency canvas not supported.');
	}

	if ( gl === null ) {
		if ( props.canvas.getContext( 'webgl2' ) !== null ) {
			throw 'Error creating WebGL2 context with your selected attributes.';
		} else {
			throw 'Error creating WebGL2 context.';
		}
	}

	// @DEBUG
	// window.gl = gl;
	return gl;
}

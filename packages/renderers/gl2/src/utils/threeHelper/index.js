import {
	Vector2,
	Vector3,
	Vector4,
	Matrix4,
	Frustum,
	Box3,
	Sphere,

	ShaderChunk,
	ShaderLib,
	UniformsUtils,

	MeshDepthMaterial,
	MeshDistanceMaterial,
	DepthTexture,

	WebGLRenderTarget,

	BufferAttribute,
	BufferGeometry,
} from 'three'

// import { Vector2 } from './three/math/Vector2'
// import { Vector3 } from './three/math/Vector3'
// import { Vector4 } from './three/math/Vector4';
// import { Matrix4 } from './three/math/Matrix4'
// import { Frustum } from './three/math/Frustum'
// import { Box3 } from './three/math/Box3'
// import { Sphere } from './three/math/Sphere'

/**
 * 为了兼容Three顶层接口，也为了尽量复用THREE的源码，
 * 这里需要将THREE的一些内置类和接口export出去，
 * 实现一些THREE对自己类型的维护性工作，
 * 还需要对一些类进行一些改装。
 */

import * as constants from './three/constants';

import { WebGLRenderLists } from './three/renderers/webgl/WebGLRenderLists';
import { WebGLUtils } from './three/renderers/webgl/WebGLUtils';
import { WebGLState } from './three/renderers/webgl/WebGLState';
// import { WebGLAttributes } from './three/renderers/webgl/WebGLAttributes';
import { WebGLShader } from './three/renderers/webgl/WebGLShader';

// import { BufferAttribute } from './three/core/BufferAttribute';
// import { BufferGeometry } from './three/core/BufferGeometry';


// @NOTE: ↑不能直接使用，改造后的版本↓
import Converter from './Converter';

// import { ShaderChunk } from './three/renderers/shaders/ShaderChunk';
// import { ShaderLib } from './three/renderers/shaders/ShaderLib';
// import { UniformsUtils } from './three/renderers/shaders/UniformsUtils.js';

// import { MeshDepthMaterial } from './three/materials/MeshDepthMaterial';
// import { MeshDistanceMaterial } from './three/materials/MeshDistanceMaterial';
// import { DepthTexture } from './three/textures/DepthTexture';

import { WebGLRenderStates } from './three/renderers/webgl/WebGLRenderStates.js';

// import { WebGLRenderTarget } from './three/renderers/WebGLRenderTarget'

import { WebGLSpriteRenderer } from './three/renderers/webgl/WebGLSpriteRenderer';

export {
	constants,
	Converter,

	WebGLUtils,
	WebGLState,
	// WebGLAttributes,
	WebGLShader,

	Vector2,
	Vector3,
	Vector4,
	Matrix4,
	Box3,
	Sphere,
	Frustum,

	// WebGLClipping,
	BufferAttribute,
	BufferGeometry,
	ShaderChunk,
	ShaderLib,
	UniformsUtils,

	MeshDepthMaterial,
	MeshDistanceMaterial,
	DepthTexture,

	WebGLRenderTarget,
	WebGLSpriteRenderer,
}

/**
 * 精简THREE.WebGLRenderer中的一些*非绘制逻辑*
 * 主要是Scene的维护
 * 生成RenderList和Lights、Camera
 * GL2.Renderer中就只需要处理绘制逻辑
 * 详见 (GL绘图抽象模型)[https://lark.alipay.com/dtyyqd/2017d11-sum/gl_model]
 */
export default class ThreeProxy {
	constructor() {
		// THREE，用于给渲染物体排序
		this.renderLists = new WebGLRenderLists();
		this.currentRenderList;

		// THREE 用于将lights、shadow、sprite信息挑出来
		this.renderStates = new WebGLRenderStates();
		this.currentRenderStates;

		// 可视锥检测
		this.vector3 = new Vector3();
		this.projScreenMatrix = new Matrix4();
		this.frustum = new Frustum();
		// this.clipping = new WebGLClipping();
		// this.clippingPlanes = []; // THREE允许用户自定义剪裁面，暂不放接口
		// this.localClippingEnabled = false; // 暂不部署的THREE功能

	}

    /**
     * 每帧回之前调用，整理Scene和Camera中的信息，得到RenderList等绘制直接需要的对象列表
     * @param  {THREE.Scene} scene
     * @param  {THREE.Camera} camera
     */
	update(scene, camera) {
		// update scene graph
		if ( scene.autoUpdate === true ) scene.updateMatrixWorld();
		// update camera matrices and frustum
		if ( camera.parent === null ) camera.updateMatrixWorld();

		this.currentRenderState = this.renderStates.get( scene, camera );
		this.currentRenderState.init();

		// 剪裁面
		// TODO FIXME 如果渲染过程中用钩子调了另一个渲染，将导致这里的frustum不正确
		this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
		this.frustum.setFromMatrix(this.projScreenMatrix);

		this.currentRenderList = this.renderLists.get( scene, camera );
		this.currentRenderList.init();

		this.projectObject(scene, camera, true);

		this.currentRenderList.sort();

	}

	/**
	 * 对Three源码中projectObject的简化
	 * @param  {THREE.Object3D} object
	 * @param  {THREE.Camera} camera
	 * @param  {Bool} sortObjects
	 */
	projectObject( object, camera, sortObjects ) {

		if ( object.visible === false ) return;

		var visible = object.layers.test( camera.layers );

		if ( visible ) {

			if ( object.isLight ) {

				this.currentRenderState.pushLight( object );

				if ( object.castShadow ) {

					this.currentRenderState.pushShadow( object );

				}

			} else if ( object.isSprite ) {

				if ( ! object.frustumCulled || this.frustum.intersectsSprite( object ) ) {

					this.currentRenderState.pushSprite( object );

				}

			} else if ( object.isMesh || object.isLine || object.isPoints ) {

				// 面剪裁
				// if(object.frustumCulled && !this.frustum.intersectsObject(object)) return;
				if (object.frustumCulled) {
					if (object.frustumBoxCulled) {

						if ( object.geometry.boundingBox === null )
							object.geometry.computeBoundingBox();

						// 需要在外部处理matrix
						const box3 = new Box3();
						box3.copy(object.geometry.boundingBox)
							.applyMatrix4(object.matrixWorld);
						if (!this.frustum.intersectsBox(box3)) {
							return
						}
					} else {
						if (!this.frustum.intersectsObject(object)) {
							return
						}
					}
				}

				// 得到与相机的距离, 用来判断渲染顺序，THREE可以关闭，这里先不留接口
				// ref: sortObjects
				this.vector3.setFromMatrixPosition( object.matrixWorld )
					.applyMatrix4( this.projScreenMatrix );

				const geometry = object.geometry;
				const material = object.material;

                // 对Group的处理
                if (Array.isArray(material)) {

					geometry.groups.forEach(group => {
						const groupMaterial = material[group.materialIndex];
						if (groupMaterial && groupMaterial.visible) {
							this.currentRenderList.push(object, geometry, groupMaterial, this.vector3.z, group);
						}
					})

                } else {

					if ( material.visible ) {
						this.currentRenderList.push(object, geometry, material, this.vector3.z, null);
					}

                }


			}

		}

		const children = object.children;

		for ( let i = 0, l = children.length; i < l; i ++ ) {

			this.projectObject( children[ i ], camera, sortObjects );

		}

	}

	dispose() {
		this.renderLists.dispose()
	}
}

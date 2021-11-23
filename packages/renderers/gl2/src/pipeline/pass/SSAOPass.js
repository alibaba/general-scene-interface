// https://vanruesc.github.io/postprocessing/public/demo/#ssao
// https://github.com/vanruesc/postprocessing/blob/master/src/effects/glsl/ssao/shader.frag
// https://vanruesc.github.io/postprocessing/public/docs/file/src/effects/SSAOEffect.js.html

// https://github.com/tsherif/webgl2examples/blob/master/ssao.html
// http://codeflow.org/webgl/ssao/
// https://blog.csdn.net/puppet_master/article/details/83066572
// https://developer.download.nvidia.com/presentations/2008/SIGGRAPH/HBAO_SIG08b.pdf
// https://blog.csdn.net/puppet_master/article/details/82929708
// https://www.slideshare.net/DICEStudio/stable-ssao-in-battlefield-3-with-selective-temporal-filtering
// https://github.com/tiansijie/Tile_Based_WebGL_DeferredShader

// https://github.com/mattdesl/audiograph.xyz/blob/master/lib/shader/SSAOShader.js

// 简单 SSAO，只使用depth，加入一些技巧 
//      https://github.com/spite/Wagner/blob/master/fragment-shaders/ssao-simple-fs.glsl

// 标准SSAO，半球采样
//      https://github.com/McNopper/OpenGL/blob/master/Example28/shader/ssao.frag.glsl

import Pass from '../Pass';
import fs from './glsl/ssao_fs.glsl';
import vs from './glsl/ssao_vs.glsl';
import CanvasMesh from '../CanvasMesh';

const defaultConf = {
    normalBuffer: null,
    depthBuffer: null,
    input: null,
 
    rings: 4,
    bias: 0.643,
    scale: 1,
    radius: 20,
    samples: 14,
    luminanceInfluence: 0.7,
    distanceThreshold: 0.99,
    distanceFalloff: 0.04,
    rangeThreshold: 0.0015,
    rangeFalloff: 0.01,
};

export default class SSAOPass extends Pass {
    constructor(conf, THREE) {
        conf = { ...defaultConf, ...conf };
        super(conf, THREE);

        this.conf = conf;

        // const texelSize = new THREE.Vector2(1 / this.width, 1 / this.height);
        // const halfTexelSize = texelSize.clone().multiplyScalar(0.5);

        this.renderCamera = conf.renderCamera;

        this.aoTarget = new THREE.WebGLRenderTarget(this.width, this.height);

        this.aoScene = new THREE.Scene();
        this.uniforms = {
            // texelSize: { value: texelSize },
            // halfTexelSize: { value: halfTexelSize },
            tex: {value: conf.input},
            normalBuffer: { value: conf.normalBuffer },
            depthBuffer: { value: conf.depthBuffer },

            cameraNear: { value: 0 },
            cameraFar: { value: 0 },

            cameraProjectionMatrix: { value: new THREE.Matrix4() },
            cameraInverseProjectionMatrix: {value: new THREE.Matrix4()},

            bias: {value: conf.bias},
            seed: {value: Math.random()},
            scale: {value: conf.scale},
            luminanceInfluence: {value: conf.luminanceInfluence},
            radiusStep: {value: new THREE.Vector2(0.01, 0.01)},
            distanceCutoff: {value: new THREE.Vector2(0.6000, 1)},
            proximityCutoff: {value: new THREE.Vector2(0.0015, 0.0115)},
        }
        this.defines = {
            ANGLE_STEP: '1',
            SAMPLES_INT: '11',
            SAMPLES_FLOAT: '11.0',
        }

		this.aoMesh = new CanvasMesh({
            material: new THREE.ShaderMaterial({
                vertexShader: vs,
                fragmentShader: fs,
                uniforms: this.uniforms,
                defines: this.defines,
                name: 'SSAOPass',
            })
		}, THREE);
        this.aoScene.add(this.aoMesh.mesh);
        
		/**
		 * The current sampling radius.
		 *
		 * @type {Number}
		 * @private
		 */

		this.r = 0.0;

        this.samples = conf.samples;
        {
            const value = Math.floor(this.samples);

            this.defines.SAMPLES_INT = value.toFixed(0);
            this.defines.SAMPLES_FLOAT = value.toFixed(1);
            this.updateAngleStep();
            this.updateRadiusStep();
        }

        this.rings = conf.rings;
        {
            const value = Math.floor(this.rings);

            this.defines.RINGS_INT = value.toFixed(0);
            this.updateAngleStep();
        }

        this.radius = conf.radius;
        {
            this.r = this.radius;
            this.updateRadiusStep();
        }

        this.setDistanceCutoff(conf.distanceThreshold, conf.distanceFalloff);
        this.setProximityCutoff(conf.rangeThreshold, conf.rangeFalloff);

    }

    render(renderer) {

        this.uniforms.seed.value = Math.random();

        this.uniforms.cameraNear.value = this.renderCamera.near;
        this.uniforms.cameraFar.value = this.renderCamera.far;
        this.uniforms.cameraProjectionMatrix.value = this.renderCamera.projectionMatrix;
        this.uniforms.cameraInverseProjectionMatrix.value.getInverse(this.renderCamera.projectionMatrix);
        
        // debugger
        renderer.render(this.aoScene, this.camera, this.output);
    }

    /**
     * Updates the angle step constant.
     *
     * @private
     */
    updateAngleStep() {

        this.defines.ANGLE_STEP = (Math.PI * 2.0 * this.rings / this.samples).toFixed(11)

    }

    /**
     * Updates the radius step uniform.
     *
     * Note: The radius step is a uniform because it changes with the screen size.
     *
     * @private
     */
    updateRadiusStep() {

        const r = this.r / this.samples;
        this.uniforms.radiusStep.value.set(r / this.width, r / this.height);

    }

	/**
	 * Sets the occlusion distance cutoff.
	 *
	 * @param {Number} threshold - The distance threshold. Range [0.0, 1.0].
	 * @param {Number} falloff - The falloff. Range [0.0, 1.0].
	 */

	setDistanceCutoff(threshold, falloff) {

	    this.uniforms.distanceCutoff.value.set(threshold, Math.min(threshold + falloff, 1.0 - 1e-6));

	}

	/**
	 * Sets the occlusion proximity cutoff.
	 *
	 * @param {Number} threshold - The range threshold. Range [0.0, 1.0].
	 * @param {Number} falloff - The falloff. Range [0.0, 1.0].
	 */

	setProximityCutoff(threshold, falloff) {

	    this.uniforms.proximityCutoff.value.set(threshold, Math.min(threshold + falloff, 1.0 - 1e-6));

	}
}
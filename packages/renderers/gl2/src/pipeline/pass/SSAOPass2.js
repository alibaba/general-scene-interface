// version 0.1 初稿可用，一些视角上有bug
// 标准SSAO，半球采样
//      https://github.com/McNopper/OpenGL/blob/master/Example28/shader/ssao.frag.glsl
// TODO
//      - 倾斜平面被遮蔽（采样点理论深度和带锯齿的深度贴图进行对比）
//          - 尝试判断采样点对应深度像素是否和中心点过于接近
//          - 尝试判断 当前的采样半径是否会全部落入同一个像素中
//          - 相机near和far的突变会对这个效果造成影响
//      - 无深度像素的黑白闪烁 ✅ 阶段过远深度
//      - 超出边缘的应该放弃而不是clampToEdge

import Pass from '../Pass';
import fs from './glsl/ssao2_fs.glsl';
import vs from './glsl/ssao_vs.glsl';
import CanvasMesh from '../CanvasMesh';

const defaultConf = {
    normalBuffer: null,
    depthBuffer: null,
    input: null,

    radius: 10,

    KERNEL_SIZE: 16,
};

const randomKernel = []

for (let i = 0; i < 16; i++) {
    randomKernel.push(i / 16)
}

export default class SSAOPass extends Pass {
    constructor(conf, THREE) {
        conf = { ...defaultConf, ...conf };
        super(conf, THREE);

        this.conf = conf;

        const KERNEL_SIZE = this.conf.KERNEL_SIZE

        const ROTATION_NOISE_SIDE_LENGTH = 4
        const ROTATION_NOISE_SIZE = ROTATION_NOISE_SIDE_LENGTH * ROTATION_NOISE_SIDE_LENGTH
        const KERNEL = []
        // TODO 分布不均匀怎么办，应该写死一份
        for (let index = 0; index < KERNEL_SIZE; index++) {
            // 半立方体
            const samplePos = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                // 1, 0,
                Math.random(),
            )
            // 半球
            samplePos.normalize() // Normalize, so included in the hemisphere.
            // Create a scale value between [0, 1]
            let scale = index / KERNEL_SIZE
            // Adjust scale, that there are more values closer to the center of the g_kernel.
            scale = scale * scale * 0.9 + 0.1 // 比直接在0.1截断要更均匀
            samplePos.multiplyScalar(scale)

            KERNEL.push(samplePos)
        }

        // THREE的接口中不支持 rgb32f 作为 internalformat
        const ROTATION_NOISE = new Uint8Array(3 * ROTATION_NOISE_SIZE)
        for (let i = 0; i < ROTATION_NOISE_SIZE; i++)
        {
            const rotation = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                0, // Rotate on x-y-plane, so z is zero.
            )
            rotation.normalize() // Normalized rotation vector.

            ROTATION_NOISE[i * 3 + 0] = Math.floor(rotation.x * 255)
            ROTATION_NOISE[i * 3 + 1] = Math.floor(rotation.y * 255)
            ROTATION_NOISE[i * 3 + 2] = 0
        }

        const ROTATION_NOISE_TEX = new THREE.DataTexture(
            ROTATION_NOISE, 
            ROTATION_NOISE_SIDE_LENGTH,
            ROTATION_NOISE_SIDE_LENGTH,
            THREE.RGBFormat,
        )

        ROTATION_NOISE_TEX.magFilter = THREE.NearestFilter
        ROTATION_NOISE_TEX.minFilter = THREE.NearestFilter
        ROTATION_NOISE_TEX.wrapS = THREE.RepeatWrapping
        ROTATION_NOISE_TEX.wrapT = THREE.RepeatWrapping

        ROTATION_NOISE_TEX.needsUpdate = true

        // const texelSize = new THREE.Vector2(1 / this.width, 1 / this.height);
        // const halfTexelSize = texelSize.clone().multiplyScalar(0.5);

        this.renderCamera = conf.renderCamera;

        this.aoScene = new THREE.Scene();
        this.uniforms = {
            // texelSize: { value: texelSize },
            // halfTexelSize: { value: halfTexelSize },
            // tex: {value: conf.input},

            normalBuffer: { value: conf.normalBuffer },
            depthBuffer: { value: conf.depthBuffer },

            cameraNear: { value: 0 },
            cameraFar: { value: 0 },

            cameraProjectionMatrix: { value: new THREE.Matrix4() },
            cameraInverseProjectionMatrix: {value: new THREE.Matrix4()},

            u_kernel: {value: KERNEL},

            u_rotationNoiseScale: {value: new THREE.Vector2(
                1000 / ROTATION_NOISE_SIDE_LENGTH, 
                1000 / ROTATION_NOISE_SIDE_LENGTH
            )},
            u_rotationNoiseOffset: {value: new THREE.Vector2()},
            u_radius: {value: this.conf.radius},
            u_rotationNoiseTexture: {value: ROTATION_NOISE_TEX},

            // bias: {value: conf.bias},
            seed: {value: Math.random()},
            // scale: {value: conf.scale},
            // luminanceInfluence: {value: conf.luminanceInfluence},
            // radiusStep: {value: new THREE.Vector2(0.01, 0.01)},
            // distanceCutoff: {value: new THREE.Vector2(0.6000, 1)},
            // proximityCutoff: {value: new THREE.Vector2(0.0015, 0.0115)},

            randomKernel: {value: randomKernel},
        }
        this.defines = {
            KERNEL_SIZE,
            // CAP_MIN_DISTANCE: '0.0001',
            // CAP_MAX_DISTANCE: '0.005',
            CAP_MIN_DISTANCE: '1.0',
            CAP_MAX_DISTANCE: '50.0',
            // ANGLE_STEP: '1',
            // SAMPLES_INT: '11',
            // SAMPLES_FLOAT: '11.0',
        }

		this.aoMesh = new CanvasMesh({
            material: new THREE.ShaderMaterial({
                vertexShader: vs,
                fragmentShader: fs,
                uniforms: this.uniforms,
                defines: this.defines,
                name: 'SSAOPass2',
            })
		}, THREE);
        this.aoScene.add(this.aoMesh.mesh);

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
}
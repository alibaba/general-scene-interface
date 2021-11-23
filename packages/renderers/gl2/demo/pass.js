// 多pass渲染（后期）


import fac from "three-orbit-controls";

import GL2 from '../src/GL2';
const THREE = GL2.THREE;
const OrbitControls = fac(THREE);

const canvas = document.querySelector('canvas');
const WIDTH = 1920 / 2;
const HEIGHT = 1080 / 2;
canvas.style.width = WIDTH + 'px';
canvas.style.height = HEIGHT + 'px';
canvas.width = WIDTH;
canvas.height = HEIGHT;
import vs from './test0_vs.glsl';
import fs from './test0_fs.glsl';

// 初始化
const renderer = new GL2.Renderer({
	canvas,
	width: WIDTH,
	height: HEIGHT,
});

window.renderer = renderer;

// 🎬 场景、容器
const scene = new THREE.Scene();
const world = new THREE.Group();
scene.add(world);

// 📷 摄像！
const camera = new THREE.PerspectiveCamera(25, WIDTH / HEIGHT, 1, 1000);
camera.up.set(0, 0, 1);
camera.position.set(0, 0, 40);
camera.lookAt(0,0,0)

// 逻辑物体
const loader = new THREE.TextureLoader();
const texs = [
	loader.load('https://img.alicdn.com/tfs/TB1S8hni9_I8KJjy0FoXXaFnVXa-256-256.gif'),
	loader.load('https://img.alicdn.com/tfs/TB1xBveb4rI8KJjy0FpXXb5hVXa-4000-4000.png'),
	loader.load('https://img.alicdn.com/tfs/TB1YNT.bwvD8KJjy0FlXXagBFXa-500-501.png'),
	loader.load('https://img.alicdn.com/tfs/TB12Ee8b8fH8KJjy1XbXXbLdXXa-4000-4000.png'),
	loader.load('https://img.alicdn.com/tfs/TB1cXicbxrI8KJjy0FpXXb5hVXa-4000-4000.png'),
];
let pointer = 0;
let pointer1 = 1;
for (let i = 0; i < texs.length; i++) {
	texs[i].anisotropy = 8;
}
// const geom = new THREE.BoxBufferGeometry(10, 10, 10);
const geom = new THREE.TorusKnotBufferGeometry(1.5, 0.5, 100, 16);
const matr = new THREE.ShaderMaterial({
	vertexShader: vs,
	fragmentShader: fs,
	uniforms: {
		...THREE.UniformsLib.common,
		diffuse: {value: new THREE.Color('#581954')},
		tex: {value: texs[0]},
	},
	depthTest: true,
	depthWrite: true,
	transparent: true,
	lights: true,
});

const matr1 = matr.clone();
matr1.uniforms.diffuse.value = new THREE.Color('#013396');

window.geom = geom
window.matr = matr

setInterval(() => {
	pointer = pointer > texs.length - 2 ? 0 : pointer + 1;
	pointer1 = pointer1 > texs.length - 2 ? 0 : pointer1 + 1;
	matr.uniforms.tex.value = texs[pointer];
	matr1.uniforms.tex.value = texs[pointer1];
}, 1000);
const mesh = new THREE.Mesh(geom, matr);
mesh.position.x = -2;
mesh.position.y = -1;
mesh.renderOrder = 3;
world.add(mesh);

const mesh1 = new THREE.Mesh(geom, matr1);
mesh1.position.x = 2;
world.add(mesh1);

const geomCube = new THREE.BoxBufferGeometry(10, 10, 10, 1, 1, 1)
const matr2 = matr.clone();
matr2.uniforms.diffuse.value = new THREE.Color('#615214');
// matr2.side = THREE.BackSide;
const mesh2 = new THREE.Mesh(geomCube, matr2);
mesh2.position.z = -7
world.add(mesh2)

const mesh3 = mesh2.clone()
// world.add(mesh3)
mesh3.position.y = -7
mesh3.position.z = 0

const aLight = new THREE.AmbientLight(0x999999)
const light = new THREE.PointLight()
light.position.z = 20
world.add(light)
world.add(aLight)

// 后期
// import CanvasMesh from '../src/pipeline/CanvasMesh';
// import RenderTarget from '../src/core/RenderTarget';
//
// const renderTarget = new RenderTarget({
// 	width: 500,
// 	height: 500,
// });
//
// const simpleScene = new THREE.Scene();
// const canvasMesh = new CanvasMesh(renderTarget);
//
// const simpleCamera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0.1, 2 );
// simpleCamera.position.z = 1;
//
// simpleScene.add(canvasMesh.mesh);

const controls = new OrbitControls(camera, canvas);
//
import Pipeline from '../src/pipeline/Pipeline';
import Pass from '../src/pipeline/Pass';
import BlurPass from '../src/pipeline/pass/BlurPass';
import SSAOPass from '../src/pipeline/pass/SSAOPass';
import SSRPass from '../src/pipeline/pass/SSRPass';
import BilateralFiltelPass from '../src/pipeline/pass/BilateralFiltelPass';
import CombinePass from '../src/pipeline/pass/CombinePass';

import fs0 from './pass0_fs.glsl';
import combineFS from './combine_fs.glsl';

const renderTarget = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, {
	depthBuffer: true,
	// minFilter: THREE.NearestFilter,
});
// renderTarget.multisample = 4
renderTarget.mrt = 1
renderTarget.texture0 = renderTarget.texture;
for (let i = 0; i <= renderTarget.mrt; i++) {
	if (!renderTarget['texture' + i]) {
		renderTarget['texture' + i] = renderTarget.texture.clone();
	}
}
renderTarget.depthTexture = new THREE.DepthTexture(WIDTH, HEIGHT)

const pipeline = new Pipeline({renderer});
// pipeline.addPass({
// 	scene,
// 	camera,
// 	multisample: true,
// 	depth: true,
// 	width: WIDTH,
// 	height: HEIGHT,
// });

const copyPass = new Pass({
	width: WIDTH,
	height: HEIGHT,
}, THREE);
copyPass.canvasMesh.material.uniforms.tex.value = renderTarget.texture0;
// copyPass.canvasMesh.material.uniforms.tex.value = renderTarget.texture1;
// copyPass.canvasMesh.material.uniforms.tex.value = renderTarget.depthTexture;
//
// copyPass.setInput(renderTarget);
// //
// pipeline.addPass(copyPass);

const blurPass = new BlurPass({
	width: WIDTH,
	height: HEIGHT,
	kernel: 0,
}, THREE);

// blurPass.setInput(renderTarget);
blurPass.canvasMesh.material.uniforms.tex.value = renderTarget.texture;

// pipeline.addPass(blurPass);

// const inv = new THREE.Matrix4();
// camera.projectionMatrix.getInverse(inv)
const ssaoPass = new SSAOPass({
	width: WIDTH,
	height: HEIGHT,
	input: renderTarget.texture,
	normalBuffer: renderTarget.texture1,
	depthBuffer: renderTarget.depthTexture,

	renderCamera: camera,
}, THREE)

const aoTarget = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, {
	depthBuffer: false,
	stencilBuffer: false,
	// minFilter: THREE.NearestFilter,
});
ssaoPass.setOutput(aoTarget)

// const bfPass4ao = new BilateralFiltelPass({
// 	width: WIDTH,
// 	height: HEIGHT,

// 	normalBuffer: renderTarget.texture1,
// 	depthBuffer: renderTarget.depthTexture,
// }, THREE)

// ssaoPass.pipeTo(bfPass4ao)

const ssrPass = new SSRPass({
	width: WIDTH,
	height: HEIGHT,
	input: renderTarget.texture,
	normalBuffer: renderTarget.texture1,
	depthBuffer: renderTarget.depthTexture,

	renderCamera: camera,
}, THREE)

const bfPass = new BilateralFiltelPass({
	width: WIDTH,
	height: HEIGHT,

	normalBuffer: renderTarget.texture1,
	depthBuffer: renderTarget.depthTexture,
}, THREE)
const bfPass2 = new BilateralFiltelPass({
	width: WIDTH,
	height: HEIGHT,

	normalBuffer: renderTarget.texture1,
	depthBuffer: renderTarget.depthTexture,
}, THREE)

// ssrPass.pipeTo(bfPass)
// bfPass.pipeTo(bfPass2)

const ssrTarget = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, {
	depthBuffer: false,
	stencilBuffer: false,
	minFilter: THREE.NearestFilter,
});
ssrPass.setOutput(ssrTarget)
// bfPass.setOutput(ssrTarget)
// bfPass2.setOutput(ssrTarget)

const combinePass = new CombinePass({
	width: WIDTH,
	height: HEIGHT,
	
	tex: renderTarget.texture0,
	// tex: aoTarget.texture,
	// tex: ssrTarget.texture,
	add: [ssrTarget.texture],
	multi: [aoTarget.texture],
}, THREE);

// pipeline.addPass(new BlurPass({
// 	width: WIDTH,
// 	height: HEIGHT,
// 	kernel: 1,
// }))
//
// pipeline.addPass(new Pass({
// 	width: 1000,
// 	height: 1000,
// 	fs: combineFS,
// 	uniforms: {
// 		texOrigin: {value: renderTarget},
// 		mixParam: {value: 0.1},
// 	},
// }, THREE));

//
// pipeline.addPass({
// 	width: WIDTH,
// 	height: HEIGHT,
// });

window.pipeline = pipeline;

window.running = true

// 绘制
function tick() {
	if (!window.running) return
	
	// renderer.render(scene, camera);
	mesh.rotateX(0.01);
	mesh.rotateY(0.005);
    //
	// renderer.render(simpleScene, simpleCamera);

	// renderer.render(scene, camera);
	// debugger
	renderer.render(scene, camera, renderTarget);
	// renderer.render(scene, camera);
	// pipeline.render();
	// blurPass.render(renderer);
	// copyPass.render(renderer);

	ssaoPass.render(renderer);

	// bfPass4ao.render(renderer);

	ssrPass.render(renderer);

	// bfPass.render(renderer);
	// bfPass2.render(renderer);

	combinePass.render(renderer);

	requestAnimationFrame(tick);
}
tick();

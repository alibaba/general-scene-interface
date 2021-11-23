// import GL2 from '../src/GL2';
const THREE = GL2.THREE

const canvas = document.querySelector('canvas');
const WIDTH = 500;
const HEIGHT = 500;
canvas.style.width = WIDTH + 'px';
canvas.style.height = HEIGHT + 'px';
canvas.width = WIDTH;
canvas.height = HEIGHT;
import vs0 from './glsl/tf0.vs.glsl';
import fs0 from './glsl/tf0.fs.glsl';
import vs1 from './glsl/tf1.vs.glsl';
import fs1 from './glsl/tf1.fs.glsl';

// 初始化
const renderer = new GL2.Renderer({ canvas, width: WIDTH, height: HEIGHT, });
window.renderer = renderer;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();

// 初始化数据
const positions = new Float32Array([ -1.0, 1.0, -1.0, 0.8, -1.0, 0.6, -1.0, 0.4, -1.0, 0.2, -1.0, 0.0, -1.0, -0.2, -1.0, -0.4, -1.0, -0.6, -1.0, -0.8, -1.0, -1.0, ]);
const index = [];
for (let i = 0; i < positions.length / 2; i++) { index.push(i); }

// GP计算（Transform部分）
// GL2.decorateMaterial(THREE.RawShaderMaterial);
const gpMatr = new THREE.RawShaderMaterial({
    name: 'compute',
    vertexShader: vs0,
    fragmentShader: fs0,
    transformFeedback: true, // transform Program在编译连接时步骤比较特殊
    tfVaryings: ['v_position', 'v_position2'],
    rasterize: false, // 自身transform的同时也可以进行绘制
});
gpMatr.transformFeedback = true

const gpGeom = new THREE.BufferGeometry();
const tfAttr = new THREE.BufferAttribute(positions, 2);
const tfAttrOut = new THREE.BufferAttribute(positions, 2);
// gpGeom.addTransformFeedback('position', 'v_position', tfAttr);
gpGeom.addAttribute('position', tfAttr);
gpGeom.addFeedback('v_position', tfAttr);
gpGeom.addFeedback('v_position2', tfAttrOut);
// gpGeom.addFeedback('v_position', tfAttrOut);
// gpGeom.setIndex(index);

const gpPoints = new THREE.Points(gpGeom, gpMatr);
const gpPoints2 = new THREE.Points(gpGeom, gpMatr);
gpPoints.frustumCulled = false;
gpPoints2.frustumCulled = false;
scene.add(gpPoints);
// scene.add(gpPoints2);

// 绘制（Feedback部分）
const matr = new THREE.RawShaderMaterial({
    name: 'draw',
    vertexShader: vs1,
    fragmentShader: fs1,
});

const geom = new THREE.BufferGeometry();
geom.addAttribute('position', tfAttr);
geom.setIndex(index);

const points = new THREE.Points(geom, matr);
points.frustumCulled = false;
scene.add(points);

function tick() {
    renderer.render(scene, camera);
    // setTimeout(tick, 600);
    requestAnimationFrame(tick);
}
window.tick = tick
tick();
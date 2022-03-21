/* eslint-disable array-element-newline */
import { camera, renderer, timeline } from '../_util/GL2Renderer'
import { scene } from '../_util/GL2Scene'
import { AxesHelper } from '../_util/GSIAxesHelper'

import { DefaultConfig as GL2ConvConfig, GL2Converter } from '@gs.i/backend-gl2'
import { Mesh, Geom, MatrUnlit, MatrPbr } from '@gs.i/frontend-sdk'
import {
	buildBox,
	buildCircle,
	buildCylinder,
	buildPlane,
	buildRing,
	buildSphere,
	buildTorus,
} from '@gs.i/utils-geom-builders'

import { GLTF2Convertor } from '@gs.i/backend-gltf2'

import { THREE } from 'gl2'

/**
 * 使用 ts frontend 构建 gsi
 */

const group = new Mesh()

// Axes helper
const axes = new AxesHelper({ length: 10000 })
// group.add(axes)

/**
 * Building meshes
 */

// Box
const box = (window['box'] = new Mesh({
	name: 'box',
	geometry: new Geom(buildBox({ width: 10, height: 10, depth: 10, uv: true })),
	material: new MatrUnlit({
		baseColorFactor: { r: 1, g: 0, b: 1 },
		baseColorTexture: {
			sampler: {},
			image: { uri: 'https://img.alicdn.com/tfs/TB1UDHOcwoQMeJjy0FoXXcShVXa-286-118.png' },
		},
		alphaMode: 'BLEND',
	}),
	// transform: { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 0, 0, 1] },
}))
box.transform.position.x = 10
group.add(box)

// Sphere
const sphere = (window['sphere'] = new Mesh({
	name: 'sphere',
	geometry: new Geom(buildSphere({ radius: 5, normal: true, uv: true })),
	material: new MatrPbr({
		baseColorFactor: { r: 1, g: 1, b: 0 },
		baseColorTexture: {
			sampler: {},
			image: { uri: 'https://img.alicdn.com/tfs/TB1UDHOcwoQMeJjy0FoXXcShVXa-286-118.png' },
		},
		alphaMode: 'BLEND',
	}),
	// transform: { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 10, 0, 1] },
}))
sphere.transform.position.y = 10
// group.add(sphere)
const sphere2 = (window['sphere'] = new Mesh({
	name: 'sphere2',
	geometry: window['sphere'].geometry,
	material: new MatrPbr({
		baseColorFactor: { r: 1, g: 1, b: 0 },
		baseColorTexture: {
			sampler: {},
			image: { uri: 'https://img.alicdn.com/tfs/TB1UDHOcwoQMeJjy0FoXXcShVXa-286-118.png' },
		},
		alphaMode: 'BLEND',
	}),
	// transform: { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 10, 0, 1] },
}))
sphere2.transform.position.y = 20
// group.add(sphere2)

// Plane
const plane = (window['plane'] = new Mesh({
	name: 'plane',
	geometry: new Geom(buildPlane({ width: 10, height: 10, uv: true })),
	material: new MatrUnlit({
		baseColorFactor: { r: 0, g: 1, b: 1 },
		baseColorTexture: {
			sampler: {},
			image: { uri: 'https://img.alicdn.com/tfs/TB1UDHOcwoQMeJjy0FoXXcShVXa-286-118.png' },
		},
		alphaMode: 'OPAQUE',
	}),
	// transform: { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, 10, 0, 1] },
}))
plane.transform.position.x = 10
plane.transform.position.y = 10
// group.add(plane)

// Ring
const ring = (window['ring'] = new Mesh({
	name: 'ring',
	geometry: new Geom(buildRing({ innerRadius: 2.5, outerRadius: 5, normal: true })),
	material: new MatrUnlit({ baseColorFactor: { r: 1, g: 0.5, b: 0.5 } }),
	// transform: { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 20, 0, 1] },
}))
ring.transform.position.x = 20
// group.add(ring)

// Circle
const circle = (window['circle'] = new Mesh({
	name: 'circle',
	geometry: new Geom(buildCircle({ radius: 5 })),
	material: new MatrUnlit({ baseColorFactor: { r: 0.5, g: 1, b: 0.5 } }),
	// transform: { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 20, 0, 0, 1] },
}))
circle.transform.position.y = 20
// group.add(circle)

// Cylinder
const cylinder = (window['cylinder'] = new Mesh({
	name: 'cylinder',
	geometry: new Geom(
		buildCylinder({ radiusTop: 2.5, radiusBottom: 5, height: 10, normal: true, uv: true })
	),
	material: new MatrPbr({
		baseColorFactor: { r: 0.5, g: 0.5, b: 1 },
		// baseColorTexture: {
		// 	sampler: {},
		// 	image: { uri: 'https://img.alicdn.com/tfs/TB1UDHOcwoQMeJjy0FoXXcShVXa-286-118.png' },
		// },
		// alphaMode: 'BLEND',
	}),
	// transform: { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
}))
// group.add(cylinder)

// Torus
const torus = (window['torus'] = new Mesh({
	name: 'torus',
	geometry: new Geom(
		buildTorus({
			radius: 5,
			tube: 2.5,
			radialSegments: 16,
			tubularSegments: 50,
			normal: true,
		})
	),
	material: new MatrPbr({ baseColorFactor: { r: 0.5, g: 0.5, b: 0.5 } }),
	// transform: { matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 20, 20, 0, 1] },
}))
torus.transform.position.x = 20
torus.transform.position.z = 20
// group.add(torus)

/**
 * Converter
 */
const converter = new GL2Converter(GL2ConvConfig)
const conv = new GLTF2Convertor()

// // 渲染逻辑
// scene.add(converter.convert(group))

// timeline.addTrack({
// 	id: '绘制循环',
// 	duration: Infinity,
// 	onUpdate: () => {
// 		converter.convert(group)
// 		renderer.render(scene, camera)
// 	},
// })

// timeline.play()

window['group'] = group
window['axes'] = axes
window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['THREE'] = THREE

window['glm'] = conv.convert(group)
// conv.composeBuffer(window['glm'])
console.log(window['glm'])

// const [gltf, buffer] = conv.glmToGLTF(window['glm'])
// console.log([gltf, buffer])
// window['download'](gltf, 'a.gltf')
// window['download'](buffer, 'buf.bin')

// const buf = conv.glmToGLB(window['glm'])
const buf = conv.glmToGLBTubor(window['glm'])
window['download'](buf, 'a.glb')

const temp: any[] = []
const cnt = 1000

console.time('convert x1000')
for (let i = 0; i < cnt; i++) {
	temp.push(conv.convert(group))
}
console.timeEnd('convert x1000')

console.time('glb x1000')
for (let i = 0; i < cnt; i++) {
	conv.glmToGLB(temp[i])
}
console.timeEnd('glb x1000')

// 重新生成
// console.time('reconvert x1000')
for (let i = 0; i < cnt; i++) {
	temp[i] = conv.convert(group)
}
// console.timeEnd('reconvert x1000')

console.time('glbTubor x1000')
for (let i = 0; i < cnt; i++) {
	conv.glmToGLBTubor(temp[i])
}
console.timeEnd('glbTubor x1000')

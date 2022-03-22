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

import { THREE } from 'gl2'
import { GSIRefiner, DefaultConfig as RefinerConfig } from '@gs.i/utils-optimize'
import { genBBoxWireframe, genBSphereWireframe } from '@gs.i/utils-geometry'
import { BBox, BSphere } from '@gs.i/schema'

/**
 * 使用 ts frontend 构建 gsi
 */

const group = new Mesh()

// Axes helper
const axes = new AxesHelper({ length: 10000 })
group.add(axes)

/**
 * Building meshes
 */

const imageUri =
	'https://img.alicdn.com/imgextra/i3/O1CN01RbMgmM1DWAzg60GCD_!!6000000000223-0-tps-1024-1024.jpg'

// Box
const box = (window['box'] = new Mesh({
	name: 'box',
	geometry: new Geom(buildBox({ width: 10, height: 10, depth: 10, uv: true })),
	material: new MatrUnlit({
		baseColorFactor: { r: 1, g: 0, b: 1 },
		baseColorTexture: {
			sampler: {},
			image: { uri: imageUri },
		},
		alphaMode: 'BLEND',
	}),
}))
box.transform.position.x = 20
group.add(box)

// Sphere
const sphere = (window['sphere'] = new Mesh({
	name: 'sphere',
	geometry: new Geom(buildSphere({ radius: 5, normal: true, uv: true })),
	material: new MatrPbr({
		baseColorFactor: { r: 1, g: 1, b: 0 },
		baseColorTexture: {
			sampler: {},
			image: { uri: imageUri },
		},
		alphaMode: 'BLEND',
	}),
}))
sphere.transform.position.y = 20
group.add(sphere)

// Plane
const plane = (window['plane'] = new Mesh({
	name: 'plane',
	geometry: new Geom(
		buildPlane({ width: 10, height: 10, widthSegments: 10, heightSegments: 10, uv: true })
	),
	material: new MatrUnlit({
		baseColorFactor: { r: 0, g: 1, b: 1 },
		baseColorTexture: {
			sampler: {},
			image: { uri: imageUri },
		},
		alphaMode: 'OPAQUE',
		// depthTest: false,
	}),
}))
plane.transform.position.x = 20
plane.transform.position.y = 20
group.add(plane)

// Ring
const ring = (window['ring'] = new Mesh({
	name: 'ring',
	geometry: new Geom(
		buildRing({
			innerRadius: 2,
			outerRadius: 5,
			thetaSegments: 10,
			phiSegments: 2,
			normal: true,
			uv: true,
		})
	),
	material: new MatrUnlit({
		// baseColorFactor: { r: 1, g: 0.5, b: 0.5 },
		baseColorTexture: {
			image: {
				uri: imageUri,
				flipY: true,
			},
			sampler: {},
		},
	}),
}))
ring.transform.position.x = -20
group.add(ring)

// Circle
const circle = (window['circle'] = new Mesh({
	name: 'circle',
	geometry: new Geom(buildCircle({ radius: 5, segments: 20, normal: true })),
	material: new MatrPbr({ baseColorFactor: { r: 0.5, g: 1, b: 0.5 } }),
}))
circle.transform.position.y = -20
group.add(circle)

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
		// 	image: { uri: imageUri },
		// },
		// alphaMode: 'BLEND',
	}),
}))
group.add(cylinder)

// Torus
const torus = (window['torus'] = new Mesh({
	name: 'torus',
	geometry: buildTorus({
		radius: 5,
		tube: 2.5,
		radialSegments: 16,
		tubularSegments: 50,
		normal: true,
	}),
	material: new MatrPbr({ baseColorFactor: { r: 0.5, g: 0.5, b: 0.5 } }),
}))
torus.transform.position.x = -20
torus.transform.position.y = -20
group.add(torus)

/**
 * BBox helper
 */
const helpers: Mesh[] = []
group.children.forEach((mesh) => {
	if (!mesh.geometry || !mesh.geometry.boundingBox) {
		return
	}
	const helper1 = new Mesh({
		name: 'BBoxHelper-' + mesh.name,
		geometry: genBBoxWireframe(mesh.geometry.boundingBox as BBox),
		material: new MatrUnlit({ baseColorFactor: { r: 0.1, g: 1, b: 0.1 } }),
	})
	helper1.transform.matrix = Array.from(mesh.transform.matrix)
	helpers.push(helper1)

	const helper2 = new Mesh({
		name: 'BSphereHelper-' + mesh.name,
		geometry: genBSphereWireframe(mesh.geometry.boundingSphere as BSphere),
		material: new MatrUnlit({ baseColorFactor: { r: 0.6, g: 0.6, b: 0.6 } }),
	})
	helper2.transform.matrix = Array.from(mesh.transform.matrix)
	helpers.push(helper2)
})
helpers.forEach((helper) => group.add(helper))

/**
 * Converter
 */
const refiner = new GSIRefiner(RefinerConfig)
const converter = new GL2Converter(GL2ConvConfig)

// 渲染逻辑
scene.add(converter.convert(group))

timeline.config.ignoreErrors = false
timeline.addTrack({
	id: '绘制循环',
	duration: Infinity,
	onUpdate: (t) => {
		refiner.update(group, {
			cameraPosition: camera.position,
			cameraRotation: camera.rotation,
			cameraNear: camera.near,
			cameraAspect: camera.aspect,
			cameraFOV: camera.fov,
			cameraFar: camera.far,
		})
		converter.convert(group)
		renderer.render(scene, camera)
	},
})

timeline.play()

/**
 * Pressure test
 */
for (let i = 0; i < 0; i++) {
	// Plane
	const plane = (window['plane'] = new Mesh({
		name: 'plane',
		geometry: new Geom(
			buildPlane({
				width: 100,
				height: 100,
				widthSegments: 700,
				heightSegments: 600,
				normal: true,
				uv: true,
			})
		),
		material: new MatrUnlit({
			baseColorFactor: { r: 0, g: 1, b: 1 },
			baseColorTexture: {
				sampler: {},
				image: { uri: imageUri },
			},
			alphaMode: 'OPAQUE',
			// depthTest: false,
		}),
	}))
	plane.transform.position.x = Math.random() * 200 - 100
	plane.transform.position.y = Math.random() * 200 - 100
	plane.transform.position.z = Math.random() * 20
	group.add(plane)
}

window['group'] = group
window['axes'] = axes
window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['converter'] = converter
window['renderer'] = renderer
window['refiner'] = refiner
window['THREE'] = THREE
window['release'] = () => {
	group.children.forEach((mesh) => group.remove(mesh))
}

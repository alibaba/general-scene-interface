/* eslint-disable array-element-newline */
import { camera, renderer, timeline } from '../_util/GL2Renderer'
import { scene } from '../_util/GL2Scene'
import { AxesHelper } from '../_util/GSIAxesHelper'

import { DefaultConfig as GL2ConvConfig, GL2Converter } from '@gs.i/backend-gl2'
import { Mesh, Geom, MatrUnlit } from '@gs.i/frontend-sdk'
import { buildPlane } from '@gs.i/utils-geom-builders'

import { THREE } from 'gl2'
import { GSIRefiner, DefaultConfig as RefinerConfig } from '@gs.i/utils-optimize'

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

/**
 * Pressure test
 */
for (let i = 0; i < 10; i++) {
	// Plane
	const plane = new Mesh({
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
	})
	plane.transform.position.x = Math.random() * 200 - 100
	plane.transform.position.y = Math.random() * 200 - 100
	plane.transform.position.z = Math.random() * 20
	group.add(plane)
}
console.log('Mesh created')

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
 * Release memory test
 */
const release = () => {
	console.log('Release memory')
	group.children.forEach((mesh) => {
		if (mesh.geometry) {
			group.remove(mesh)
		}
	})
}

window['group'] = group
window['axes'] = axes
window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['THREE'] = THREE
window['refiner'] = refiner
window['converter'] = converter
window['release'] = release

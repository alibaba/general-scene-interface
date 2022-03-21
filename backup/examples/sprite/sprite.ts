import { THREE } from 'gl2'
import { DefaultConfig as GL2ConvConfig, GL2Converter } from '@gs.i/backend-gl2'
import * as SDK from '@gs.i/frontend-sdk'
import { buildPlane } from '@gs.i/utils-geom-builders'
import { GSIRefiner, DefaultConfig as RefinerConfig } from '@gs.i/utils-optimize'

// 标准之外
import { camera, renderer, timeline } from '../_util/GL2Renderer'
import { scene } from '../_util/GL2Scene'
import { AxesHelper } from '../_util/GSIAxesHelper'

const url = 'https://img.alicdn.com/tfs/TB1UDHOcwoQMeJjy0FoXXcShVXa-286-118.png'

const group = new SDK.Mesh()

// Axes helper
group.add(new AxesHelper({ length: 10000 }))

// Box mesh
const mesh = new SDK.Mesh({
	name: 'Box',
	geometry: buildPlane({ width: 10, height: 10, widthSegments: 1, heightSegments: 1 }),
	material: new SDK.MatrUnlit({
		baseColorFactor: { r: 1, g: 0, b: 1 },
		side: 'double',
		alphaMode: 'BLEND',
	}),
})
mesh.transform.position.set(0, 0, 10)

group.add(mesh)

// Sprite with attenuation
const sprite1 = new SDK.Mesh({ name: 'sprite-attenuation', renderOrder: 999 })
sprite1.geometry = new SDK.Geom({
	mode: 'SPRITE',
	attributes: {
		position: new SDK.Attr(new Float32Array([0, 0, 10, 10, 0, 0, 0, 10, 0, -10, -10, 0]), 3),
		size: new SDK.Attr(new Float32Array([4.5, 1.5, 2.5, 2.0, 4.0, 8.0, 2.5, 2.5]), 2),
	},
})
const material1 = new SDK.MatrSprite({
	alphaMode: 'BLEND',
	baseColorTexture: {
		image: { uri: url },
		sampler: { minFilter: 'LINEAR_MIPMAP_NEAREST' },
	},
	baseColorFactor: { r: 0.5, g: 1.0, b: 0.5 },
	sizeAttenuation: true,
	center: { x: 0.0, y: 0.0 },
	// size: { x: 4.5, y: 1.5 },
	useAttrSize: true,
	opacity: 1.0,
	attributes: {
		aSize: 'vec2',
	},
})
sprite1.material = material1
group.add(sprite1)

// Sprite without attenuation
const sprite2 = new SDK.Mesh({ name: 'sprite-no-attenuation' })
sprite2.geometry = new SDK.Geom({
	mode: 'SPRITE',
	attributes: {
		position: new SDK.Attr(new Float32Array([10, 10, 10, 10, 10, 0]), 3),
		// custom attr
		custom: new SDK.Attr(new Uint8Array([127, 0, 127, 0, 255, 0]), 3, true),
	},
})
const material2 = new SDK.MatrSprite({
	alphaMode: 'BLEND',
	baseColorTexture: {
		image: { uri: url, flipY: true },
		sampler: {},
	},
	baseColorFactor: { r: 1, g: 1, b: 1 },
	sizeAttenuation: false,
	size: { x: 0.05, y: 0.05 },
	rotation: Math.PI / 4,
	opacity: 0.9,
	attributes: {
		custom: 'vec3',
	},
	varyings: {
		vCustom: 'vec3',
	},
	vertOutput: `
		vCustom = custom;
	`,
	preFrag: `
		const vec2 center = vec2(0.5);
	`,
	fragColor: `
		float dist = distance( vUv, center );
		if (dist < 0.4) {
			fragColor.xyz *= vCustom;
		}
	`,
})
sprite2.material = material2
group.add(sprite2)

//

const converter = new GL2Converter(GL2ConvConfig)
const refiner = new GSIRefiner(RefinerConfig)

// 渲染逻辑
scene.add(converter.convert(group))

timeline.addTrack({
	id: '绘制循环',
	duration: Infinity,
	onUpdate: (t, p) => {
		// material.rotation += 0.1
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

		// Animation
		;(sprite2.material as SDK.MatrSprite).rotation += 0.01
	},
})

timeline.play()

window['sprite1'] = sprite1
window['sprite2'] = sprite2
window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['THREE'] = THREE

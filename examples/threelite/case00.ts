/* eslint-disable array-element-newline */
import { DefaultConfig as LiteConvConfig, ThreeLiteConverter } from '@gs.i/backend-threelite'
import * as SDK from '@gs.i/frontend-sdk'
import { buildBox, buildSphere } from '@gs.i/utils-geom-builders'
import { GSIRefiner, DefaultConfig as RefinerConfig } from '@gs.i/utils-optimize'

import { CONTAINER, camera, renderer, timeline, WIDTH, HEIGHT } from '../_util/LiteRenderer'
import { scene } from '../_util/LiteScene'
import { AxesHelper } from '../_util/GSIAxesHelper'
import { GLine } from '@gs.i/utils-gline'

/**
 * 使用 ts frontend 构建 gsi
 */
const url = 'https://img.alicdn.com/tfs/TB1UDHOcwoQMeJjy0FoXXcShVXa-286-118.png'

const group = new SDK.Mesh()

// Line mesh
const axes = new AxesHelper({ length: 10000 })
group.add(axes)

// basic mesh
const box = new SDK.Mesh({
	name: 'Box',
	geometry: buildBox({ width: 20, height: 20, depth: 20, uv: true }),
	material: new SDK.MatrUnlit({
		baseColorFactor: { r: 1, g: 0, b: 1 },
		// baseColorTexture: {
		// 	image: { uri: url },
		// 	sampler: {},
		// },
	}),
})
group.add(box)

// pbr mesh
const sphere = new SDK.Mesh({
	name: 'Sphere',
	geometry: buildSphere({
		radius: 10,
		widthSegments: 20,
		heightSegments: 20,
		// normal: true,
		uv: true,
	}),
	material: new SDK.MatrPbr({
		baseColorFactor: { r: 1, g: 0, b: 1 },
		// baseColorTexture: {
		// 	image: { uri: url },
		// 	sampler: {},
		// },
		metallicFactor: 0.6,
		roughnessFactor: 0.1,
		fragGeometry: `
		vec3 fdx = vec3( dFdx( modelViewPosition.x ), dFdx( modelViewPosition.y ), dFdx( modelViewPosition.z ) );
		vec3 fdy = vec3( dFdy( modelViewPosition.x ), dFdy( modelViewPosition.y ), dFdy( modelViewPosition.z ) );
		normal = normalize( cross( fdx, fdy ) );
		`,
		preLighting: ``,
	}),
})
sphere.transform.position.set(30, 0, 0)
group.add(sphere)

// Sprite mesh
const sprite = new SDK.Mesh({
	name: 'sprite-attenuation',
	geometry: new SDK.Geom({
		mode: 'SPRITE',
		attributes: {
			position: new SDK.Attr(new Float32Array([0, 0, 30, 40, 0, 0, 0, 40, 0]), 3),
			size: new SDK.Attr(new Float32Array([0.1, 0.015, 0.05, 0.075, 0.05, 0.02]), 2),
		},
	}),
	material: new SDK.MatrSprite({
		alphaMode: 'BLEND',
		baseColorTexture: {
			image: { uri: url },
			sampler: { minFilter: 'LINEAR_MIPMAP_NEAREST' },
		},
		baseColorFactor: { r: 0.0, g: 1.0, b: 0.5 },
		sizeAttenuation: false,
		// size: { x: 0.05, y: 0.05 },
		useAttrSize: true,
		opacity: 1.0,
	}),
})
group.add(sprite)

// gline
const gline = new GLine({
	level: 2,
	dynamic: true,
	u: true,
	color: { r: 1, g: 0.4, b: 0.1 },
	opacity: 0.9,
	lineWidth: 10.0,
	usePerspective: true,
	resolution: { x: WIDTH, y: HEIGHT },
	useColors: true,
	texture: undefined,
	// texture: {
	// 	image: { uri: 'https://img.alicdn.com/tfs/TB1fNL.awDD8KJjy0FdXXcjvXXa-24-527.png' },
	// 	sampler: {},
	// },
	pointSize: 10,
	infinity: 99999999.999,
	depthTest: true,
	renderOrder: 0,
})

const positions = [
	[20, 20, 20, 20, -30, -30, -10, -10, 50],
	[25, 25, 25, 10, 30, 30, 50, 50, 50],
]
const colors = [
	[0, 0, 1, 1, 1, 1, 1, 0.8, 1, 0, 1, 0.6],
	[0, 1, 0, 1, 1, 0.3, 0.3, 1, 0, 0, 0.1, 1],
]

gline.geometry.updateData({ positions, colors })
group.add(gline)

setTimeout(() => {
	// 更新数据
	// offset: position count偏移
	// length: position count个数
	console.log('GLine: updateSubData')
	gline.geometry.attributes.color.updateRanges = undefined
	gline.geometry.updateSubData(
		{
			colors: [0.5, 0.5, 1.0, 1.0, 0.5, 0.5, 1.0, 1.0, 0.5, 0.5, 1.0, 1.0],
		},
		3,
		3
	)
	console.log(gline.geometry)
}, 2000)

//

const converter = new ThreeLiteConverter(LiteConvConfig)
const refiner = new GSIRefiner(RefinerConfig)

// 渲染逻辑
scene.add(converter.convert(group))

timeline.addTrack({
	id: '绘制循环',
	duration: Infinity,
	onUpdate: () => {
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
timeline.config.ignoreErrors = false
timeline.play()

window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['converter'] = converter
window['refiner'] = refiner

import { THREE } from 'gl2'
import { DefaultConfig as ConvConfig, GL2Converter } from '@gs.i/backend-gl2'
// import { DefaultConfig as ConvConfig, ThreeLiteConverter } from '@gs.i/backend-threelite'
import { Mesh } from '@gs.i/frontend-sdk'
import { GSIRefiner, DefaultConfig as RefinerConfig } from '@gs.i/utils-optimize'
import { GLine } from '@gs.i/utils-gline'

// 标准之外
import { camera, renderer, timeline, WIDTH, HEIGHT } from '../_util/GL2Renderer'
import { scene } from '../_util/GL2Scene'
// import { camera, renderer, timeline, WIDTH, HEIGHT } from '../util/LiteRenderer'
// import { scene } from '../util/LiteScene'
import { AxesHelper } from '../_util/GSIAxesHelper'

const url = 'https://img.alicdn.com/tfs/TB1UDHOcwoQMeJjy0FoXXcShVXa-286-118.png'

const group = new Mesh()

// Axes helper
group.add(new AxesHelper({ length: 10000 }))

// gline
const gline = new GLine({
	level: 2,
	dynamic: true,
	u: true,
	color: { r: 1, g: 0.4, b: 0.1 },
	opacity: 1.0,
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
	// transparent: false,
	alphaTest: 0.3,
})
const geom = gline.geometry
const matr = gline.material

console.log(geom, matr, gline)

const positions = [
	[0, 0, 0, 0, -10, -10, -30, -30, 30],
	[2, 2, 2, -10, 10, 10, 30, 30, 30],
]

const colors = [
	[0, 0.5, 0.5, 1, 1, 1, 1, 0.5, 1, 0, 1, 0],
	[1, 1, 1, 0.2, 1, 1, 1, 1, 1, 0, 1, 0.1],
]

// 全量更新数据，同时更新线段结构和长度
// 重新填充所有数据，通过对比来决定是否重新生成index、side、u
setTimeout(() => {
	geom.updateData({ positions, colors })
}, 100)

// 选择数据更新，不重新生成index、side、u
// geom.updateSubData({ positions }, offset, length)

// @NOTE: 应该允许传入TypedArray数据然后通过传入分段位置来设置线段
//          如果只能传入二维数组来设置线段，将无法放入WASM中，因为WASM无法接受数组
// geom.updateSegments([4, 5, 4])

const positions2 = [[20, 20, 20]]
const colors2 = [[0, 1, 0, 0.5]]
setTimeout(() => {
	// 更新数据
	// offset: position count偏移
	// length: position count个数
	console.log('GLine: updateSubData')
	// geom.updateSubData({ positions: positions2, colors: colors2 }, 1, 1)
	geom.attributes.color.updateRanges = undefined
	geom.updateSubData(
		{
			colors: [0.5, 0.5, 1.0, 1.0, 0.5, 0.5, 1.0, 0.1, 0.5, 0.5, 1.0, 1.0],
		},
		3,
		3
	)
	console.log(geom, matr, gline)
}, 2000)

//
group.add(gline)

const converter = new GL2Converter(ConvConfig)
// const converter = new ThreeLiteConverter(ConvConfig)
const refiner = new GSIRefiner(RefinerConfig)

// 渲染逻辑
refiner.update(group, {
	cameraPosition: camera.position,
	cameraRotation: camera.rotation,
	cameraNear: camera.near,
	cameraAspect: camera.aspect,
	cameraFOV: camera.fov,
	cameraFar: camera.far,
})
scene.add(converter.convert(group))

timeline.addTrack({
	id: '绘制循环',
	duration: Infinity,
	onUpdate: (t, p) => {
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

timeline['config'].ignoreErrors = false

timeline.play()

window['mesh'] = gline
window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['refiner'] = refiner
window['THREE'] = THREE

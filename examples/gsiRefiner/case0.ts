import { buildSphere } from '@gs.i/utils-geom-builders'
import { DefaultConfig as GL2ConvConfig, GL2Converter } from '@gs.i/backend-gl2'
import { DefaultConfig as ThreeLiteConvConfig, ThreeLiteConverter } from '@gs.i/backend-threelite'
import * as SDK from '@gs.i/frontend-sdk'
import { GSIRefiner, DefaultConfig as RefinerConfig } from '@gs.i/utils-optimize'

// 标准之外
import { camera, renderer, timeline, WIDTH, HEIGHT } from '../_util/GL2Renderer'
import { scene } from '../_util/GL2Scene'
import { AxesHelper } from '../_util/GSIAxesHelper'

/**
 * 使用 ts frontend 和 geomBuilder 构建 gsi，并使用transform做动画
 */

const group = new SDK.Mesh()

timeline.config.ignoreErrors = false
timeline.config.openStats = true

// Axes helper
// group.add(new AxesHelper({ length: 10000 }))

//
// const subGroup = new SDK.Mesh()
// group.add(subGroup)
// const arr: SDK.Mesh[] = []

const meshCount = 4000
const depth = 10
const groups: SDK.Mesh[] = []
groups.push(group)
for (let i = 0; i < depth; i++) {
	const lastGroup = groups[groups.length - 1]
	const newGroup = new SDK.Mesh()
	lastGroup.add(newGroup)
	groups.push(newGroup)

	for (let j = 0; j < meshCount / depth; j++) {
		const geom = buildSphere({
			radius: 1,
			widthSegments: 40,
			heightSegments: 20,
			normal: true,
			uv: true,
		})
		const mesh = new SDK.Mesh({
			geometry: geom,
			material: new SDK.MatrPbr(),
		})
		mesh.transform.position.set(
			Math.random() * 100 - 50,
			Math.random() * 100 - 50,
			Math.random() * 100
		)
		lastGroup.add(mesh)
	}
}

const converter = new GL2Converter(GL2ConvConfig)
const refiner = new GSIRefiner(RefinerConfig)
converter.config.meshFrustumCulling = false
refiner.config.frustumCulling = false

// 渲染逻辑
scene.add(converter.convert(group))

timeline.addTrack({
	id: '绘制循环',
	duration: Infinity,
	onUpdate: (t, p) => {
		const t1 = performance.now()
		refiner.update(group, {
			cameraPosition: camera.position,
			cameraRotation: camera.rotation,
			cameraNear: camera.near,
			cameraAspect: camera.aspect,
			cameraFOV: camera.fov,
			cameraFar: camera.far,
		})
		converter.convert(group)
		const t2 = performance.now()

		// renderer.render(scene, camera)
		const t3 = performance.now()

		group.transform.rotation.x += 0.1
		group.transform.rotation.y += 0.1

		// if (Math.random() < 0.2 && arr.length > 0) {
		// 	const meshes: SDK.Mesh[] = []
		// 	for (let i = 0; i < Math.random() * 10; i++) {
		// 		if (arr.length === 0) continue
		// 		meshes.push(arr.pop() as SDK.Mesh)
		// 	}
		// 	meshes.forEach((mesh) => {
		// 		subGroup.remove(mesh)
		// 		group.add(mesh)
		// 	})
		// }
		const t4 = performance.now()

		div.innerText = `Meshes count ${meshCount}
		Convert/Refine time ${(t2 - t1).toFixed(3)} ms
		Render time ${(t3 - t2).toFixed(3)} ms
		Total time ${(t4 - t1).toFixed(3)} ms
		culledMeshes ${refiner.info.culledCount}`
	},
})

timeline.play()

const div = document.createElement('div')
document.body.appendChild(div)
div.style.position = 'absolute'
div.style.left = 10 + 'px'
div.style.top = HEIGHT + 10 + 'px'

window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['converter'] = converter
window['refiner'] = refiner

/* eslint-disable array-element-newline */
import { THREE } from 'gl2'
import { DefaultConfig as GL2ConvConfig, GL2Converter } from '@gs.i/backend-gl2'
import * as SDK from '@gs.i/frontend-sdk'
import { buildBox } from '@gs.i/utils-geom-builders'
import { GSIRefiner, DefaultConfig as RefinerConfig } from '@gs.i/utils-optimize'

// 标准之外
import { camera, renderer, timeline } from '../_util/GL2Renderer'
import { scene } from '../_util/GL2Scene'
import { AxesHelper } from '../_util/GSIAxesHelper'

/**
 * 使用 ts frontend 和 geomBuilder 构建 gsi，并使用transform做动画
 */

const group = new SDK.Mesh()

// Box mesh
const box = new SDK.Mesh({ name: 'Box' })
const boxGeom = buildBox()

const boxMatr = new SDK.MatrUnlit({ baseColorFactor: { r: 1, g: 0, b: 1 } })

box.material = boxMatr
box.geometry = boxGeom
box.transform.scale.setScalar(10)

// Axes helper
const smallAxes = new AxesHelper({ length: 10 })
box.add(smallAxes)

timeline.config.ignoreErrors = false
timeline.addTrack({
	onUpdate: (t, p) => {
		group.transform.rotation.x = t * 0.001
		group.transform.rotation.y = t * 0.002

		box.transform.position.x = Math.sin(t * 0.001) * 50
		box.transform.position.y = Math.sin(t * 0.002 + 0.4) * 20
		// box.transform.scale.setScalar(Math.sin(t * 0.001) * 10)
	},
})

group.add(box)

// Axes helper
group.add(new AxesHelper({ length: 10000 }))

const converter = new GL2Converter(GL2ConvConfig)
const refiner = new GSIRefiner(RefinerConfig)

// 渲染逻辑
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

timeline.play()

window['box'] = box
window['smallAxes'] = smallAxes
window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['THREE'] = THREE

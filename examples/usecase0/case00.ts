/* eslint-disable array-element-newline */
import { THREE } from 'gl2'
import { DefaultConfig as GL2ConvConfig, GL2Converter } from '@gs.i/backend-gl2'
import * as SDK from '@gs.i/frontend-sdk'

import { camera, renderer, timeline } from '../_util/GL2Renderer'
import { scene } from '../_util/GL2Scene'
import { AxesHelper } from '../_util/GSIAxesHelper'

/**
 * 使用 ts frontend 构建 gsi
 */

const group = new SDK.Mesh()

// Box mesh
const box = new SDK.Mesh({ name: 'Box' })
const boxGeom = new SDK.Geom({
	attributes: {
		position: {
			// prettier-ignore
			array : new Float32Array([
                0.5,  0.5,  0.5,  0.5,  0.5,  -0.5, 0.5,  -0.5, 0.5,  0.5,  -0.5, -0.5, -0.5, 0.5,  -0.5,
                -0.5, 0.5,  0.5,  -0.5, -0.5, -0.5, -0.5, -0.5, 0.5,  -0.5, 0.5,  -0.5, 0.5,  0.5,  -0.5,
                -0.5, 0.5,  0.5,  0.5,  0.5,  0.5,  -0.5, -0.5, 0.5,  0.5,  -0.5, 0.5,  -0.5, -0.5, -0.5,
                0.5,  -0.5, -0.5, -0.5, 0.5,  0.5,  0.5,  0.5,  0.5,  -0.5, -0.5, 0.5,  0.5,  -0.5, 0.5,
                0.5,  0.5,  -0.5, -0.5, 0.5,  -0.5, 0.5,  -0.5, -0.5, -0.5, -0.5, -0.5,
            ]),
			itemSize: 3,
			count: 24,
			normalized: false,
			usage: 'STATIC_DRAW',
			updateRanges: [],
			version: 0,
		},
	},
	indices: {
		// prettier-ignore
		array : new Uint16Array([
            0,  2,  1,  2,  3,  1,  4,  6,  5,  6,  7,  5,  8,  10, 9,  10, 11, 9,
            12, 14, 13, 14, 15, 13, 16, 18, 17, 18, 19, 17, 20, 22, 21, 22, 23, 21,
        ]),
		itemSize: 1,
		count: 36,
		normalized: false,
		usage: 'STATIC_DRAW',
		updateRanges: [],
		version: 0,
	},
})

const boxMatr = new SDK.MatrUnlit({ baseColorFactor: { r: 1, g: 0, b: 1 } })

box.transform.scale.setScalar(10)
box.material = boxMatr
box.geometry = boxGeom

group.add(box)

// Axes helper
const axes = new AxesHelper({ length: 10000 })
// group.add(axes)
box.add(axes)

const converter = new GL2Converter(GL2ConvConfig)

// 渲染逻辑
scene.add(converter.convert(group))

timeline.addTrack({
	id: '绘制循环',
	duration: Infinity,
	onUpdate: () => {
		converter.convert(group)
		renderer.render(scene, camera)
	},
})

timeline.play()

window['box'] = box
window['axes'] = axes
window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['THREE'] = THREE

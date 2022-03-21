import { computeBBox } from '@gs.i/utils-geometry'
/* eslint-disable array-element-newline */
import { camera, renderer, timeline } from '../_util/GL2Renderer'
import { scene } from '../_util/GL2Scene'
import { AxesHelper } from '../_util/GSIAxesHelper'

import { DefaultConfig as GL2ConvConfig, GL2Converter } from '@gs.i/backend-gl2'
import { Mesh, MatrUnlit, MatrPbr } from '@gs.i/frontend-sdk'
import { GLTF2Convertor } from '@gs.i/backend-gltf2'
import { GLTF2Loader } from '@gs.i/frontend-gltf2'

/**
 * 使用 ts frontend 构建 gsi
 */

const group = new Mesh()

// Axes helper
const axes = new AxesHelper({ length: 10000 })
// group.add(axes)

/**
 * Converter
 */
const converter = new GL2Converter(GL2ConvConfig)
// const conv = new GLTF2Convertor()

const loader = new GLTF2Loader()

const gltfs = [
	// 'https://polar-public.oss-cn-hangzhou.aliyuncs.com/water.glb',
	// 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
	// 'https://gw.alipayobjects.com/os/bmw-prod/20547a0c-816b-4d20-ba9e-fbd7b33e012f.glb',
	// 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Buggy/glTF-Binary/Buggy.glb',
	// 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Lantern/glTF-Binary/Lantern.glb',
	// 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/GearboxAssy/glTF-Binary/GearboxAssy.glb',
	// 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb',
	// 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
	'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/MetalRoughSpheres/glTF-Binary/MetalRoughSpheres.glb',
	// 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/MetalRoughSpheresNoTextures/glTF-Binary/MetalRoughSpheresNoTextures.glb',
	// 'https://gw-office.alipayobjects.com/bmw-prod/e9e13898-231f-4850-96a5-aa3210d2fcdb.glb',
	// '/assets/fuzhou_full_by_mat.glb',
]

gltfs.forEach((gltfUrl, index) => {
	fetch(gltfUrl)
		.then((r) => r.arrayBuffer())
		.then((buffer) => {
			console.time('parse glb')
			// console.log(buffer)
			const glm = loader.glbToGLM(buffer)
			console.log(glm)
			const mesh = loader.parse(glm)
			console.log(mesh)
			mesh.transform.scale.set(1000, 1000, 1000)
			mesh.transform.rotation.x = Math.PI / 2
			mesh.transform.position.x = -50 + index * 20
			group.add(mesh)
			console.timeEnd('parse glb')

			const conv = new GLTF2Convertor()
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
		})
})

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

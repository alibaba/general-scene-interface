import { uvMaterial } from '@gs.i/frontend-materials'
import { buildMultiThickLine, buildThickLine } from '@gs.i/thick-line-builder'
import IR from '@gs.i/schema-scene'
import { specifyNode } from '@gs.i/utils-specify'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'
import { IndicatorProcessor } from '@gs.i/processor-indicator'

import { renderer, timeline, camera, cameraProxy, WIDTH, HEIGHT } from '../__utils/LiteRenderer'
import { scene } from './../__utils/LiteScene'

import { GLTF2Loader } from '@gs.i/frontend-gltf2'
{
	const conv = new ThreeLiteConverter({ overrideFrustumCulling: true })
	console.log(conv)
	window['conv'] = conv

	const loader = new GLTF2Loader()

	const res = await fetch('./BoxInterleaved.glb')
	const glb = await res.arrayBuffer()

	const glm = loader.glbToGLM(glb)
	const node = loader.parse(glm)

	// debugger
	const threeMesh = conv.convert(node)

	scene.add(threeMesh)

	timeline.add({
		duration: Infinity,
		onUpdate: () => {
			// scene.transform.version++

			// TODO should check if this needs to be updated
			conv.cullingProcessor.updateFrustum({
				cameraPosition: camera.position,
				cameraRotation: camera.rotation,
				cameraNear: camera.near,
				cameraFar: camera.far,
				cameraFOV: camera.fov,
				cameraAspect: camera.aspect,
			})

			conv.convert(node)
			renderer.render(scene, camera)
		},
	})

	timeline.play()
}

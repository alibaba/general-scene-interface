import { uvMaterial } from '@gs.i/frontend-materials'
import { buildMultiThickLine, buildThickLine } from '@gs.i/thick-line-builder'
import IR from '@gs.i/schema-scene'
import { specifyNode } from '@gs.i/utils-specify'
import { Converter } from '@gs.i/backend-three'
import { IndicatorProcessor } from '@gs.i/processor-indicator'

import { renderer, timeline, camera, cameraProxy, WIDTH, HEIGHT } from '../__utils/ThreeRenderer'
import { scene } from './../__utils/ThreeScene'

import { GLTF2Loader } from '@gs.i/frontend-gltf2'
{
	const conv = new Converter({ overrideFrustumCulling: true })
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

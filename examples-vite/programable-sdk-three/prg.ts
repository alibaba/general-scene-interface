import { generateScene } from '@gs.i/utils-random-scene'
import { Converter } from '@gs.i/backend-three'
import { IndicatorProcessor } from '@gs.i/processor-indicator'

import { renderer, timeline, camera, cameraProxy, WIDTH, HEIGHT } from '../__utils/ThreeRenderer'
import { scene as threeScene } from '../__utils/ThreeScene'
import IR, { isRenderable } from '@gs.i/schema-scene'
import * as SDK from '@gs.i/frontend-sdk'

{
	const scene = generateScene({
		// scale: 10000,
		count: 16,
		depth: 1,
		useAnimation: false,
		useGLine: false,
		// usePoint: false,
		resolution: [WIDTH, HEIGHT],
	})
	console.log(scene)

	scene.children.forEach((node) => {
		if (isRenderable(node)) {
			const matr = new SDK.UnlitMaterial()
			matr.uniforms = {
				time: { value: 0 },
			}
			matr.global = `
			uniform float time;
			`
			matr.vertGeometry = `
			position.z += sin(position.x * 0.2 + time * 0.001) * 20.0;
			`
			matr.fragOutput = `
			fragColor = vec4(1.0, 0.0, 0.0, 1.0);
			`
			node.material = matr

			timeline.add({
				duration: Infinity,
				onUpdate: (t, p) => {
					const uniforms = node.material.extensions?.EXT_matr_programmable?.uniforms as any
					uniforms.time.value = t
					node.material['uniformsNeedUpdate'] = true
				},
			})
		}
	})

	const indicator = new IndicatorProcessor({
		// hideOriginal: true,
		useBBox: true,
		useBSphere: true,
		// useWireframe: true,
	})
	indicator.traverse(scene)

	const conv = new Converter({ overrideFrustumCulling: true })
	console.log(conv)
	window['conv'] = conv

	// debugger
	const threeMesh = conv.convert(scene)
	console.log(threeMesh)

	threeScene.add(threeMesh)
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

			conv.convert(scene)
			renderer.render(threeScene, camera)
		},
	})

	timeline.play()

	window['cameraProxy'] = cameraProxy
}

export {}

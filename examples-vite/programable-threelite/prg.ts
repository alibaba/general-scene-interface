import { generateScene } from '@gs.i/utils-random-scene'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'
import { IndicatorProcessor } from '@gs.i/processor-indicator'

import { renderer, timeline, camera, cameraProxy, WIDTH, HEIGHT } from '../__utils/LiteRenderer'
import { scene as threeScene } from '../__utils/LiteScene'
import { isRenderableMesh } from '@gs.i/schema-scene'

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
		if (isRenderableMesh(node)) {
			node.material.extensions = {
				EXT_matr_programmable: {
					language: 'GLSL300',
					extension: '',
					defines: {},
					uniforms: {
						time: { value: 0 },
					},
					global: `
					uniform float time;
					`,
					vertGeometry: `
					position.z += sin(position.x * 0.2 + time * 0.001) * 20.0;
					`,
				},
			}

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

	const conv = new ThreeLiteConverter({ overrideFrustumCulling: true })
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

import { uvMaterial } from '@gs.i/frontend-materials'
import { buildMultiThickLine, buildThickLine } from '@gs.i/thick-line-builder'
import IR from '@gs.i/schema-scene'
import { specifyNode } from '@gs.i/utils-specify'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'
import { IndicatorProcessor } from '@gs.i/processor-indicator'

import { renderer, timeline, camera, cameraProxy, WIDTH, HEIGHT } from '../__utils/LiteRenderer'
import { scene as threeScene } from '../__utils/LiteScene'

{
	const scene = specifyNode({
		material: uvMaterial,
		geometry: buildThickLine(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 200 },
				{ x: 20, y: -100 },
				{ x: 201, y: -100 },
				{ x: 300, y: 0 },
			],
			// { uv: true, width: 10, joint: 'bevel' }
			{ uv: true, width: 10, joint: 'round' }
			// { uv: true, width: 10, joint: 'miter' }
		),
		// geometry: buildMultiThickLine(
		// 	[
		// 		[
		// 			{ x: 0, y: 0 },
		// 			{ x: 100, y: 200 },
		// 			{ x: 200, y: -200 },
		// 			{ x: 201, y: -100 },
		// 			{ x: 300, y: 0 },
		// 		],
		// 		[
		// 			{ x: 400, y: 0 },
		// 			{ x: 500, y: 200 },
		// 			{ x: 600, y: -200 },
		// 			{ x: 701, y: -100 },
		// 			{ x: 800, y: 0 },
		// 		],
		// 	],
		// 	// { uv: true, width: 10, joint: 'bevel' }
		// 	{ uv: true, width: 10, joint: 'round' }
		// 	// { uv: true, width: 10, joint: 'miter' }
		// ),
	})
	console.log(scene)

	const indicator = new IndicatorProcessor({
		// hideOriginal: true,
		useBBox: true,
		// useBSphere: true,
		useWireframe: true,
	})
	indicator.traverse(scene)

	const conv = new ThreeLiteConverter({ overrideFrustumCulling: true })
	console.log(conv)
	window['conv'] = conv

	// debugger
	const threeMesh = conv.convert(scene)
	console.log(threeMesh)

	// console.log(cameraControl)

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

	timeline.updateMaxFPS(60)

	timeline.play()

	window['cameraProxy'] = cameraProxy
}

export {}

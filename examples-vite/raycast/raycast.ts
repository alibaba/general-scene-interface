import { isRenderable, Vec3 } from '@gs.i/schema-scene'
import { generateScene } from '@gs.i/utils-random-scene'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'
import { Raycaster } from '@gs.i/Processor-raycast'
import { traverseBFS } from '@gs.i/utils-traverse'

import {
	renderer,
	timeline,
	camera,
	cameraControl,
	cameraProxy,
	WIDTH,
	HEIGHT,
	CONTAINER,
} from '../__utils/LiteRenderer'
import { scene as threeScene } from '../__utils/LiteScene'
import { Vector3 } from 'three-lite'

{
	const scene = generateScene({
		// scale: 10000,
		count: 100,
		depth: 10,
		useAnimation: true,
		useSprite: true,
		usePoint: false,
		resolution: [WIDTH, HEIGHT],
	})
	console.log(scene)

	const conv = new ThreeLiteConverter({ overrideFrustumCulling: true })
	console.log(conv)
	window['conv'] = conv

	const threeMesh = conv.convert(scene)
	console.log(threeMesh)

	threeScene.add(threeMesh)

	const raycaster = new Raycaster({
		boundingProcessor: conv.boundingProcessor,
		matrixProcessor: conv.matrixProcessor,
	})

	generateCrosshair(CONTAINER)

	const panel = generatePanel()

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

			// update Raycaster
			panel.clear()
			raycaster.set(camera.position as Vec3, camera.getWorldDirection(new Vector3()) as Vec3)
			traverseBFS(scene, (node) => {
				if (
					isRenderable(node) &&
					node.geometry.mode === 'TRIANGLES' &&
					node.geometry.attributes.position
				) {
					const result = raycaster.raycast(node, false)
					if (result.hit) {
						// console.log('hit', result)
						panel.info(`hit ${node.name} index:${result.intersections[0]?.index}`)
					}
				}
			})
		},
	})

	timeline.play()
}

function generateCrosshair(container) {
	const size = 4
	const { width, height } = container.getBoundingClientRect()
	const div = document.createElement('div')
	div.style.width = size + 'px'
	div.style.height = size + 'px'
	div.style.background = '#fff'
	div.style.border = '1px solid #000'
	div.style.position = 'absolute'
	div.style.left = width / 2 - size / 2 + 'px'
	div.style.top = height / 2 - size / 2 + 'px'
	container.appendChild(div)
}

function generatePanel() {
	const size = [150, 100]
	const div = document.createElement('div')
	div.style.width = size[0] + 'px'
	div.style.height = size[1] + 'px'
	div.style.border = '1px dashed black'
	div.style.position = 'absolute'
	div.style.left = '5px'
	div.style.bottom = '5px'
	document.body.appendChild(div)
	function info(content) {
		div.innerText = content.toString()
	}
	function clear() {
		div.innerText = ''
	}
	return {
		info,
		clear,
	}
}

export {}

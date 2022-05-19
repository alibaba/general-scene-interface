import { isRenderable, Vec3 } from '@gs.i/schema-scene'
import { Mesh, Texture, Geom, Attr, UnlitMaterial } from '@gs.i/frontend-sdk'
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
import { buildPlane } from '@gs.i/utils-geom-builders'

{
	const scene = new Mesh()

	const indexedMesh = new Mesh({
		geometry: buildPlane({ width: 100, height: 100, uv: true }),
		material: new UnlitMaterial({
			baseColorFactor: { r: 1.0, g: 0.0, b: 1.0 },
			global: `
			varying vec2 vUV;
			`,
			vertOutput: `
			vUV = uv;
			`,
			fragOutput: `
			fragColor = vec4(vUV.x, 0.0, vUV.y, 1.0);
			`,
		}),
	})
	const nonIndexedMesh = new Mesh({
		geometry: new Geom({
			attributes: {
				position: new Attr(
					// prettier-ignore
					new Float32Array([
						-1, 0, 0, 
						0, 0, 0, 
						0, 1, 0,

						0, 0, 0,
						1, 0, 0,
						0, 1, 0
					]),
					3
				),

				aColor: new Attr(
					// prettier-ignore
					new Float32Array([
						1, 0, 1, 
						1, 0, 1,
						1, 0, 1,

						0, 0.5, 1,
						0, 0.5, 1,
						0, 0.5, 1,
					]),
					3
				),
			},
		}),
		material: new UnlitMaterial({
			baseColorFactor: { r: 1.0, g: 0.0, b: 1.0 },
			global: `
			varying vec3 vColor;
			`,
			vertGlobal: `
			attribute vec3 aColor;
			`,
			vertOutput: `
			vColor = aColor;
			`,
			fragOutput: `
			fragColor = vec4(vColor, 1.0);
			`,
		}),
	})
	nonIndexedMesh.transform.scale.x = 100
	nonIndexedMesh.transform.scale.y = 100
	nonIndexedMesh.transform.scale.z = 100
	nonIndexedMesh.transform.position.x += 150
	nonIndexedMesh.transform.position.y -= 150
	nonIndexedMesh.transform.version++

	scene.add(indexedMesh)
	scene.add(nonIndexedMesh)

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
					const result = raycaster.raycast(node, false, true)
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

import { generateScene } from '@gs.i/utils-random-scene'
import { ThreeLiteConverter } from '@gs.i/backend-threelite'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
// import { traverseBFS } from '@gs.i/utils-traverse'

import * as THREE from 'three-lite'

/**
 * 场景
 */
export const threeScene = new THREE.Scene()
threeScene.matrixAutoUpdate = false
threeScene.autoUpdate = false

import {
	renderer,
	timeline,
	camera,
	cameraControl,
	cameraProxy,
	WIDTH,
	HEIGHT,
} from '../__utils/LiteRenderer'
import { specifyGeometry, specifyMaterial, specifyNode } from '@gs.i/utils-specify'
import { buildBox } from '@gs.i/utils-geom-builders'
import { Color } from 'three-lite'

{
	const conv = new ThreeLiteConverter({ overrideFrustumCulling: true })

	const threeTexture = new THREE.TextureLoader().load(
		'https://img.alicdn.com/imgextra/i1/O1CN01V6Tl3V1dzC8hdgJdi_!!6000000003806-2-tps-4096-4096.png'
	)

	const geometry = buildBox({ width: 100, height: 100, depth: 100, uv: true })
	const material = specifyMaterial({
		type: 'pbr',
		emissiveTexture: {
			image: { uri: 'https://img.alicdn.com/tfs/TB1c2.wpCslXu8jSZFuXXXg7FXa-509-491.png' },
			extensions: { EXT_ref_threejs: threeTexture },
		},
		emissiveFactor: { r: 1, g: 1, b: 1 },
	})

	const scene = specifyNode({ geometry, material })

	const threeMesh = conv.convert(scene)
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
}

export {}

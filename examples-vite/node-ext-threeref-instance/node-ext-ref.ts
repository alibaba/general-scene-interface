import { generateScene } from '@gs.i/utils-random-scene'
import { Converter } from '@gs.i/backend-three'
import { IndicatorProcessor } from '@gs.i/processor-indicator'
// import { traverseBFS } from '@gs.i/utils-traverse'

import * as THREE from 'three'

/**
 * 场景
 */
export const threeScene = new THREE.Scene()
threeScene.matrixAutoUpdate = false
threeScene.matrixWorldAutoUpdate = false

import {
	renderer,
	timeline,
	camera,
	cameraControl,
	cameraProxy,
	WIDTH,
	HEIGHT,
	CamConfig,
} from '../__utils/ThreeRenderer'
import { specifyGeometry, specifyMaterial, specifyNode } from '@gs.i/utils-specify'
import { buildBox } from '@gs.i/utils-geom-builders'
import { Color } from 'three'

// CamConfig.useCameraProxy = false
console.log(cameraProxy)
cameraProxy.setStatesCode('0|0.680|-6.438|0.000|0.860|0.770|21.314')

// gsi 物体
const scene = specifyNode({})
const gsiThreeWrapper = specifyNode({})
scene.children.add(gsiThreeWrapper)
gsiThreeWrapper.parent = scene

// three 物体
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_instancing_dynamic.html

const amount = parseInt(window.location.search.slice(1)) || 10
const count = Math.pow(amount, 3)
const dummy = new THREE.Object3D()
let mesh: THREE.InstancedMesh

{
	const loader = new THREE.BufferGeometryLoader()
	loader.load(
		'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/json/suzanne_buffergeometry.json',
		function (geometry) {
			geometry.computeVertexNormals()
			geometry.scale(0.5, 0.5, 0.5)

			const material = new THREE.MeshNormalMaterial()
			// check overdraw
			// let material = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.1, transparent: true } );

			mesh = new THREE.InstancedMesh(geometry, material, count)
			mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage) // will be updated every frame

			gsiThreeWrapper.extensions = {
				EXT_ref_threejs: mesh,
			}
		}
	)
}

{
	const conv = new Converter({ overrideFrustumCulling: false, keepTopology: true })

	const threeMesh = conv.convert(scene)
	threeScene.add(threeMesh)

	// debugger

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

			if (mesh) {
				const time = Date.now() * 0.001

				mesh.rotation.x = Math.sin(time / 4)
				mesh.rotation.y = Math.sin(time / 2)

				let i = 0
				const offset = (amount - 1) / 2

				for (let x = 0; x < amount; x++) {
					for (let y = 0; y < amount; y++) {
						for (let z = 0; z < amount; z++) {
							dummy.position.set(offset - x, offset - y, offset - z)
							dummy.rotation.y =
								Math.sin(x / 4 + time) + Math.sin(y / 4 + time) + Math.sin(z / 4 + time)
							dummy.rotation.z = dummy.rotation.y * 2

							dummy.updateMatrix()

							mesh.setMatrixAt(i++, dummy.matrix)
						}
					}
				}

				mesh.instanceMatrix.needsUpdate = true
				mesh.computeBoundingSphere()
			}

			conv.convert(scene)
			renderer.render(threeScene, camera)
		},
	})

	timeline.play()
}

export {}

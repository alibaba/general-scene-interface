/**
 * 不在标准里的内容
 */

import GL2, { THREE, Renderer as GL2THREERenderer } from 'gl2'

/**
 * 场景
 */
export const scene = new THREE.Scene()
scene.matrixAutoUpdate = false
scene.autoUpdate = false

const lights = new THREE.Group()
lights.name = 'LightsWrapper'
scene.add(lights)

const alight = new THREE.AmbientLight('white', 0.5)
alight.name = 'AmbientLight'
lights.add(alight)

const dlight = new THREE.DirectionalLight('white', 0.8)
dlight.name = 'DirectionalLight'
dlight.position.set(1, 1, 1)
dlight.updateMatrix()
dlight.updateMatrixWorld(true)
lights.add(dlight)

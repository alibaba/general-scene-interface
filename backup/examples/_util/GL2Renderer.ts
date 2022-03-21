/**
 * 不在标准里的内容
 */

import GL2, { THREE, Renderer as GL2THREERenderer } from 'gl2'

import { Timeline } from 'ani-timeline'
import {
	PointerControl,
	AnimatedCameraProxy,
	TouchControl,
	Cameraman,
	GeographicStates,
} from 'camera-proxy'

// basic setting

export const WIDTH = 900
export const HEIGHT = 700
export const FOV = 30
export const NEAR = 1
export const FAR = 100000
export const CONTAINER = document.querySelector('#container') as HTMLDivElement
export const CANVAS = document.createElement('canvas') as HTMLCanvasElement

CANVAS.style.position = 'absolute'
CANVAS.style.left = '0px'
CANVAS.style.top = '0px'
CANVAS.style.width = WIDTH + 'px'
CANVAS.style.height = HEIGHT + 'px'
CANVAS.width = WIDTH
CANVAS.height = HEIGHT

CONTAINER.appendChild(CANVAS)

/**
 * 渲染器
 */
export const renderer = new GL2.Renderer({
	width: WIDTH,
	height: HEIGHT,
	canvas: CANVAS,
	alpha: true,
	antialias: true,
	stencil: false,
})

/**
 * 时间线
 */

export const timeline = new Timeline({
	duration: Infinity,
	pauseWhenInvisible: false, // 检测标签页是否隐藏，已知在一些环境中不可用，建议关闭
	openStats: false,
	autoRecevery: true, // 自动回收过期的track
	maxStep: 100, // 最大帧长
	maxFPS: 30, // 最大帧率
	ignoreErrors: false, // 出错后是否停止
})

/**
 * 相机
 */

export const camera = new THREE.PerspectiveCamera(FOV, WIDTH / HEIGHT, NEAR, FAR)
camera.matrixAutoUpdate = false

/**
 * 相机控制
 */

const cameraProxy = new AnimatedCameraProxy({
	cameraFOV: FOV,
	timeline,
	canvasWidth: WIDTH,
	canvasHeight: HEIGHT,
	onUpdate: (cam) => {
		camera.position.fromArray(cam.position)
		camera.rotation.fromArray(cam.rotationEuler)
		camera.updateMatrix()
		camera.updateMatrixWorld(true)
		// @TODO update cameraNear/cameraFar
	},
})

cameraProxy.setCenter([0, 0, 0])
cameraProxy.setZoom(20)
cameraProxy.setPitch(0.5)
cameraProxy.setRotation(0)

const cameraControl = new PointerControl({
	camera: cameraProxy,
	element: CANVAS,
})

//

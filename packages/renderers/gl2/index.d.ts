// import * as THREE from 'three'
import * as THREE from './types/three/Three'

declare class Renderer extends THREE.WebGLRenderer {
	gl: WebGL2RenderingContext
	autoResetTextureUnit: boolean
	autoClear: boolean
	render(scene:THREE.Scene, camera:THREE.Camera, output?:THREE.WebGLRenderTarget|null, clear?:boolean)
	setRenderTarget(rt: THREE.WebGLRenderTarget|null)
	resetTextureUnit()
}
declare class Block {}
declare class Pipeline {
	passes: Pass[]
	constructor(conf)
	render(_renderer?, _renderTarget?)
	addPass(pass)
	dispose()
}
declare class Pass {
	width:number
	height:number
	input:THREE.WebGLRenderTarget|null
	output:THREE.WebGLRenderTarget|null
	camera: THREE.OrthographicCamera
	scene: THREE.Scene
	constructor(conf, THREE)
	resize(width:number, height:number)
	setInput(renderTarget:THREE.WebGLRenderTarget|null)
	setOutput(renderTarget:THREE.WebGLRenderTarget|null)
	pipeTo(pass)
	render(renderer)
	dispose()
}
declare class BlurPass extends Pass {}
declare class FXAAPass extends Pass {}
declare class BokehPass extends Pass {}
declare class SSAOPass extends Pass {}
declare class SSAOPass2 extends Pass {}
declare class SSRPass extends Pass {}
declare class BilateralFiltelPass extends Pass {}
declare class CombinePass extends Pass {
	canvasMesh: CanvasMesh
}
declare class LuminancePass extends Pass {}
declare class CanvasMesh {
	constructor(props, THREE)
	mesh: THREE.Mesh
}

interface shaderChunks {
	head: string
	fragColor: string
	commonUniforms: string
	commonAttributes: string
	stdvs: string
	stdfs: string
	head_100: string
	commonUniforms_100: string
	commonAttributes_100: string
	lighting: string
	noise: string
	util: string
	es3conversionVS: string
	es3conversionFS: string

	shadowmap_pars_fragment: string
}

export {
	THREE,
	Renderer,
	Block,
	Pipeline,
	Pass,
	BlurPass,
	FXAAPass,
	BokehPass,
	SSAOPass,
	SSAOPass2,
	SSRPass,
	BilateralFiltelPass,
	CombinePass,
	LuminancePass,
	CanvasMesh,
}

interface _GL2 {
	// ...core,

	Renderer
	Block

	Pipeline
	Pass
	BlurPass
	FXAAPass
	BokehPass
	SSAOPass
	SSAOPass2
	SSRPass
	BilateralFiltelPass
	CombinePass
	LuminancePass
	CanvasMesh

	// TFBufferGeometry,
	// TFBufferAttribute,

	// bake3Obj,
	shaderChunks
}

declare const GL2: _GL2

export default GL2

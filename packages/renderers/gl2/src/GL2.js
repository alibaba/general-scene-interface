import {version} from '../package.json'
console.log('GL2 version:', version);

import * as THREE from 'three';

import { decorate } from './decorators';

import Block from './core/webgl2/Block';
import Renderer from './core/Renderer';

// import shaderLib from './core/shaders/index';
import shaderChunks from './core/shaders/chunks';

import Pipeline from './pipeline/Pipeline';
import Pass from './pipeline/Pass';
import BlurPass from './pipeline/pass/BlurPass';
import FXAAPass from './pipeline/pass/FXAAPass';
import BokehPass from './pipeline/pass/BokehPass';
import SSAOPass from './pipeline/pass/SSAOPass';
import SSAOPass2 from './pipeline/pass/SSAOPass2';
import SSRPass from './pipeline/pass/SSRPass';
import BilateralFiltelPass from './pipeline/pass/BilateralFiltelPass';
import CombinePass from './pipeline/pass/CombinePass';
import LuminancePass from './pipeline/pass/LuminancePass';
import CanvasMesh from './pipeline/CanvasMesh';

// import TFBufferGeometry from './core/TFBufferGeometry';
// import TFBufferAttribute from './core/TFBufferAttribute';

decorate(THREE)

const _THREE = THREE

const _decorate = () => {console.warn('该版本不需要手动decorate')}

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

export default {
	...THREE,

	_THREE,
	THREE,

	// ...core,

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

	// TFBufferGeometry,
	// TFBufferAttribute,

	// bake3Obj,
	// shaderLib,
	shaderChunks,

	decorate: _decorate,
}

import Pass from '../Pass';
import fs from './glsl/fxaa_fs.glsl';
import vs from './glsl/fxaa_vs.glsl';
import CanvasMesh from '../CanvasMesh';

/**
 * The Kawase blur kernel presets.
 *
 * @type {Float32Array[]}
 * @private
 */

const defaultConf = {
	width: 1200,
	height: 800,
};

export default class FXAAPass extends Pass {
	constructor(conf, THREE) {
		conf.uniforms = {
			tex: { },
			resolution: { value: new THREE.Vector2(conf.width, conf.height) }
		}
		conf.vs = vs;
		conf.fs = fs;
		super(conf, THREE);
	}
}

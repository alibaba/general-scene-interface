import Pass from '../Pass';
import fs from './glsl/luminance_fs.glsl';
import vs from './glsl/luminance_vs.glsl';
import CanvasMesh from '../CanvasMesh';

const defaultConf = {
	width: 1200,
	height: 800,
};

export default class LuminancePass extends Pass {
	constructor(conf, THREE) {
		conf.uniforms = {
			// tex: { },
			// resolution: { value: new THREE.Vector2(conf.width, conf.height) }

			inputBuffer: {},
			distinction: {value: 1},
			range: {value: conf.maskLuminance ? conf.luminanceRange : THREE.Vector2()}
		}

		conf.vs = vs;
		conf.fs = fs;
		super(conf, THREE);
	}
}

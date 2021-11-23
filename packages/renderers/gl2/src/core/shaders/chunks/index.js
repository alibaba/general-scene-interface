import head from './head.glsl';
import es3conversionVS from './es3conversionVS.glsl';
import es3conversionFS from './es3conversionFS.glsl';
import fragColor from './fragColor.glsl';
import commonUniforms from './commonUniforms.glsl';
import commonAttributes from './commonAttributes.glsl';
import shadowmap_pars_fragment from './shadowmap_pars_fragment.glsl';
import stdvs from './stdvs.glsl';
import stdfs from './stdfs.glsl';

// 100兼容
import head_100 from './head_100.glsl';
import commonAttributes_100 from './commonAttributes_100.glsl';
// @TODO: 似乎没必要，100和300没区别
import commonUniforms_100 from './commonUniforms_100.glsl';

import lighting from './lighting.glsl';
import noise from './noise.glsl';

import util from './util.glsl'

export default {
	head,
	fragColor,
	commonUniforms,
	commonAttributes,
	stdvs,
	stdfs,
	head_100,
	commonUniforms_100,
	commonAttributes_100,
	lighting,
	noise,
	util,
	es3conversionVS,
	es3conversionFS,
	
	shadowmap_pars_fragment,
}

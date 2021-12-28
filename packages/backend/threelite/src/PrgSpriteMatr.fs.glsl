uniform vec3 diffuse;
uniform float opacity;
uniform vec2 uCenter;
uniform float uRotation;
uniform vec2 uSize;
varying vec2 vUv;
uniform mat3 uvTransform;
#include <common>
// fix three.js
#ifndef USE_UV
#define USE_UV
#endif
// #include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <fog_pars_fragment>
// #include <logdepthbuf_pars_fragment>
// #include <clipping_planes_pars_fragment>
$$GSI_INSERT<Varyings>
$$GSI_INSERT<Uniforms>
$$GSI_INSERT<PreFrag>
void GSI_FUNC_FragColor(inout vec4 fragColor) {
    $$GSI_INSERT<FragColor>
}
void main() {
	// #include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	// #include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	outgoingLight = diffuseColor.rgb;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	GSI_FUNC_FragColor(gl_FragColor);
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}
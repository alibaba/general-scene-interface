#define STANDARD
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
// fix three.js
#ifndef USE_UV
#define USE_UV
#endif
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
// #include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
// #include <morphtarget_pars_vertex>
// #include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
// #include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
$$GSI_INSERT<Attributes>
$$GSI_INSERT<Varyings>
$$GSI_INSERT<Uniforms>
// uniform float opacity;
$$GSI_INSERT<PreVert>
void GSI_FUNC_vertGeometry(
	inout vec3 position, 
	inout vec3 normal, 
	inout vec2 uv, 
	in mat4 modelMatrix, 
	in mat4 modelViewMatrix, 
	in mat4 projectionMatrix, 
	in mat3 normalMatrix
) {
$$GSI_INSERT<VertGeometry>
}
void GSI_FUNC_vertOutput(
	inout vec4 modelViewPosition, 
	in mat4 modelViewMatrix, 
	in mat4 projectionMatrix, 
	inout vec4 glPosition
) {
$$GSI_INSERT<VertOutput>
}
void GSI_FUNC_postVert() {
$$GSI_INSERT<PostVert>
}
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>

	#include <beginnormal_vertex>
	// #include <morphnormal_vertex>
	// #include <skinbase_vertex>
	// #include <skinnormal_vertex>
	#include <begin_vertex>
	// #include <morphtarget_vertex>
	// #include <skinning_vertex>
	#include <displacementmap_vertex>
	#if defined( USE_MAP ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( USE_SPECULARMAP ) || defined( USE_ALPHAMAP ) || defined( USE_EMISSIVEMAP ) || defined( USE_ROUGHNESSMAP ) || defined( USE_METALNESSMAP )
	GSI_FUNC_vertGeometry( transformed, objectNormal, vUv, modelMatrix, modelViewMatrix, projectionMatrix, normalMatrix );
	#elif defined( GSI_USE_UV )
	vec2 _gsi_var_uv = uv;
	GSI_FUNC_vertGeometry( transformed, objectNormal, _gsi_var_uv, modelMatrix, modelViewMatrix, projectionMatrix, normalMatrix );
	#else
	vec2 fakeuv = vec2(0.0);
	GSI_FUNC_vertGeometry( transformed, objectNormal, fakeuv, modelMatrix, modelViewMatrix, projectionMatrix, normalMatrix );
	#endif
	#include <defaultnormal_vertex>
	#ifndef FLAT_SHADED
		vNormal = normalize( transformedNormal );
	#endif
	vec4 glPosition;
	vec4 mvPosition = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		mvPosition = instanceMatrix * mvPosition;
	#endif
	mvPosition = modelViewMatrix * mvPosition;
	GSI_FUNC_vertOutput( mvPosition, modelViewMatrix, projectionMatrix, glPosition );
	if (glPosition.w != 0.0) {
		gl_Position = glPosition;
	} else {
		gl_Position = projectionMatrix * mvPosition;
	}
	// #include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
	GSI_FUNC_postVert();
}

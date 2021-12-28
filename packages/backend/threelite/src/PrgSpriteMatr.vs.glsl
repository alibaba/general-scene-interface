uniform vec2 uCenter;
uniform float uRotation;
uniform vec2 uSize;
attribute float corner;
varying vec2 vUv;
uniform mat3 uvTransform;
#include <common>
// fix three.js
#ifndef USE_UV
#define USE_UV
#endif
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
$$GSI_INSERT<Attributes>
$$GSI_INSERT<Varyings>
$$GSI_INSERT<Uniforms>
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
	vec2 vert;
	if (corner == 0.0) { vert = vec2( -0.5, -0.5 ); }
	if (corner == 1.0) { vert = vec2( 0.5, -0.5 ); }
	if (corner == 2.0) { vert = vec2( 0.5, 0.5 ); }
	if (corner == 3.0) { vert = vec2( -0.5, 0.5 ); }
	vec2 cuv;
	if (corner == 0.0) { cuv = vec2( 0.0, 0.0 ); }
	if (corner == 1.0) { cuv = vec2( 1.0, 0.0 ); }
	if (corner == 2.0) { cuv = vec2( 1.0, 1.0 ); }
	if (corner == 3.0) { cuv = vec2( 0.0, 1.0 ); }
	vUv = ( uvTransform * vec3( cuv, 1.0 ) ).xy;
	vec3 transformed = position;
	vec3 objectNormal = vec3(0.0);
	GSI_FUNC_vertGeometry( transformed, objectNormal, vUv, modelMatrix, modelViewMatrix, projectionMatrix, normalMatrix );
	vec4 mvPosition = modelViewMatrix * vec4( transformed.x, transformed.y, transformed.z, 1.0 );
	#ifdef GSI_USE_ATTR_SIZE
		vec2 scale = size;
	#else
		vec2 scale = uSize;
	#endif
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	// vec2 alignedPosition = ( transformed.xy - ( uCenter - vec2( 0.5 ) ) ) * scale;
	vec2 alignedPosition = ( vert.xy - ( uCenter - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( uRotation ) * alignedPosition.x - sin( uRotation ) * alignedPosition.y;
	rotatedPosition.y = sin( uRotation ) * alignedPosition.x + cos( uRotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	vec4 glPosition;
	GSI_FUNC_vertOutput( mvPosition, modelViewMatrix, projectionMatrix, glPosition );
	if (glPosition.w != 0.0) {
		gl_Position = glPosition;
	} else {
		gl_Position = projectionMatrix * mvPosition;
	}
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	GSI_FUNC_postVert();
}
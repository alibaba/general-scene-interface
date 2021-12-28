uniform float size;
uniform float scale;
#include <common>
// fix three.js
#ifndef USE_UV
#define USE_UV
#endif
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
$$GSI_INSERT<Attributes>
$$GSI_INSERT<Varyings>
$$GSI_INSERT<Uniforms>
uniform float opacity;
$$GSI_INSERT<PreVert>
void GSI_FUNC_vertGeometry(inout vec3 position, in mat4 modelMatrix, in mat4 modelViewMatrix, in mat4 projectionMatrix) {
$$GSI_INSERT<VertGeometry>
}
void GSI_FUNC_pointSize(inout float pointSize) {
$$GSI_INSERT<VertPointSize>
}
void GSI_FUNC_vertOutput(inout vec4 modelViewPosition, in mat4 modelViewMatrix, in mat4 projectionMatrix, inout vec4 glPosition) {
$$GSI_INSERT<VertOutput>
}
void GSI_FUNC_postVert() {
$$GSI_INSERT<PostVert>
}
void main() {
	#include <color_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	GSI_FUNC_vertGeometry( transformed, modelMatrix, modelViewMatrix, projectionMatrix );

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
	
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	GSI_FUNC_pointSize(gl_PointSize);
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
	GSI_FUNC_postVert();
}
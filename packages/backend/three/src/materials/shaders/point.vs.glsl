uniform float size;
uniform float scale;

#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

#ifdef USE_POINTS_UV

	varying vec2 vUv;
	uniform mat3 uvTransform;

#endif

// slot

#pragma GSI_INSERT_Global
#pragma GSI_INSERT_VertGlobal

void GSI_FUNC_VertGeometry(inout vec3 position, in mat4 modelMatrix, in mat4 modelViewMatrix,
                           in mat4 projectionMatrix, in mat3 normalMatrix, in vec2 uv) {
vec3 normal = vec3(0.,0.,1.);
#pragma GSI_INSERT_VertGeometry
}

void GSI_FUNC_VertOutput(inout vec4 modelViewPosition, in mat4 modelViewMatrix, in mat4 projectionMatrix,
                         inout vec4 glPosition) {
#pragma GSI_INSERT_VertOutput
}

void GSI_FUNC_pointSize(inout float pointSize) {
#pragma GSI_INSERT_VertPointSize
}

void main() {

	#ifdef USE_POINTS_UV

		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;

	#endif

	#include <color_vertex>
	#include <morphcolor_vertex>

    // #include <begin_vertex> ->

    vec3 transformed = vec3( position );

    // #include <begin_vertex> <-
  
	#include <morphtarget_vertex>

    // #include <project_vertex> ->

    // slot
    #ifdef USE_POINTS_UV
        GSI_FUNC_VertGeometry( transformed, modelMatrix, modelViewMatrix, projectionMatrix, normalMatrix, vUv );
    #else
        GSI_FUNC_VertGeometry( transformed, modelMatrix, modelViewMatrix, projectionMatrix, normalMatrix, vec2(0.0) );
    #endif

    vec4 mvPosition = vec4( transformed, 1.0 );

#ifdef USE_INSTANCING

	mvPosition = instanceMatrix * mvPosition;

#endif

    mvPosition = modelViewMatrix * mvPosition;

    gl_Position = projectionMatrix * mvPosition;

    // #include <project_vertex> <-
    
    // slot
    GSI_FUNC_VertOutput(mvPosition, modelViewMatrix, projectionMatrix, gl_Position);

	gl_PointSize = size;

	#ifdef USE_SIZEATTENUATION

		bool isPerspective = isPerspectiveMatrix( projectionMatrix );

		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );

	#endif

    // slot
    GSI_FUNC_pointSize(gl_PointSize);

#include <logdepthbuf_vertex>
#include <clipping_planes_vertex>
#include <worldpos_vertex>
#include <fog_vertex>
}

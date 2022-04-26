#include <common>

// #include <uv_pars_vertex> ->

#ifdef USE_UV

#ifdef UVS_VERTEX_ONLY

vec2 vUv;

#else

varying vec2 vUv;

#endif

uniform mat3 uvTransform;

#endif

// #include <uv_pars_vertex> <-

#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

// @slot

#pragma GSI_INSERT_Global
#pragma GSI_INSERT_VertGlobal

void GSI_FUNC_VertGeometry(inout vec3 position, inout vec3 normal, inout vec2 uv, in mat4 modelMatrix,
                           in mat4 modelViewMatrix, in mat4 projectionMatrix, in mat3 normalMatrix) {
#pragma GSI_INSERT_VertGeometry
}

void GSI_FUNC_VertOutput(inout vec4 modelViewPosition, in mat4 modelViewMatrix, in mat4 projectionMatrix,
                         inout vec4 glPosition) {
#pragma GSI_INSERT_VertOutput
}

void main() {

#include <uv_vertex>
#include <uv2_vertex>
#include <color_vertex>
#include <morphcolor_vertex>

// #include <begin_vertex> ->

vec3 transformed = vec3( position );

// #include <begin_vertex> <-

// #if defined(USE_ENVMAP) || defined(USE_SKINNING)

    // #include <beginnormal_vertex> ->

    vec3 objectNormal = vec3(normal);

#ifdef USE_TANGENT

    vec3 objectTangent = vec3(tangent.xyz);

#endif

    // #include <beginnormal_vertex> <-

#include <morphnormal_vertex>
#include <skinbase_vertex>
#include <skinnormal_vertex>

    // #include <defaultnormal_vertex> ->

    vec3 transformedNormal = objectNormal;

    // @@slot
    GSI_FUNC_VertGeometry(transformed, transformedNormal, vUv, modelMatrix, modelViewMatrix, projectionMatrix,
                          normalMatrix);

#ifdef USE_INSTANCING

    // this is in lieu of a per-instance normal-matrix
    // shear transforms in the instance matrix are not supported

    mat3 m = mat3(instanceMatrix);

    transformedNormal /= vec3(dot(m[0], m[0]), dot(m[1], m[1]), dot(m[2], m[2]));

    transformedNormal = m * transformedNormal;

#endif

    transformedNormal = normalMatrix * transformedNormal;

#ifdef FLIP_SIDED

    transformedNormal = -transformedNormal;

#endif

#ifdef USE_TANGENT

    vec3 transformedTangent = (modelViewMatrix * vec4(objectTangent, 0.0)).xyz;

#ifdef FLIP_SIDED

    transformedTangent = -transformedTangent;

#endif

// #endif

    // #include <defaultnormal_vertex> <-

#endif

// @GSI @note move this up
// // #include <begin_vertex> ->
// vec3 transformed = vec3( position );
// // #include <begin_vertex> <-

#include <morphtarget_vertex>
#include <skinning_vertex>

    // #include <project_vertex> ->

    vec4 mvPosition = vec4(transformed, 1.0);

#ifdef USE_INSTANCING

    mvPosition = instanceMatrix * mvPosition;

#endif

    mvPosition = modelViewMatrix * mvPosition;

    gl_Position = projectionMatrix * mvPosition;

    // #include <project_vertex> <-

    // @slot
    GSI_FUNC_VertOutput(mvPosition, modelViewMatrix, projectionMatrix, gl_Position);

#include <logdepthbuf_vertex>
#include <clipping_planes_vertex>

#include <worldpos_vertex>
#include <envmap_vertex>
#include <fog_vertex>
}
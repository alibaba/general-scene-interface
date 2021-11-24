#define PHYSICAL
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifndef STANDARD
	uniform float clearCoat;
	uniform float clearCoatRoughness;
#endif
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <lights_pars_begin>
#include <lights_pars_maps>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
$$GSI_INSERT<Varyings>
$$GSI_INSERT<Uniforms>
$$GSI_INSERT<PreFrag>
void GSI_FUNC_preLighting(inout vec4 diffuse, inout vec3 emissive, inout float metalness, inout float roughness) {
$$GSI_INSERT<PreLighting>
}
void GSI_FUNC_fragGeometry(inout vec3 modelViewPosition, inout vec3 normal) {
$$GSI_INSERT<FragGeometry>
}
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	GSI_FUNC_preLighting(diffuseColor, totalEmissiveRadiance, metalnessFactor, roughnessFactor);
	#include <lights_physical_fragment>

	GeometricContext geometry;
	geometry.position = - vViewPosition;
	geometry.normal = normal;
	GSI_FUNC_fragGeometry(geometry.position, geometry.normal);
	geometry.viewDir = normalize( - geometry.position );
	IncidentLight directLight;
	#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
		PointLight pointLight;
		#pragma unroll_loop
		for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
			pointLight = pointLights[ i ];
			getPointDirectLightIrradiance( pointLight, geometry, directLight );
			#ifdef USE_SHADOWMAP
			directLight.color *= all( bvec2( pointLight.shadow, directLight.visible ) ) ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
			#endif
			RE_Direct( directLight, geometry, material, reflectedLight );
		}
	#endif
	#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
		SpotLight spotLight;
		#pragma unroll_loop
		for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
			spotLight = spotLights[ i ];
			getSpotDirectLightIrradiance( spotLight, geometry, directLight );
			#ifdef USE_SHADOWMAP
			directLight.color *= all( bvec2( spotLight.shadow, directLight.visible ) ) ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
			#endif
			RE_Direct( directLight, geometry, material, reflectedLight );
		}
	#endif
	#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
		DirectionalLight directionalLight;
		#pragma unroll_loop
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
			directionalLight = directionalLights[ i ];
			getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );
			#ifdef USE_SHADOWMAP
			directLight.color *= all( bvec2( directionalLight.shadow, directLight.visible ) ) ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
			#endif
			RE_Direct( directLight, geometry, material, reflectedLight );
		}
	#endif
	#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
		RectAreaLight rectAreaLight;
		#pragma unroll_loop
		for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
			rectAreaLight = rectAreaLights[ i ];
			RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );
		}
	#endif
	#if defined( RE_IndirectDiffuse )
		vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
		#if ( NUM_HEMI_LIGHTS > 0 )
			#pragma unroll_loop
			for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
				irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );
			}
		#endif
	#endif
	#if defined( RE_IndirectSpecular )
		vec3 radiance = vec3( 0.0 );
		vec3 clearCoatRadiance = vec3( 0.0 );
	#endif

	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}

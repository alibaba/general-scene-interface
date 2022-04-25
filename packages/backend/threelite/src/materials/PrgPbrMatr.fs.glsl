#define STANDARD
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
#include <packing>
// #include <dithering_pars_fragment>
#include <color_pars_fragment>
// fix three.js
#ifndef USE_UV
#define USE_UV
#endif
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <bsdfs>
#include <transmission_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
// #include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
// #include <clipping_planes_pars_fragment>
$$GSI_INSERT<Varyings>
$$GSI_INSERT<Uniforms>
$$GSI_INSERT<PreFrag>
void GSI_FUNC_preLighting(inout vec4 diffuse, inout vec3 emissive, inout float metalness, inout float roughness) {
$$GSI_INSERT<PreLighting>
}
void GSI_FUNC_fragGeometry(inout vec3 modelViewPosition, inout vec3 normal) {
$$GSI_INSERT<FragGeometry>
}
void GSI_FUNC_FragOutput(inout vec4 fragColor) {
    $$GSI_INSERT<FragOutput>
}
void main() {
	// #include <clipping_planes_fragment>
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
	// #include <clearcoat_normal_fragment_begin>
	// #include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	GSI_FUNC_preLighting(diffuseColor, totalEmissiveRadiance, metalnessFactor, roughnessFactor);

	vec3 rawDiffuseColor = diffuseColor.rgb;

	#include <transmission_fragment>

	// accumulation
	#include <lights_physical_fragment>
	// #include <lights_fragment_begin>

	/**
	* This is a template that can be used to light a material, it uses pluggable
	* RenderEquations (RE)for specific lighting scenarios.
	*
	* Instructions for use:
	* - Ensure that both RE_Direct, RE_IndirectDiffuse and RE_IndirectSpecular are defined
	* - If you have defined an RE_IndirectSpecular, you need to also provide a Material_LightProbeLOD. <---- ???
	* - Create a material parameter that is to be passed as the third parameter to your lighting functions.
	*
	* TODO:
	* - Add area light support.
	* - Add sphere light support.
	* - Add diffuse light probe (irradiance cubemap) support.
	*/
	vec3 gsi_vViewPosition = vViewPosition;
	GSI_FUNC_fragGeometry(gsi_vViewPosition, normal);
	GeometricContext geometry;
	geometry.position = -gsi_vViewPosition;
	geometry.normal = normal;
	geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( gsi_vViewPosition );

	#ifdef CLEARCOAT

		geometry.clearcoatNormal = clearcoatNormal;

	#endif

	IncidentLight directLight;

	#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )

		PointLight pointLight;
		#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
		PointLightShadow pointLightShadow;
		#endif

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {

			pointLight = pointLights[ i ];

			getPointDirectLightIrradiance( pointLight, geometry, directLight );

			#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
			pointLightShadow = pointLightShadows[ i ];
			directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
			#endif

			RE_Direct( directLight, geometry, material, reflectedLight );

		}
		#pragma unroll_loop_end

	#endif

	#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )

		SpotLight spotLight;
		#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
		SpotLightShadow spotLightShadow;
		#endif

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {

			spotLight = spotLights[ i ];

			getSpotDirectLightIrradiance( spotLight, geometry, directLight );

			#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			spotLightShadow = spotLightShadows[ i ];
			directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
			#endif

			RE_Direct( directLight, geometry, material, reflectedLight );

		}
		#pragma unroll_loop_end

	#endif

	#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )

		DirectionalLight directionalLight;
		#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
		DirectionalLightShadow directionalLightShadow;
		#endif

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {

			directionalLight = directionalLights[ i ];

			getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );

			#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
			directionalLightShadow = directionalLightShadows[ i ];
			directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
			#endif

			RE_Direct( directLight, geometry, material, reflectedLight );

		}
		#pragma unroll_loop_end

	#endif

	#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )

		RectAreaLight rectAreaLight;

		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {

			rectAreaLight = rectAreaLights[ i ];
			RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );

		}
		#pragma unroll_loop_end

	#endif

	#if defined( RE_IndirectDiffuse )

		vec3 iblIrradiance = vec3( 0.0 );

		vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );

		irradiance += getLightProbeIrradiance( lightProbe, geometry );

		#if ( NUM_HEMI_LIGHTS > 0 )

			#pragma unroll_loop_start
			for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {

				irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );

			}
			#pragma unroll_loop_end

		#endif

	#endif

	#if defined( RE_IndirectSpecular )

		vec3 radiance = vec3( 0.0 );
		vec3 clearcoatRadiance = vec3( 0.0 );

	#endif

	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// modulation
	#include <aomap_fragment>

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

	gl_FragColor = vec4( outgoingLight, diffuseColor.a );

	GSI_FUNC_FragOutput(gl_FragColor);

	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	// #include <dithering_fragment>
}

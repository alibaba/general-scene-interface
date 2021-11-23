#include <common>
#include <packing>

uniform sampler2D tex;
uniform sampler2D normalBuffer;
uniform sampler2D depthBuffer;

uniform float cameraNear;
uniform float cameraFar;

uniform mat4 cameraProjectionMatrix;
uniform mat4 cameraInverseProjectionMatrix;

uniform float bias;
uniform float seed;
uniform float scale;
uniform float luminanceInfluence;
uniform vec2 radiusStep;
uniform vec2 distanceCutoff;
uniform vec2 proximityCutoff;

in vec2 vUv;
// in vec2 vUv0;
// in vec2 vUv1;
// in vec2 vUv2;
// in vec2 vUv3;

// https://vanruesc.github.io/postprocessing/public/demo/#ssao

float readDepth(const in vec2 uv) {
	return texture(depthBuffer, uv).r;
}

float getViewZ(const in float depth) {
	return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
}

vec3 getViewPosition( const in vec2 screenPosition, const in float depth, const in float viewZ ) {
    float clipW = cameraProjectionMatrix[2][3] * viewZ + cameraProjectionMatrix[3][3];
    vec4 clipPosition = vec4( ( vec3( screenPosition, depth ) - 0.5 ) * 2.0, 1.0 );
    clipPosition *= clipW;
    // unprojection.
    return ( cameraInverseProjectionMatrix * clipPosition ).xyz;
}

float getOcclusion(const in vec3 p, const in vec3 n, const in vec3 sampleViewPosition) {
    vec3 viewDelta = sampleViewPosition - p;
    float d = length(viewDelta) * scale;
    return max(0.0, dot(n, viewDelta) / d - bias) / (1.0 + pow2(d));
}

float getAmbientOcclusion(const in vec3 p, const in vec3 n, const in float depth, const in vec2 uv) {
    vec2 radius = radiusStep;
    float angle = rand(uv + seed) * PI2;
    float occlusionSum = 0.0;
    // Collect samples along a discrete spiral pattern.
    for(int i = 0; i < SAMPLES_INT; ++i) {
        vec2 coord = uv + vec2(cos(angle), sin(angle)) * radius;
        radius += radiusStep;
        angle += ANGLE_STEP;
        float sampleDepth = readDepth(coord);
        float proximity = abs(depth - sampleDepth);
        if(sampleDepth < distanceCutoff.y && proximity < proximityCutoff.y) {
            float falloff = 1.0 - smoothstep(proximityCutoff.x, proximityCutoff.y, proximity);
            vec3 sampleViewPosition = getViewPosition(coord, sampleDepth, getViewZ(sampleDepth));
            occlusionSum += getOcclusion(p, n, sampleViewPosition) * falloff;
        }

    }
    return occlusionSum / SAMPLES_FLOAT * 4.0;
    // return occlusionSum;
}

float e1MainImage(const in vec4 inputColor, const in vec2 uv, const in float depth) {
    float ao = 1.0;
    // Skip fragments of objects that are too far away.
    if(depth < distanceCutoff.y) {
        vec3 viewPosition = getViewPosition(uv, depth, getViewZ(depth));
        vec3 viewNormal = unpackRGBToNormal(texture(normalBuffer, uv).xyz);
        ao -= getAmbientOcclusion(viewPosition, viewNormal, depth, uv);
        // Fade AO based on luminance and depth.
        float l = linearToRelativeLuminance(inputColor.rgb);
        ao = mix(ao, 1.0, max(l * luminanceInfluence, smoothstep(distanceCutoff.x, distanceCutoff.y, depth)));
    }

	return ao;
}

void main() {


	// float depth = texture(depthBuffer, vUv).r;
	// vec3 viewPosition = getViewPosition(vUv, depth, viewZ);


	vec4 origin = texture(tex, vUv);

	float depth = readDepth(vUv);
	// float viewZ = perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
    // float depthInCamera = viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );

    float ao = e1MainImage(origin, vUv, depth);

    // TODO 浪费带宽
    gl_FragColor = vec4(ao);

    // gl_FragColor = origin * ao * ao * ao;
    // gl_FragColor = origin;
	// gl_FragColor.rgb *= ao;

    // float viewZ = perspectiveDepthToViewZ( depth, cameraNear, cameraFar );

	// gl_FragColor = normalRGBA;
	// gl_FragColor = vec4(depthInCamera);
	// gl_FragColor = vec4(depth);
	// gl_FragColor = vec4(- viewZ / 1000.0);
	// gl_FragColor = vec4(viewPosition, 1.0);
	// gl_FragColor = vec4(viewNormal, 1.0);
}

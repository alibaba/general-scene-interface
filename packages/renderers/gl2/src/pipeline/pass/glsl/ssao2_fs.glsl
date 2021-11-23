// rename
#define u_normalTexture normalBuffer
#define u_depthTexture depthBuffer
#define u_projectionMatrix cameraProjectionMatrix
#define u_inverseProjectionMatrix cameraInverseProjectionMatrix
#define v_texCoord vUv

#include <common>
#include <packing>

// #define KERNEL_SIZE 64

// This constant removes artifacts caused by neighbour fragments with minimal depth difference.
// #define CAP_MIN_DISTANCE 0.0001
// #define CAP_MIN_DISTANCE 1.0

// This constant avoids the influence of fragments, which are too far away.
// #define CAP_MAX_DISTANCE 0.005
// #define CAP_MAX_DISTANCE 50.0

// uniform sampler2D u_texture;
uniform sampler2D u_normalTexture;
uniform sampler2D u_depthTexture;

uniform vec3 u_kernel[KERNEL_SIZE];

uniform sampler2D u_rotationNoiseTexture; 

uniform vec2 u_rotationNoiseScale;
uniform vec2 u_rotationNoiseOffset;

uniform mat4 u_inverseProjectionMatrix;
uniform mat4 u_projectionMatrix;

uniform float u_radius;

uniform float seed;

uniform mat4 randomKernel;

uniform float cameraNear;
uniform float cameraFar;

float getViewZ(const in float depth) {
	return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
}

in vec2 v_texCoord;

// out vec4 fragColor;

vec4 getViewPos(vec2 texCoord, float depth)
{
	// Calculate out of the fragment in screen space the view space position.

	float x = texCoord.s * 2.0 - 1.0;
	float y = texCoord.t * 2.0 - 1.0;
	
	// Assume we have a normal depth range between 0.0 and 1.0
	float z = depth * 2.0 - 1.0;
	
	vec4 posProj = vec4(x, y, z, 1.0);
	
	vec4 posView = u_inverseProjectionMatrix * posProj;
	
	posView /= posView.w;
	
	return posView;
}

float getRandom(vec2 xy) {
	return rand(xy);

	// vec2 intXY = floor(mod(xy, 4.0));
	// return randomKernel[int(intXY.x)][int(intXY.y)];

	// return intXY.x == 0.0 ? 1.0 : 0.0;
	// return intXY.y == 0.0 ? 1.0 : 0.0;
	// return (intXY.y == 3.0 && intXY.x == 3.0) ? 1.0 : 0.0;
	// return (intXY.y == 0.0 && intXY.x == 0.0) ? 1.0 : 0.0;
}

void main(void)
{
	// Calculate out of the current fragment in screen space the view space position.
	float depth = texture(u_depthTexture, v_texCoord).r;
	vec4 posView = getViewPos(v_texCoord, depth);
	
	// Normal gathering.
	
    // unpackRGBToNormal
	vec3 normalView = normalize(texture(u_normalTexture, v_texCoord).xyz * 2.0 - 1.0);
	
	// Calculate the rotation matrix for the kernel.
	
    // TODO 这里需要一个更合理的旋转方向
	// vec3 randomVector = normalize((texture(u_rotationNoiseTexture, v_texCoord * u_rotationNoiseScale).xyz * 2.0 - 1.0));
	// vec3 randomVector = normalize(
    //     texture(
    //         u_rotationNoiseTexture, 
    //         v_texCoord * u_rotationNoiseScale + u_rotationNoiseOffset
    //     ).xyz * 2.0 - 1.0
    // );
    // vec3 randv3 = vec3(rand(v_texCoord * u_rotationNoiseScale), 0.0); // ? 0~1 -1~1
	// vec3 randomVector = normalize(randv3 * 2.0 - 1.0);
    // vec3 randomVector = vec3(1.0, 0.0, 0.0);
    // vec3 randomVector = vec3(u_rotationNoiseOffset, 0.0);

    // 旋转一周
    // float _rotation = rand(v_texCoord * 5.0) * PI2;
    float _rotation = getRandom(v_texCoord) * PI2;
    // float _rotation = 0.0;
    vec3 randomVector = vec3(sin(_rotation), cos(_rotation), 0.0);
	
	// Using Gram-Schmidt process to get an orthogonal vector to the normal vector.
	// The resulting tangent is on the same plane as the random and normal vector. 
	// see http://en.wikipedia.org/wiki/Gram%E2%80%93Schmidt_process
	// Note: No division by <u,u> needed, as this is for normal vectors 1. 
	vec3 tangentView = normalize(randomVector - dot(randomVector, normalView) * normalView);
	
	vec3 bitangentView = cross(normalView, tangentView);
	
	// Final matrix to reorient the kernel depending on the normal and the random vector.
	mat3 kernelMatrix = mat3(tangentView, bitangentView, normalView); 

	// Go through the kernel samples and create occlusion factor.	
	float occlusion = 0.0;
	
	for (int i = 0; i < KERNEL_SIZE; i++)
	{
		// Reorient sample vector in view space ...
		vec3 sampleVectorView = kernelMatrix * u_kernel[i];
		
		// ... and calculate sample point.
		vec4 samplePointView = posView + u_radius * vec4(sampleVectorView, 0.0);
		
		// Project point and calculate NDC.
		
		vec4 samplePointNDC = u_projectionMatrix * samplePointView;
		
		samplePointNDC /= samplePointNDC.w;
		
		// Create texture coordinate out of it.
		
		vec2 samplePointTexCoord = samplePointNDC.xy * 0.5 + 0.5;   
		
		// Get sample out of depth texture

		float zSceneNDC = texture(u_depthTexture, samplePointTexCoord).r * 2.0 - 1.0;
		
		// If scene fragment is before (smaller in z) sample point, increase occlusion.
        // TODO 这种比法会严重受相机的near和far影响，应该转换成viewZ再来比
		// float delta = samplePointNDC.z - zSceneNDC;

        // TODO 使用这种方法，该采样点和中心采样点如果在depthBuffer上是一个点，那么将被判断为遮蔽
        //      上面的方法反而可以一定程度上减少这种误差
        float depth = texture(u_depthTexture, samplePointTexCoord).r;
        float viewZScene = getViewZ(depth);
        float viewZ = samplePointView.z;
        float delta = viewZScene - viewZ;
		
		if (
            delta > CAP_MIN_DISTANCE && 
            delta < CAP_MAX_DISTANCE
        ) {
			occlusion += 1.0;
		}
	}
	
	// No occlusion gets white, full occlusion gets black.
	occlusion = 1.0 - occlusion / (float(KERNEL_SIZE) - 1.0);

    // 截断过远的点
    occlusion = mix(
        occlusion, 
        1.0,
        smoothstep(0.9, 0.95, depth) // * smoothstep(0.1, 0.05, depth)
    );

	gl_FragColor = vec4(occlusion, occlusion, occlusion, 1.0);

	// float r = rand(v_texCoord * 5.0);
	// float r = texture(u_rotationNoiseTexture, v_texCoord * u_rotationNoiseScale).r;
	// gl_FragColor = vec4(r, r, r, 1.0);

    // gl_FragColor.rgb = texture(u_rotationNoiseTexture, v_texCoord * u_rotationNoiseScale).rgb;

    // float _d = texture(u_depthTexture, v_texCoord).r == 1.0 ? 1.0 : 0.0;
    // gl_FragColor = vec4(_d, _d, _d, 1.0);
}
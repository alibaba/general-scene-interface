#include <common>
#include <packing>

// uniform sampler2D tex;
// uniform sampler2D normalBuffer;
// uniform sampler2D depthBuffer;

// uniform sampler2D tDiffuse;
// uniform sampler2D tDepth;
// uniform sampler2D gBufferNormalRoughness;

// uniform float cameraNear;
// uniform float cameraFar;
// uniform mat4 projectToPixelMatrix;

varying vec2 vUv;

// Adapted from Unity 5 SSR
// https://github.com/kode80/kode80SSR/blob/master/Assets/Resources/Shaders/SSR.shader
// By Morgan McGuire and Michael Mara at Williams College 2014
// Released as open source under the BSD 2-Clause License
// http://opensource.org/licenses/BSD-2-Clause

// More references:
// http://g3d.cs.williams.edu/websvn/filedetails.php?repname=g3d&path=%2FG3D10%2Fdata-files%2Fshader%2FscreenSpaceRayTrace.glsl&peg=5

// uniform mat4 projectionMatrix;           // projection matrix that maps to screen pixels (not NDC)
// const float iterations = 15.0;                          // maximum ray iterations
// const float binarySearchIterations = 5.0;              // maximum binary search refinement iterations
// uniform float constantPixelStride;                         // number of pixels per ray step close to camera
// uniform float pixelStrideZCutoff;                  // ray origin Z at this distance will have a pixel stride of 1.0
// uniform float maxRayDistance;                      // maximum distance of a ray
// uniform float screenEdgeFadeStart;                 // distance to screen edge that ray hits will start to fade (0.0 -> 1.0)
// uniform float eyeFadeStart;                        // ray direction's Z that ray hits will start to fade (0.0 -> 1.0)
// uniform float eyeFadeEnd;                          // ray direction's Z that ray hits will be cut (0.0 -> 1.0)

// uniform vec2 renderBufferSize;
// uniform vec2 oneDividedByRenderBufferSize; // Optimization: removes 2 divisions every itteration

// uniform float cb_zThickness;

#define tDiffuse tex
#define gDepth depthBuffer
#define gNormal normalBuffer
#define projMatrix cameraProjectionMatrix
#define inverseProjectionMatrix cameraInverseProjectionMatrix
#define zThickness cb_zThickness
#define pixelStride constantPixelStride
#define resolution renderBufferSize
#define nearZ cameraNear
#define farZ cameraFar

varying vec3 vCameraRay;

uniform sampler2D tDiffuse;
uniform sampler2D gDepth;
uniform sampler2D gNormal;
uniform mat4 projMatrix;
uniform mat4 inverseProjectionMatrix;
uniform float zThickness;
uniform float pixelStride;
uniform float pixelStrideZCutoff;
uniform float maxRayDistance;
uniform float screenEdgeFadeStart;
uniform float eyeFadeStart;
uniform float eyeFadeEnd;
uniform vec2  resolution;

uniform float seed;

uniform float nearZ;
uniform float farZ;

// uniform float minGlossiness;
// uniform float pa;
// uniform float glossiness;

float fetchDepth(sampler2D depthTexture, vec2 uv) {
    vec4 depthTexel = texture2D(depthTexture, uv);
    return depthTexel.x * 2.0 - 1.0;
}
float linearDepth(float depth) {
    return projMatrix[3][2] / (depth * projMatrix[2][3] - projMatrix[2][2]);
}
bool rayIntersectDepth(float rayZNear, float rayZFar, vec2 hitPixel) {
    if (rayZFar > rayZNear) {
        float t = rayZFar;
        rayZFar = rayZNear;
        rayZNear = t;
    }
    float cameraZ = linearDepth(fetchDepth(gDepth, hitPixel));
    return rayZFar <= cameraZ && rayZNear >= cameraZ - zThickness;
}
float calculateAlpha(float iterationCount, float reflectivity, vec2 hitPixel, vec3 hitPoint, float dist, vec3 rayDir) {
    float alpha = clamp(reflectivity, 0.0, 1.0);
    alpha *= 1.0 - (iterationCount / float(MAX_ITERATION));
    vec2 hitPixelNDC = hitPixel * 2.0 - 1.0;
    float maxDimension = min(1.0, max(abs(hitPixelNDC.x), abs(hitPixelNDC.y)));
    alpha *= 1.0 - max(0.0, maxDimension - screenEdgeFadeStart) / (1.0 - screenEdgeFadeStart);
    float _eyeFadeStart = eyeFadeStart;
    float _eyeFadeEnd = eyeFadeEnd;
    if (_eyeFadeStart > _eyeFadeEnd) {
        float tmp = _eyeFadeEnd;
        _eyeFadeEnd = _eyeFadeStart;
        _eyeFadeStart = tmp;
    }
    float eyeDir = clamp(rayDir.z, _eyeFadeStart, _eyeFadeEnd);
    alpha *= 1.0 - (eyeDir - _eyeFadeStart) / (_eyeFadeEnd - _eyeFadeStart);
    alpha *= 1.0 - clamp(dist / maxRayDistance, 0.0, 1.0);
    // return alpha;
    return 1.0;
}
bool traceScreenSpaceRay(vec3 rayOrigin, vec3 rayDir, float jitter, out vec2 hitPixel, out vec3 hitPoint, out float iterationCount) {
    //光线最大长度
    float rayLength = ((rayOrigin.z + rayDir.z * maxRayDistance) > -nearZ)
    ? (-nearZ - rayOrigin.z ) / rayDir.z : maxRayDistance;
    vec3 rayEnd = rayOrigin + rayDir * rayLength;
    //投影后为裁剪坐标系, 原论文为屏幕坐标系
    vec4 H0 = projMatrix * vec4(rayOrigin, 1.0);
    vec4 H1 = projMatrix * vec4(rayEnd, 1.0);
    //
    float k0 = 1.0 / H0.w, k1 = 1.0 / H1.w;
    vec3 Q0 = rayOrigin * k0, Q1 = rayEnd * k1;
    //将NDC坐标转为屏幕像素坐标x:[0, screenWidth]自左向右
    // y:[0, screenHeight]自下而上
    vec2 P0 = (H0.xy * k0 * 0.5 + 0.5) * resolution;
    vec2 P1 = (H1.xy * k1 * 0.5 + 0.5) * resolution;
    P1 += dot(P1 - P0, P1 - P0) < 0.0001 ? 0.01 : 0.0;
    vec2 delta = P1 - P0;
    bool permute = false;
    if (abs(delta.x) < abs(delta.y)) {
        permute = true;
        delta = delta.yx;
        P0 = P0.yx;
        P1 = P1.yx;
    }
    float stepDir = sign(delta.x);
    float invdx = stepDir / delta.x;
    //
    vec3 dQ = (Q1 - Q0) * invdx;
    float dk = (k1 - k0) * invdx;
    vec2  dP = vec2(stepDir, delta.y * invdx);
    float strideScaler = 1.0 - min(1.0, -rayOrigin.z / pixelStrideZCutoff);
    float pixStride = 1.0 + strideScaler * pixelStride;
    dP *= pixStride;
    dQ *= pixStride;
    dk *= pixStride;
    vec4 pqk = vec4(P0, Q0.z, k0);
    vec4 dPQK = vec4(dP, dQ.z, dk);
    pqk += dPQK * jitter;
    float rayZFar = (dPQK.z * 0.5 + pqk.z) / (dPQK.w * 0.5 + pqk.w);
    float rayZNear;
    bool intersect = false;
    vec2 texelSize = 1.0 / resolution;
    iterationCount = 0.0;
    for(int i = 0; i < MAX_ITERATION; i++) {
        pqk += dPQK;
        rayZNear = rayZFar;
        rayZFar = (dPQK.z * 0.5 + pqk.z) / (dPQK.w * 0.5 + pqk.w);
        hitPixel = permute ? pqk.yx : pqk.xy;
        hitPixel *= texelSize;
        intersect = rayIntersectDepth(rayZNear, rayZFar, hitPixel);
        iterationCount += 1.0;
        dPQK *= strideMagnitude;
        if(intersect)  break;
    }
    if (pixStride > 1.0 && intersect && iterationCount > 1.0) {
        // Roll back
        pqk -= dPQK;
        dPQK /= pixStride;
        float originalStride = pixStride * 0.5;
        float stride = originalStride;
        rayZNear = pqk.z / pqk.w;
        rayZFar = rayZNear;
        //二分法步进
        for (int j = 0; j < MAX_BINARY_SEARCH_ITERATION; j++) {
            pqk += dPQK * stride;
            rayZNear = rayZFar;
            rayZFar = (dPQK.z * -0.5 + pqk.z) / (dPQK.w * -0.5 + pqk.w);
            hitPixel = permute ? pqk.yx : pqk.xy;
            hitPixel *= texelSize;
            originalStride *= 0.5;
            stride = rayIntersectDepth(rayZNear, rayZFar, hitPixel) ? -originalStride : originalStride;
        }

    }
    // bug: 这里的dPQK是递增的，这里得到的 Q0 不对
    Q0.xy += dQ.xy * iterationCount;
    Q0.z = pqk.z;
    hitPoint = Q0 / pqk.w;
    return intersect;
}
void main() {
    // 2.0 * rgb.xyz - 1.0
    vec3 normal = unpackRGBToNormal(texture2D(gNormal, vUv).rgb);

    if (dot(normal, vec3(1.0)) == 0.0 || glossiness <= minGlossiness) discard;
    float reflectivity = (glossiness - minGlossiness) / (1.0 - minGlossiness);

    // vec3 N = normalize(normal);

    // ndc
    vec4 projectedPos = vec4(vUv * 2.0 - 1.0, fetchDepth(gDepth, vUv), 1.0);
    // viewspace
    vec4 pos = inverseProjectionMatrix * projectedPos;
    vec3 rayOrigin = pos.xyz / pos.w;
    // viewspace
    vec3 rayDir = reflect(normalize(rayOrigin), N);
    vec2 hitPixel;
    vec3 hitPoint;
    float iterationCount = 0.0;
    vec2 uv2 = vUv * resolution;
    float jitter = fract((uv2.x + uv2.y) * 0.25);
    // float jitter = 0.0;
    // float jitter = rand(uv2);
    bool intersect = traceScreenSpaceRay(rayOrigin, rayDir, jitter, hitPixel, hitPoint, iterationCount);
    float dist = distance(rayOrigin, hitPoint);
    float alpha = calculateAlpha(iterationCount, reflectivity, hitPixel, hitPoint, dist, rayDir) * float(intersect);
    vec3 hitNormal = unpackRGBToNormal(texture2D(gNormal, hitPixel).rgb);
    vec4 color = texture2D(tDiffuse, vUv);

    if(dot(hitNormal, rayDir) >= 0.0 || !intersect) discard;
    else {
        vec4 ssr = texture2D(tDiffuse, hitPixel);
        gl_FragColor = vec4(ssr.rgb * alpha, ssr.a);
    }

    // gl_FragColor = color;

    // if(dot(hitNormal, rayDir) >= 0.0 || !intersect) {

    // } else {
    //     vec4 ssr = texture2D(tDiffuse, hitPixel);
    //     // gl_FragColor = color + vec4(ssr.rgb * alpha, ssr.a);
    //     // gl_FragColor.rgb = mix( gl_FragColor.rgb, ssr.rgb * alpha, ssr.a);
    //     gl_FragColor.rgb += ssr.rgb * alpha * ssr.a;
    // }

    // gl_FragColor = color * .5;
    // gl_FragColor += vec4(intersect ? 0.5 : 0.0);
    // // gl_FragColor += vec4(reflectivity);
    // // gl_FragColor.rgb += N;
    // // gl_FragColor = projectedPos;
    // gl_FragColor.rgb = pos.rgb;
}
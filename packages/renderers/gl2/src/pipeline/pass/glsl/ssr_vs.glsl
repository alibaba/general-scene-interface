// https://github.com/mattdesl/audiograph.xyz/blob/master/lib/shader/ssr.vert

#include <common>
#include <packing>

// uniform vec2 texelSize;
// uniform vec2 halfTexelSize;

uniform vec2 renderBufferSize;
varying vec3 vCameraRay;
uniform mat4 cameraInverseProjectionMatrix;

out vec2 vUv;
// out vec2 vUv0;
// out vec2 vUv1;
// out vec2 vUv2;
// out vec2 vUv3;

void main() {

	// vec2 dUv = (texelSize * vec2(kernel)) + halfTexelSize;

	// vUv0 = vec2(uv.x - dUv.x, uv.y + dUv.y);
	// vUv1 = vec2(uv.x + dUv.x, uv.y + dUv.y);
	// vUv2 = vec2(uv.x + dUv.x, uv.y - dUv.y);
	// vUv3 = vec2(uv.x - dUv.x, uv.y - dUv.y);

	vUv = uv;

	vec4 cameraRay = vec4(uv * 2.0 - 1.0, 1.0, 1.0);
	cameraRay = cameraInverseProjectionMatrix * cameraRay;
	vCameraRay = (cameraRay / cameraRay.w).xyz;

	gl_Position = vec4(position, 1.0);

	// gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}

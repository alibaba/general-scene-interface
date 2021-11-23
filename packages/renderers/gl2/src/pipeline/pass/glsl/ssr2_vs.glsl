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

	// https://blog.csdn.net/hehemingsgc6/article/details/53888902
	// 我们可以在vert函数中获得对应的UV，将其转化为NDC坐标，
	// 再右乘一个inverse projection matrix，就可以获得到远裁剪面的四个顶点（在观察空间下）。
	// 将这个方向向量传给frag函数，
	// 我们便可以得到一个插值后的结果，这个结果就是对应各个像素的镜头到远裁剪面的射线。
	// 将这个射线乘以depth，我们便可以得到像素对应在三维空间中的位置。

	// Calculate camera to far plane ray in vertex shader
	vec4 cameraRay = vec4(uv * 2.0 - 1.0, 1.0, 1.0);
	cameraRay = cameraInverseProjectionMatrix * cameraRay;
	vCameraRay = (cameraRay / cameraRay.w).xyz;

	gl_Position = vec4(position, 1.0);

	// gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}

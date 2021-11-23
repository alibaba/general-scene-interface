#include <common>
#include <packing>

// uniform vec2 texelSize;
// uniform vec2 halfTexelSize;

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

	gl_Position = vec4(position, 1.0);

	// gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}

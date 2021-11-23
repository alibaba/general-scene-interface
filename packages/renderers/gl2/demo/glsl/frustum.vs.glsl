#include <stdvs>

out vec3 pos;
out vec2 v_uv;
out vec3 c;

void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
	pos = position;
	v_uv = uv;
	c = position * cameraPosition;
}

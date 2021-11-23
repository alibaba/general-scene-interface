#include <stdfs>

in vec3 pos;
in vec2 v_uv;
in vec3 c;

void main() {
	// fragColor = vec4( c, 1.0 );
    #if LEVEL == 0
	fragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
    #elif LEVEL == 1
    fragColor = vec4( 0.0, 1.0, 0.0, 1.0 );
    #else
    fragColor = vec4( 0.0, 0.0, 1.0, 1.0 );
    #endif
}

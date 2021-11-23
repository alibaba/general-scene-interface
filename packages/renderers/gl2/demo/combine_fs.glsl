#version 300 es

precision highp float;
precision highp int;

uniform sampler2D tex;
uniform sampler2D texOrigin;
uniform float mixParam;

out vec4 fragColor;
in vec2 pos;

void main() {
	// fragColor = vec4( pos, 1.0 );
	// fragColor = texture(tex, pos.xy);
	// fragColor = texture(tex, pos);
	fragColor = mix(texture(tex, pos), texture(texOrigin, pos), mixParam);
	// fragColor.rg += pos / 2.0;
}

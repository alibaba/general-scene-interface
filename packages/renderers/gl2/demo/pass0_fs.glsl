#version 300 es

precision highp float;
precision highp int;

uniform sampler2D tex;

uniform int type;

out vec4 fragColor;
in vec2 pos;

void main() {
	fragColor = texture(tex, pos);
	if(type == 1)
	{
		fragColor.rg += pos / 2.0;
	}
	else
	{
		fragColor.rg += pos.yx / 3.0;
	}

}

#version 300 es

precision highp float;
precision highp int;

layout(location = 3) in vec2 position;
// in vec2 position;

void main()
{
    gl_Position = vec4(position.x, position.y, 0.0, 1.0);
    gl_PointSize = 5.0;
}

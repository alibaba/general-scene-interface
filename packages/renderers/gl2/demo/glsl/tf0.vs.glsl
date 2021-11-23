#version 300 es

precision highp float;
precision highp int;

layout(location = 2) in vec2 position;
// in vec2 position;

out vec2 v_position;
out vec2 v_position2;

void main()
{
    v_position = position;
    v_position.x += 0.02;
    if (v_position.x > 1.0) {
        v_position.x = -1.0;
    }

    v_position2 = v_position;

    gl_Position = vec4(position.x, position.y, 0.0, 1.0);
    gl_PointSize = 5.0;
}

#version 300 es

precision highp float;
precision highp int;

layout(location = 2) in vec2 position;
layout(location = 4) in vec2 v;

uniform vec2 center;

out vec2 v_position;
out vec2 v_v;

out vec2 vColor;

void main()
{
    vec2 pos = position + v;
    vec2 vel = v * 0.5;

    vec2 toCenter = center - pos;
    float len = length(toCenter);
    vec2 a = toCenter / 1000.0 / pow(len, 2.0);
    // if (length(a) > .1) {
    //     a = a / length(a) * .1;
    // }
    vel += a;

    // if (length(vel) > .1) {
    //     vel = vel / length(vel) * .1;
    // }
    // v_position.x += 0.02;
    // if (v_position.x > 1.0) {
    //     v_position.x -= 2.0;
    // }

    v_position = pos;
    v_v = vel;

    vColor = vel;

    gl_Position = vec4(position.x, position.y, 0.0, 1.0);
    gl_PointSize = 1.0;
}

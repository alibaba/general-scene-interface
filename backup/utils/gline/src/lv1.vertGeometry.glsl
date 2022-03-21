// precision highp float;
// precision highp int;
//
// uniform mat4 projectionMatrix;
// uniform mat4 modelViewMatrix;

// attribute vec3 curr;

// attribute float u;

// #ifdef USE_COLORS
// attribute vec4 color;
// varying vec4 vColor;
// #endif

// varying vec2 vUv;

// void main() {
    // gl_Position = projectionMatrix * modelViewMatrix * vec4(curr, 1.0);

    position = vec3(curr);

    vUv = vec2(u, 0.5);

    #ifdef USE_COLORS
        vColor4 = color;
    #endif
// }

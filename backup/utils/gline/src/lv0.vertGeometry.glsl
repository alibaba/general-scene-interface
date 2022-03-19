// precision highp float;
// precision highp int;
//
// uniform mat4 projectionMatrix;
// uniform mat4 modelViewMatrix;

// uniform float pointSize;

// attribute vec3 curr;

// attribute float u;

// #ifdef USE_COLORS
//     attribute vec4 color;
//     varying vec4 vColor;
// #endif

// varying vec2 vUv;

// void main() {
    // gl_Position = projectionMatrix * modelViewMatrix * vec4(curr, 1.0);
    // 如果超了就抛出窗口不画
    // gl_Position.x += step(INFINITY, gl_Position.x) * INFINITY;
    // #ifdef USE_PERSPECTIVE
    //     vec4 mvPosition = modelViewMatrix * vec4(curr, 1.0);
    //     gl_PointSize = pointSize / - mvPosition.z;
    // #else
    //     gl_PointSize = pointSize;
    // #endif

    position = vec3(curr);

    vUv = vec2(u, 0.5);

    #ifdef USE_COLORS
        vColor4 = color;
    #endif
// }

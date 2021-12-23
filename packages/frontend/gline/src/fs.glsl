// precision highp float;
// precision highp int;

// uniform vec3 uColor;
// uniform float opacity;

// #ifdef SHADER_NAME // three
    // uniform sampler2D map;
// #endif

// #ifdef USE_COLORS
//     varying vec4 vColor;
// #endif

// #if LEVEL > 0
//     varying vec2 vUv;
// #endif

// void main() {

    #if  LEVEL < 1
        vec2 vUv = gl_PointCoord;
    #endif

    #ifdef USE_TEXTURE
		fragColor = texture2D(TEX, vec2(vUv.y, vUv.x));
        fragColor.a *= opacity;
    #else
        #ifdef USE_COLORS
		    fragColor = vec4(vColor4);
            fragColor.a *= opacity;
        #else
            fragColor = vec4(uColor, opacity);
        #endif
    #endif

    #ifdef USE_ALPHA_TEST
        if (fragColor.a < alphaTest) {
            discard;
        }
    #endif
// }

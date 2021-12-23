vec2 toScreen(in vec4 i, in float aspect) {
    vec2 res = i.xy / i.w;
    res.x *= aspect;
    return res;
}
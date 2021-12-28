float aspect = resolution.x / resolution.y;
mat4 mvp = projectionMatrix * modelViewMatrix; // mvp矩阵

// 换算成屏幕坐标, 乘上一个系数避免过细
float width_screen = 1.0 / (resolution.x) * lineWidth;
// NOTE: 避免屏幕宽度越小线宽越大
// 直接使用矩阵的话会导致相机FOV影响可视宽度
// width_screen /= projectionMatrix[0][0];
width_screen *= aspect;

// NOTE: *=(mvp * vec4(curr, 1.0)).w 可以去除透相机的影响(perspective_divisionn的逆过程)
// NOTE: 使用透视的时候是没办法规定相对于屏幕的宽度的, 不然就不叫透视了, *= 100能看起来不要太细
#ifdef USE_PERSPECTIVE
    // 去除FOV的影响
    width_screen *= 100.0 * projectionMatrix[1][1];
#else
    width_screen *= (mvp * vec4(curr, 1.0)).w;
#endif

float width = width_screen * 0.5; // 每边延展一半宽度

// 映射到屏幕上的坐标
float abs_side = abs(side);
float _side; // 扩展方向系数
vec2 curr_screen;
vec2 prev_screen;
vec2 next_screen;
if(abs_side < 5.0 ) { // 正常点
    curr_screen = toScreen(mvp * vec4(curr, 1.0), aspect);
    prev_screen = toScreen(mvp * vec4(prev, 1.0), aspect);
    next_screen = toScreen(mvp * vec4(next, 1.0), aspect);
    _side = side;
} else if (abs_side > 15.0) { // end点
    curr_screen = toScreen(mvp * vec4(curr, 1.0), aspect);
    prev_screen = toScreen(mvp * vec4(prev, 1.0), aspect);
    next_screen = curr_screen;
    _side = side - 20.0;
} else { // start点
    curr_screen = toScreen(mvp * vec4(curr, 1.0), aspect);
    prev_screen = curr_screen;
    next_screen = toScreen(mvp * vec4(next, 1.0), aspect);
    _side = side - 10.0;
}

_side = _side / abs(_side);

vUv = vec2(u, sign(_side) / 2.0 + 0.5);

vec2 dir;    // 合成方向
vec2 n;      // 扩展方向
vec2 offset; // 扩展向量

if(prev_screen == curr_screen && next_screen == curr_screen) {
    // 三点重合, 无法计算中间方向
    dir = vec2(1.0, 0.0); // TODO: 可能和 before 或 next 重合
    n = vec2(-dir.y, dir.x);
    offset = n * width * _side;
} else if(prev_screen == curr_screen) {
    dir = normalize(next_screen - curr_screen);
    n = vec2(-dir.y, dir.x);
    offset = n * width * _side;
} else if(next_screen == curr_screen) {
    dir = normalize(curr_screen - prev_screen);
    n = vec2(-dir.y, dir.x);
    offset = n * width * _side;
} else {
    vec2 before = normalize(curr_screen - prev_screen);
    vec2 after  = normalize(next_screen - curr_screen);
    dir = normalize(before + after);
    // dir = (dir.x < 0.0) ? -dir : dir;

    // NOTE: 这种旋转方式需要考虑到方向向左←的线, 转了之后会向下
    vec2 perpToBefor = vec2(-before.y, before.x);
    vec2 perpToDir   = vec2(-dir.y, dir.x);
    float cosAlpha = abs(dot(perpToBefor, perpToDir));
    vec2 dirAng = before - after; // 夹角指向

    #if (LEVEL == 4)
        // NOTE: 防止角度过小导致宽度过大出现变形
        if(cosAlpha < 0.7)
        {
            // 以合成方向作为转折角
            n = dir;
            _side = (abs(side) < 2.5) ? (-_side) : (_side); // - + + -
            _side = (dirAng.y > 0.0) ? _side : -_side; // 若夹角朝下, 则反转
            _side = (dir.x > 0.0) ? _side : -_side; // 纠正旋转方向
            width /= cosAlpha;
            width /= (sqrt(1.0 - pow(cosAlpha, 2.0)) / cosAlpha);
            offset = n * width * _side * 1.0;
        }
        else
        {
            n = vec2(-dir.y, dir.x);
            width /= cosAlpha;
            offset = n * width * _side;
        }
    #endif

    #if (LEVEL == 2)
        n = vec2(-dir.y, dir.x);
        cosAlpha = max(0.3, cosAlpha);
        width /= cosAlpha;
        offset = n * width * _side;
    #endif
}

offset.x /= aspect;

vec4 result = mvp * vec4(curr, 1.0); // 未进行 perspective division 的屏幕坐标
result.xy += offset.xy;
glPosition = result; // gl 自动进行perspective division转换为真正的屏幕坐标

#ifdef USE_COLORS
    vColor4 = color / 255.0;
#endif
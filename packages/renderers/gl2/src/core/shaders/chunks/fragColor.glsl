

layout(location=0) out highp vec4 fragColor;
// out highp vec4 pc_fragColor;
#define gl_FragColor fragColor

// mrt
// TODO 需不需要删掉无用的
layout(location=1) out vec4 fragColor1;
layout(location=2) out vec4 fragColor2;
layout(location=3) out vec4 fragColor3;
layout(location=4) out vec4 fragColor4;
layout(location=5) out vec4 fragColor5;
layout(location=6) out vec4 fragColor6;
layout(location=7) out vec4 fragColor7;
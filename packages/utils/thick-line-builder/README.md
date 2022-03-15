# Thick Line Builder

Extend line strings into triangle meshes with **uv**, dynamic width and **miter/bevel/round joint**.

This tool generates "noodle-like" meshes, with no thickness, that always face the positive z-axis.

This tool can generate optional UV(`u` along the length and `v` long the width) that is evenly distributed along the actual length rather than the count of points. UV will be delicately handled for different kind of joint to "morph" along the shape of the line.

An alternative method, `buildMultiThickLine`, is provided to generate non-continuous line segments with continuous UV. If you want a single geometry with non-continuous line segments and independent UV. Use `buildThickLine` to generate geom for each segment and merge them.

If you want thick lines that always face the camera (extended in screen space). You should use `@gs.i/frontend-gline`. Gline generates thick lines with **miter and bevel joint** in shaders.

### miter

![](https://img.alicdn.com/imgextra/i3/O1CN01gkYTxm1kwArpTCe6C_!!6000000004747-2-tps-659-666.png)

### bevel with continuous UV

![](https://img.alicdn.com/imgextra/i1/O1CN01h518TC28H02UUL4vm_!!6000000007906-2-tps-894-670.png)

### round

![](https://img.alicdn.com/imgextra/i2/O1CN01jn6Nrc1YY6fOkLmIP_!!6000000003070-2-tps-721-559.png)


# Thick Line Builder

Extend line strings into triangle meshes with **uv**, dynamic width and **miter/bevel/round joint**.

This generates "noodle-like" meshes, with no thickness, that always face the positive z-axis.

If you want thick lines that always face the camera (extended in screen space). You should use `@gs.i/frontend-gline`. Gline generates thick lines with **miter and bevel joint** in shaders.
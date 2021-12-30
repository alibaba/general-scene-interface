# Extended interface schema

Non-scene-graph schema

This part of schema is not a part of scene-graph, not meant to be handled by converters/processors.

It describes how the scene should look like, 
in a loose & semantic & result-oriented manner.

Witch we believe is the only possible way to make an standard interface for visual styles and render techniques.

It is not possible or fair to describe the "progress" of rendering in order to get the same output image. Underlying realtime-render-engines have very different style orientations and hardware acceleration techniques. It will be a huge waste if we design a standard "progress-based pipeline definition" but only works for one graphic api.

- global (environment) lighting
- shadow
- anti-alias
- background
- post processing
- fog
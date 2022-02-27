# Structure of General Scene Interface

## Sections

This project contains 4 sections:

- **Schema**: The definition of `General Scene Interface` as an `IR` (intermediate representation)
- **Frontend**: Tools to generate and modify `GSIR`, including converting other scene graph into `GSIR`.
- **Processors**: Tools to process `GSIR`. Including common algorithms like matrix calculation, bounds generation, culling, raycasting and simplification etc.
- **Backend**: Tools to render `GSIR` or translate `GSIR` into another scene graph so that it can be rendered by other renderers.

And an extra section for **Utilities** that are shared or supporting the above sections.

## Usage

The philosophy of GSI project is to use an well-defined IR as a `protocol` to break up 3D development pipeline into independent stages that can be optimized, standardized and reused without concerning the underlying renderer or usage scenarios.



## Principles

- Schema should be static data structure definition. A good IR should be unbiased, language independent and extensive.
- Frontend should consider IR as `write-only`
- Backend should consider IR as `read-only`
- Processors should focus on single task and impli ...
# changelog

## 2021-12-14

Only schema-scene changes are listed.


### drop the idea of generating glsl from programable material

user should write their own definition code (uniforms, attributes, varying in out)

it's not very useful if generated code can only handle the difference between webgl1 & 2 because that can be archived by simple pre-processors

until we find a solution for cross-language compatibility, better not promise anything

- rm `Programable::UniformDataType.type`
- rm `Programable.attributes`
- rm `Programable.varyings`
- add `Programable.global` for shared global code

### potential naming pattern

> **VERY LIKELY TO CHANGE IN THE FUTURE**

naming pattern not settled yet.

- rename `TextureType` -> `Texture`, `CubeTextureType` ->`CubeTexture`, 

likely to be conflict with other engines' naming.

---

## 2021-12-06 Simon

Refine transformation definition.

- separate `Transform3` into `Transform3TRS` and `Transform3Matrix` (follow gltf spec)
- separate `Transform2` (follow `Transform3`)
- add `version` to `Transform3` and `Transform2` to make matrix cache easier, default `-1` means `never cache`
- add `versioned` interface. version `-1` means `always dirty`

---

## 2021-12-02 Simon

Refine scene schema & add processor logic.

- rename package `@gs.i/schema-core` to `@gs.i/schema-scene`
  move old codes into `core-old` folder
- bump some versions to `0.1.0-alpha`
- add `@gs.i/schema-converter`
- add `@gs.i/schema-processor`  
- add `@gs.i/utils-specify`
- add `@gs.i/utils-traverse`

### @gs.i/schema-scene

Specify the core schema; move unsure interface into extensions.

ts

- make some of the optional members required

types:

- use `Double` and `Int` instead of `number` type (readability)
- rename `BBox3` to `AABBox3` since it only represents AABB(axes-align-bounding-box)

other:

- move programable matr into extensions
- move depth test/write into extensions
- move renderOrder into extensions
- move flipY and htmlImage into extensions

- remove `MatrPointDataType.vertPointSize` and `MatrSpriteDataType.useAttrSize`.
  use programable extension instead

- rename `Material.alphaCutoff` to `Material.opacity` (same semantic)
- rename `Material.commitedVersion` tp `Material.committedVersion` 🙄️

- split `Mesh` into `RenderableMesh` and `Node`

- move `Geometry.boundingBox` and `Geometry.boundingSphere` to extensions
  These should be calculated when used, not inputted by user.
  Use extension to specify a ‘baggy’ bounding for dynamic geometries.
  不应该让用户输入静态 geometry 的 bounds，应该在用到的时候计算并缓存；
  不应该让用户从 schema 读取其他流程计算出来的 bounding。
- move `Geometry.drawRange` into extensions

- remove `AttributeDataType.committedVersion`
- move `AttributeDataType.updateRanges` into extensions

- rename `ImageDataType.image` to `ImageDataType.data`

##### Programable Material

Prefix all slots with `vert` or `frag`.

- rename slot `preVert` to `vertGlobal`
- rename slot `preFrag` to `fragGlobal`
- remove `postVert`
- add `fragOutput` same semantic as `vertOutput`

---

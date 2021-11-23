# GL2

## 关于 WebGL2

### glsl 语法

- WebGL2 的 shader 语法（300）与 webgl1（100）不同，webgl2 兼容 100 语法，但是一个 shader 文件只能使用一种语法，不能同时出现 100 和 300
- 300 语法中，第一行（前面不能有任何东西，包括空格）必须是 300 版本声明，然后必须是精度声明，vs 和 fs 精度要保持一致，建议使用最低精度 lowp
- webgl2 将一些 1 中的插件内置了，如果再试图声明使用这些插件就会报错
- 其他区别详见 https://webgl2fundamentals.org/webgl/lessons/webgl1-to-webgl2.html

### 环境

- 新版本 chrome 和 ff 都支持，但是 window 环境下 chrome 默认使用 directX 驱动的 angle，该实现有一些性能问题（主要是使用 flat 关键字的时候）
- window 下强制使用 opengl 驱动的 Angle 的方式是：
  - 先关闭所有 chrome 页面
  - 创建一个 chrome 快捷方式，在目标的最后（引号外）加上 `---use-angle=gl`
  - 使用这个快捷方式打开 chrome
  - 可以打开 `chrome://gpu` 查看 `GL_RENDERER` 一行，如果是有 OpenGL 字样无 DirectX 字样则修改成功

## GL2

逻辑层尽可能复用了 THREE，支持多数 THREE 的接口，包括 BufferGeometry、(Raw)ShaderMaterial、Mesh、Line、LineSegments、Points、Camera 等。

与 THREE 的区别包括：

- WebGL2 实现
- 所有 Attributes 使用 VAO 实现
- 增加 UBO 接口（Block），绘制大量同类物体时能带来巨大性能提升
- 增加 TF，支持纯 GPU 计算，适合用于复杂粒子动画
- 目前没有计划支持 THREE 的骨骼动画等系统

### 关于 Block（UBO）

在一个 Buffer 中放一组 Uniform（可以包含 float、vec、mat，不能包含 texture，int 未验证），绑定到一个绑定点上，然后任何一个 shader 只需要绑定到这个绑定点就可以获取到这些 Uniform。
如果有一些 Uniform 要在大量物体之间共享，该特性能节约掉大量 IO 调用。

#### 接口

```javascript
// 新建一个Block实例，命个名，为了与Uniform区别，建议全大写
const block = new GL2.Block('BUILDING')

// 放入数据
block.uniforms = {
	alphaLimit: new THREE.Vector2(0, 1),
	opacity: 1.0,
}

// 然后就可以在多个Material中共享了：）
const matr0 = new THREE.RawShaderMaterial({
	blocks: { BUILDING: block },

	uniforms: { texture0: { value: texture0 } },
	vertexShader: vs,
	fragmentShader: fs,
	transparent: true,
	defines: {},
})
```

在对应的 vs 和 fs 中必须都要有这样的声明:

```cpp
uniform BUILDING {
	uniform vec2 alphaLimit;
	uniform float opacity;
};
```

然后就可以在 shader 中使用这些 Uniform 了，使用时不需要加命名域：

```cpp
float a = alphaLimit.x;
float o = opacity * 3.0;
```

可以修改 Block 中的值，并需要主动更新

```javascript
timeline.addTrack({
	duration: 4000,
	onUpdate: (time, p) => {
		this.block.uniforms.opacity = p
		// 一定要调用这个哦！
		this.block.needsUpdate = true
	},
})
```

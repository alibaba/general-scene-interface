# cubs.js

微型 canvas 绘图库，暂定名 cubs.js （老虎幼崽）

提供 DOM 风格的事件和样式接口（类似 G）

cub 不对标 G 或 paper.js，不提供新的图形API，而是对 canvas 的简单封装，提供物体粒度的样式、状态和鼠标事件，以及常用的图形编辑与绘制工具。

适用场景：使用 canvas 开发 2D 可视化或交互式图形的应用

目标用户：了解 canvas 接口，不希望引入大型框架或三方场景定义的开发者

```typescript
const scene = new Scene(canvas)
scene.addEventListener('pointerdown', (e) => {
	console.log('pointer down', e)
})

const shape = new Shape()

shape.styles.fillStyle = 'red'
shape.hoverStyle.fillStyle = 'blue'

shape.addEventListener('pointerdown', (e) => {
	console.log('pointer down on shape', e)
})

scene.add(shape)
```

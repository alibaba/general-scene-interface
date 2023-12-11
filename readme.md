# 🐯 cubs.js

微型 canvas 绘图库，暂定名 cubs.js （老虎幼崽）

提供 DOM 风格的事件和样式接口，以及常用的图形编辑与绘制方法。

> cubs 不对标 G 或 paper.js，不提供新的图形API，而是对 canvas 的简单封装，提供物体粒度的状态控制以及配套的绘图工具。

## 🎯 目标场景

适用场景：使用 canvas 开发 2D 可视化或交互式图形的应用

目标用户：了解 canvas 接口，不希望引入大型框架、场景定义的开发者

## 🚀 Usage

```typescript
const scene = new Scene(canvas)

scene.addEventListener('pointerdown', (e) => {
	console.log('pointer down', e)
})

const shape = new RectShape()

shape.styles.fillStyle = 'red'
shape.hoverStyle.fillStyle = 'blue'

shape.addEventListener('pointerdown', (e) => {
	console.log('pointer down on shape', e)
})

scene.add(shape)
```

## 📐 自定义 Shape

```typescript
class MyShape extends Shape {
	// 实现以下两个抽象方法

	hit(x: number, y: number, ctx: CanvasRenderingContext2D): boolean | undefined | object {
		// 将transform逆作用于坐标
		const { x: tx, y: ty } = this._translate
		const s = this._scale

		const revX = (x - tx) / s
		const revY = (y - ty) / s

		// 使用 图形算法 或者 canvas Path2D 接口判断是否命中
		// 若命中，返回详细信息或者 true，否则返回 false 或者 undefined
	}

	draw(ctx: CanvasRenderingContext2D): void {
		// 使用 ctx 绘制图形
		// 注意 transform 变换，先缩放再平移。x,y 为图形的局部原点
	}
}
```

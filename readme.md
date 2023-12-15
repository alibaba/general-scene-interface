# 🐯 cubs.js

[🏠 Homepage](https://gaomeng1900.github.io/cubs.js)

轻量级 canvas 绘图库

- 轻量级模块化（所有模块 gzip 7k）
- DOM 风格的事件和样式接口
- Shape 粒度的隔离与控制，场景树接口
- 常见图元（点、线、折线、多边形、矩形、圆形、图片）
- 鼠标交互、图形编辑工具、绘图工具

> 不对标 G 或 paper.js 等图形框架，不提供新的图形API，不封装底层图形接口

## 🎯 目标场景

适用场景：使用 canvas 开发 2D 可视化或交互式图形的应用

目标用户：了解 canvas 接口，不希望引入大型框架、场景定义的开发者

## 🚀 Usage

```typescript
const scene = new Scene(canvas)
scenePointerControl(scene) // add pointer control for view
addAxis(scene) // add coordinate axis

scene.addEventListener('pointerdown', (e) => {
	console.log('pointer down', e)
})

// shape
const shape = new RectShape()

shape.styles.fillStyle = 'red'
shape.hoverStyle.fillStyle = 'blue'

shape.addEventListener('pointerdown', (e) => {
	console.log('pointer down on shape', e)
})

scene.add(shape)

editRect(shape) // add edit tool for rect shape
```

## 📐 自定义 Shape

```typescript
class MyShape extends Shape {
	hit(x: number, y: number, ctx: CanvasRenderingContext2D): boolean | undefined | object {
		const { x: localX, y: localY } = this.viewToLocal(x, y)

		// 使用 图形算法 或者 canvas Path2D 接口判断是否命中
		// 若命中，返回详细信息或者 true，否则返回 false 或者 undefined
	}

	draw(ctx: CanvasRenderingContext2D): void {
		// 使用 ctx 绘制图形
		// 使用 this.localToView(x, y) 将本地坐标转换为canvas坐标
	}
}
```

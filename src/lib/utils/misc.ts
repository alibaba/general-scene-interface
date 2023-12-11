// random id
export function randomID(existingIDs?: string[]): string {
	let id = Math.random().toString(36).substr(2, 9)

	if (!existingIDs) {
		return id
	}

	const MAX_TRY = 100
	let tryCount = 0

	while (existingIDs.includes(id)) {
		id = Math.random().toString(36).substr(2, 9)
		tryCount++
		if (tryCount > MAX_TRY) {
			throw new Error('randomID: too many try')
		}
	}

	return id
}

export function loadImage(src: string, crossOrigin?: string) {
	return new Promise<HTMLImageElement>((resolve, reject) => {
		const img = new Image()
		if (crossOrigin) img.crossOrigin = crossOrigin
		img.onload = () => resolve(img)
		img.onerror = reject
		img.src = src
	})
}

export function minmax(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}

export function constrainPoint(
	point: { x: number; y: number },
	bbox: readonly [number, number, number, number]
) {
	point.x = minmax(point.x, bbox[0], bbox[2])
	point.y = minmax(point.y, bbox[1], bbox[3])
}

/**
 * 用包围盒限制矩形区域，超出则压缩
 */
export function constrainRect(
	rect: { x: number; y: number; width: number; height: number },
	bbox: [number, number, number, number]
) {
	// 纠正方向
	if (rect.width < 0) {
		rect.width = -rect.width
		rect.x -= rect.width
	}
	if (rect.height < 0) {
		rect.height = -rect.height
		rect.y -= rect.height
	}

	const left = minmax(rect.x, bbox[0], bbox[2])
	const top = minmax(rect.y, bbox[1], bbox[3])
	const right = minmax(rect.x + rect.width, bbox[0], bbox[2])
	const bottom = minmax(rect.y + rect.height, bbox[1], bbox[3])

	rect.x = left
	rect.y = top
	rect.width = right - left
	rect.height = bottom - top
}

export function constrainSegment(
	segment: { x: number; y: number; dx: number; dy: number },
	bbox: [number, number, number, number]
) {
	const newX = minmax(segment.x, bbox[0], bbox[2])
	const newY = minmax(segment.y, bbox[1], bbox[3])

	if (newX !== segment.x || newY !== segment.y) {
		segment.dx -= newX - segment.x
		segment.dy -= newY - segment.y
		segment.x = newX
		segment.y = newY
	}

	segment.dx = minmax(segment.dx, bbox[0] - segment.x, bbox[2] - segment.x)
	segment.dy = minmax(segment.dy, bbox[1] - segment.y, bbox[3] - segment.y)
}

/**
 * 用包围盒限制折线/多边形区域，超出则压缩
 */
export function constrainPoly(
	polyline: { x: number; y: number; points: { x: number; y: number }[] },
	bbox: [number, number, number, number]
) {
	const localBbox = [
		bbox[0] - polyline.x,
		bbox[1] - polyline.y,
		bbox[2] - polyline.x,
		bbox[3] - polyline.y,
	] as const

	for (const point of polyline.points) {
		constrainPoint(point, localBbox)
	}
}

export function randomColor(alpha = 1, seed = Math.random()) {
	const h = Math.floor(seed * 360)
	const s = 100
	const l = 50
	return `hsla(${h}, ${s}%, ${l}%, ${alpha})`
}

/**
 * polyfill of Array.prototype.findLast
 */
export function findLast<T>(array: T[], predicate: (value: T) => boolean) {
	for (let i = array.length - 1; i >= 0; i--) {
		if (predicate(array[i])) {
			return array[i]
		}
	}
}

export function getBbox(points: { x: number; y: number }[]) {
	let minX = Infinity
	let minY = Infinity
	let maxX = -Infinity
	let maxY = -Infinity

	for (const point of points) {
		minX = Math.min(minX, point.x)
		minY = Math.min(minY, point.y)
		maxX = Math.max(maxX, point.x)
		maxY = Math.max(maxY, point.y)
	}

	return [minX, minY, maxX, maxY] as const
}

export function getCenter(points: { x: number; y: number }[]) {
	let x = 0
	let y = 0

	for (const point of points) {
		x += point.x
		y += point.y
	}

	return { x: x / points.length, y: y / points.length }
}

export function getCentroid(points: { x: number; y: number }[]) {
	let area = 0
	let x = 0
	let y = 0

	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const p0 = points[i]
		const p1 = points[j]
		const f = p0.x * p1.y - p1.x * p0.y
		area += f
		x += (p0.x + p1.x) * f
		y += (p0.y + p1.y) * f
	}

	area *= 3
	return { x: x / area, y: y / area }
}

/**
 * 从 multiPolygon 中找到距离 point 最近的 polygon
 * 只考虑外环，只考虑最近的顶点
 */
export function findNearestPolygon(
	multiPolygon: { coordinates: number[][][][] },
	point: { x: number; y: number }
) {
	let minDistance = Infinity
	let nearestPolygon: number[][][] | undefined

	for (const polygon of multiPolygon.coordinates) {
		const bbox = getBbox(polygon[0].map(([x, y]) => ({ x, y })))
		if (point.x < bbox[0] || point.x > bbox[2] || point.y < bbox[1] || point.y > bbox[3]) {
			continue
		}

		for (const ring of polygon) {
			for (const [x, y] of ring) {
				const distance = (x - point.x) ** 2 + (y - point.y) ** 2
				if (distance < minDistance) {
					minDistance = distance
					nearestPolygon = polygon
				}
			}
		}
	}

	return nearestPolygon
}

/**
 * 从 multiPolygon 中找到距离 point 最近的 polygon 的 bbox
 * 只考虑外环，只考虑最近的顶点
 */
export function findNearestPolygonBbox(
	multiPolygon: { coordinates: number[][][][] },
	point: { x: number; y: number }
) {
	let minDistance = Infinity
	let nearestBbox: readonly [number, number, number, number] | undefined

	for (const polygon of multiPolygon.coordinates) {
		const bbox = getBbox(polygon[0].map(([x, y]) => ({ x, y })))
		if (point.x < bbox[0] || point.x > bbox[2] || point.y < bbox[1] || point.y > bbox[3]) {
			continue
		}

		for (const ring of polygon) {
			for (const [x, y] of ring) {
				const distance = (x - point.x) ** 2 + (y - point.y) ** 2
				if (distance < minDistance) {
					minDistance = distance
					nearestBbox = bbox
				}
			}
		}
	}

	return nearestBbox
}

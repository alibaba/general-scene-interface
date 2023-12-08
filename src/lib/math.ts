/**
 * 计算点到线的垂足（表达为起点到终点的比例）
 */
export function getPerpFoot(px: number, py: number, dx: number, dy: number) {
	const d = dx * dx + dy * dy
	const t = (px * dx + py * dy) / d
	return t
}

/**
 * 计算点到线段的距离
 */
export function distancePointToSegment(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
) {
	// 计算垂点，如果垂点在线段上，则返回垂点到点的距离

	const dx = x2 - x1
	const dy = y2 - y1

	let t = getPerpFoot(px - x1, py - y1, dx, dy)

	t = Math.max(0, Math.min(1, t))

	const x = x1 + t * dx
	const y = y1 + t * dy

	return distance(px, py, x, y)
}

/**
 * 计算点到线段的距离
 * - 向量版本（p 和 p2 都是相对于 p1 的向量）
 */
export function distancePointToSegmentVector(px: number, py: number, dx: number, dy: number) {
	// 计算垂点，如果垂点在线段上，则返回垂点到点的距离

	let t = getPerpFoot(px, py, dx, dy)

	t = Math.max(0, Math.min(1, t))

	const x = t * dx
	const y = t * dy

	return distance(px, py, x, y)
}

export function distance(x1: number, y1: number, x2: number, y2: number) {
	return Math.sqrt(distanceSquared(x1, y1, x2, y2))
}

export function distanceSquared(x1: number, y1: number, x2: number, y2: number) {
	return (x1 - x2) ** 2 + (y1 - y2) ** 2
}

export function length(x: number, y: number) {
	return Math.sqrt(x ** 2 + y ** 2)
}

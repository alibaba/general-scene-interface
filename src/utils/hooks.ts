import { MutableRefObject, useEffect, useState } from 'react'

export function useSize2(elem: MutableRefObject<HTMLElement>, interval = 200) {
	const [width, setWidth] = useState(0)
	const [height, setHeight] = useState(0)

	useEffect(() => {
		const handler = () => {
			const e = elem.current
			if (!e) return

			const width = e.clientWidth
			const height = e.clientHeight

			// note: set 相同值不会触发渲染
			setWidth(width)
			setHeight(height)

			// console.log('size effect', width, height)
		}

		handler()

		const timer = setInterval(handler, interval)

		return () => {
			clearInterval(timer)
			// console.log('size effect cleanup')
		}
	}, [elem, interval])

	return [width, height]
}

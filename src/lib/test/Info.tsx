import React, { useState } from 'react'

import styles from './Info.module.css'

type Props = {
	header?: string | JSX.Element
	main?: string | JSX.Element
	footer?: string | JSX.Element

	children?: React.ReactNode
}

/**
 * 显示帮助信息
 */
export default function Info(props: Props) {
	const header = props.header || '使用说明'

	const main = props.children || props.main || '👋'

	const [show, setShow] = useState(false)

	return (
		<div className={styles.wrapper + (show ? ' ' + styles.show : '')}>
			<div className={styles.contentOuterWrapper}>
				<div className={styles.contentWrapper}>
					{header && <header>{header}</header>}
					<main>{main}</main>
					{props.footer && <footer>{props.footer}</footer>}
				</div>
			</div>
			<div
				className={styles.tipButtonWrapper}
				onClick={(e) => {
					setShow((s) => !s)
					e.preventDefault()
					e.stopPropagation()
				}}>
				<div className={styles.tipButton}></div>
			</div>
		</div>
	)
}

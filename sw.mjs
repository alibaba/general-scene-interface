/* eslint-disable node/no-extraneous-import */
import { NavigationRoute, Route, registerRoute } from 'workbox-routing'
import { NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies'

console.log('sw.js version: 0.0.1')

// localhost 放行
registerRoute(
	new Route(({ url }) => {
		return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
	}, new NetworkOnly())
)

// nav
// registerRoute(new NavigationRoute(new StaleWhileRevalidate()))

// 已知安全的固定地址服务，缓存优先，长时间不过期
registerRoute(
	new Route(
		({ url }) => {
			return true
		},
		new StaleWhileRevalidate({
			cacheName: 'sw-cache-main',
		}),
		'GET'
	)
)

;(function () {
	'use strict'
	try {
		self['workbox:core:7.0.0'] && _()
	} catch {}
	const O = (r, ...e) => {
		let t = r
		return e.length > 0 && (t += ` :: ${JSON.stringify(e)}`), t
	}
	class f extends Error {
		constructor(e, t) {
			const s = O(e, t)
			super(s), (this.name = e), (this.details = t)
		}
	}
	const F = null
	try {
		self['workbox:routing:7.0.0'] && _()
	} catch {}
	const b = 'GET',
		w = (r) => (r && typeof r == 'object' ? r : { handle: r })
	class d {
		constructor(e, t, s = b) {
			;(this.handler = w(t)), (this.match = e), (this.method = s)
		}
		setCatchHandler(e) {
			this.catchHandler = w(e)
		}
	}
	class P extends d {
		constructor(e, t, s) {
			const a = ({ url: i }) => {
				const n = e.exec(i.href)
				if (n && !(i.origin !== location.origin && n.index !== 0)) return n.slice(1)
			}
			super(a, t, s)
		}
	}
	const U = (r) =>
		new URL(String(r), location.href).href.replace(new RegExp(`^${location.origin}`), '')
	class S {
		constructor() {
			;(this._routes = new Map()), (this._defaultHandlerMap = new Map())
		}
		get routes() {
			return this._routes
		}
		addFetchListener() {
			self.addEventListener('fetch', (e) => {
				const { request: t } = e,
					s = this.handleRequest({ request: t, event: e })
				s && e.respondWith(s)
			})
		}
		addCacheListener() {
			self.addEventListener('message', (e) => {
				if (e.data && e.data.type === 'CACHE_URLS') {
					const { payload: t } = e.data,
						s = Promise.all(
							t.urlsToCache.map((a) => {
								typeof a == 'string' && (a = [a])
								const i = new Request(...a)
								return this.handleRequest({ request: i, event: e })
							})
						)
					e.waitUntil(s), e.ports && e.ports[0] && s.then(() => e.ports[0].postMessage(!0))
				}
			})
		}
		handleRequest({ request: e, event: t }) {
			const s = new URL(e.url, location.href)
			if (!s.protocol.startsWith('http')) return
			const a = s.origin === location.origin,
				{ params: i, route: n } = this.findMatchingRoute({
					event: t,
					request: e,
					sameOrigin: a,
					url: s,
				})
			let c = n && n.handler
			const o = e.method
			if ((!c && this._defaultHandlerMap.has(o) && (c = this._defaultHandlerMap.get(o)), !c)) return
			let u
			try {
				u = c.handle({ url: s, request: e, event: t, params: i })
			} catch (l) {
				u = Promise.reject(l)
			}
			const g = n && n.catchHandler
			return (
				u instanceof Promise &&
					(this._catchHandler || g) &&
					(u = u.catch(async (l) => {
						if (g)
							try {
								return await g.handle({ url: s, request: e, event: t, params: i })
							} catch (E) {
								E instanceof Error && (l = E)
							}
						if (this._catchHandler)
							return this._catchHandler.handle({ url: s, request: e, event: t })
						throw l
					})),
				u
			)
		}
		findMatchingRoute({ url: e, sameOrigin: t, request: s, event: a }) {
			const i = this._routes.get(s.method) || []
			for (const n of i) {
				let c
				const o = n.match({ url: e, sameOrigin: t, request: s, event: a })
				if (o)
					return (
						(c = o),
						((Array.isArray(c) && c.length === 0) ||
							(o.constructor === Object && Object.keys(o).length === 0) ||
							typeof o == 'boolean') &&
							(c = void 0),
						{ route: n, params: c }
					)
			}
			return {}
		}
		setDefaultHandler(e, t = b) {
			this._defaultHandlerMap.set(t, w(e))
		}
		setCatchHandler(e) {
			this._catchHandler = w(e)
		}
		registerRoute(e) {
			this._routes.has(e.method) || this._routes.set(e.method, []),
				this._routes.get(e.method).push(e)
		}
		unregisterRoute(e) {
			if (!this._routes.has(e.method))
				throw new f('unregister-route-but-not-found-with-method', { method: e.method })
			const t = this._routes.get(e.method).indexOf(e)
			if (t > -1) this._routes.get(e.method).splice(t, 1)
			else throw new f('unregister-route-route-not-registered')
		}
	}
	let p
	const q = () => (p || ((p = new S()), p.addFetchListener(), p.addCacheListener()), p)
	function R(r, e, t) {
		let s
		if (typeof r == 'string') {
			const i = new URL(r, location.href),
				n = ({ url: c }) => c.href === i.href
			s = new d(n, e, t)
		} else if (r instanceof RegExp) s = new P(r, e, t)
		else if (typeof r == 'function') s = new d(r, e, t)
		else if (r instanceof d) s = r
		else
			throw new f('unsupported-route-type', {
				moduleName: 'workbox-routing',
				funcName: 'registerRoute',
				paramName: 'capture',
			})
		return q().registerRoute(s), s
	}
	const h = {
			googleAnalytics: 'googleAnalytics',
			precache: 'precache-v2',
			prefix: 'workbox',
			runtime: 'runtime',
			suffix: typeof registration < 'u' ? registration.scope : '',
		},
		y = (r) => [h.prefix, r, h.suffix].filter((e) => e && e.length > 0).join('-'),
		D = (r) => {
			for (const e of Object.keys(h)) r(e)
		},
		M = {
			updateDetails: (r) => {
				D((e) => {
					typeof r[e] == 'string' && (h[e] = r[e])
				})
			},
			getGoogleAnalyticsName: (r) => r || y(h.googleAnalytics),
			getPrecacheName: (r) => r || y(h.precache),
			getPrefix: () => h.prefix,
			getRuntimeName: (r) => r || y(h.runtime),
			getSuffix: () => h.suffix,
		}
	function k(r, e) {
		const t = new URL(r)
		for (const s of e) t.searchParams.delete(s)
		return t.href
	}
	async function N(r, e, t, s) {
		const a = k(e.url, t)
		if (e.url === a) return r.match(e, s)
		const i = Object.assign(Object.assign({}, s), { ignoreSearch: !0 }),
			n = await r.keys(e, i)
		for (const c of n) {
			const o = k(c.url, t)
			if (a === o) return r.match(c, s)
		}
	}
	class L {
		constructor() {
			this.promise = new Promise((e, t) => {
				;(this.resolve = e), (this.reject = t)
			})
		}
	}
	const j = new Set()
	async function H() {
		for (const r of j) await r()
	}
	function C(r) {
		return new Promise((e) => setTimeout(e, r))
	}
	try {
		self['workbox:strategies:7.0.0'] && _()
	} catch {}
	function m(r) {
		return typeof r == 'string' ? new Request(r) : r
	}
	class v {
		constructor(e, t) {
			;(this._cacheKeys = {}),
				Object.assign(this, t),
				(this.event = t.event),
				(this._strategy = e),
				(this._handlerDeferred = new L()),
				(this._extendLifetimePromises = []),
				(this._plugins = [...e.plugins]),
				(this._pluginStateMap = new Map())
			for (const s of this._plugins) this._pluginStateMap.set(s, {})
			this.event.waitUntil(this._handlerDeferred.promise)
		}
		async fetch(e) {
			const { event: t } = this
			let s = m(e)
			if (s.mode === 'navigate' && t instanceof FetchEvent && t.preloadResponse) {
				const n = await t.preloadResponse
				if (n) return n
			}
			const a = this.hasCallback('fetchDidFail') ? s.clone() : null
			try {
				for (const n of this.iterateCallbacks('requestWillFetch'))
					s = await n({ request: s.clone(), event: t })
			} catch (n) {
				if (n instanceof Error)
					throw new f('plugin-error-request-will-fetch', { thrownErrorMessage: n.message })
			}
			const i = s.clone()
			try {
				let n
				n = await fetch(s, s.mode === 'navigate' ? void 0 : this._strategy.fetchOptions)
				for (const c of this.iterateCallbacks('fetchDidSucceed'))
					n = await c({ event: t, request: i, response: n })
				return n
			} catch (n) {
				throw (
					(a &&
						(await this.runCallbacks('fetchDidFail', {
							error: n,
							event: t,
							originalRequest: a.clone(),
							request: i.clone(),
						})),
					n)
				)
			}
		}
		async fetchAndCachePut(e) {
			const t = await this.fetch(e),
				s = t.clone()
			return this.waitUntil(this.cachePut(e, s)), t
		}
		async cacheMatch(e) {
			const t = m(e)
			let s
			const { cacheName: a, matchOptions: i } = this._strategy,
				n = await this.getCacheKey(t, 'read'),
				c = Object.assign(Object.assign({}, i), { cacheName: a })
			s = await caches.match(n, c)
			for (const o of this.iterateCallbacks('cachedResponseWillBeUsed'))
				s =
					(await o({
						cacheName: a,
						matchOptions: i,
						cachedResponse: s,
						request: n,
						event: this.event,
					})) || void 0
			return s
		}
		async cachePut(e, t) {
			const s = m(e)
			await C(0)
			const a = await this.getCacheKey(s, 'write')
			if (!t) throw new f('cache-put-with-no-response', { url: U(a.url) })
			const i = await this._ensureResponseSafeToCache(t)
			if (!i) return !1
			const { cacheName: n, matchOptions: c } = this._strategy,
				o = await self.caches.open(n),
				u = this.hasCallback('cacheDidUpdate'),
				g = u ? await N(o, a.clone(), ['__WB_REVISION__'], c) : null
			try {
				await o.put(a, u ? i.clone() : i)
			} catch (l) {
				if (l instanceof Error) throw (l.name === 'QuotaExceededError' && (await H()), l)
			}
			for (const l of this.iterateCallbacks('cacheDidUpdate'))
				await l({
					cacheName: n,
					oldResponse: g,
					newResponse: i.clone(),
					request: a,
					event: this.event,
				})
			return !0
		}
		async getCacheKey(e, t) {
			const s = `${e.url} | ${t}`
			if (!this._cacheKeys[s]) {
				let a = e
				for (const i of this.iterateCallbacks('cacheKeyWillBeUsed'))
					a = m(await i({ mode: t, request: a, event: this.event, params: this.params }))
				this._cacheKeys[s] = a
			}
			return this._cacheKeys[s]
		}
		hasCallback(e) {
			for (const t of this._strategy.plugins) if (e in t) return !0
			return !1
		}
		async runCallbacks(e, t) {
			for (const s of this.iterateCallbacks(e)) await s(t)
		}
		*iterateCallbacks(e) {
			for (const t of this._strategy.plugins)
				if (typeof t[e] == 'function') {
					const s = this._pluginStateMap.get(t)
					yield (i) => {
						const n = Object.assign(Object.assign({}, i), { state: s })
						return t[e](n)
					}
				}
		}
		waitUntil(e) {
			return this._extendLifetimePromises.push(e), e
		}
		async doneWaiting() {
			let e
			for (; (e = this._extendLifetimePromises.shift()); ) await e
		}
		destroy() {
			this._handlerDeferred.resolve(null)
		}
		async _ensureResponseSafeToCache(e) {
			let t = e,
				s = !1
			for (const a of this.iterateCallbacks('cacheWillUpdate'))
				if (
					((t = (await a({ request: this.request, response: t, event: this.event })) || void 0),
					(s = !0),
					!t)
				)
					break
			return s || (t && t.status !== 200 && (t = void 0)), t
		}
	}
	class x {
		constructor(e = {}) {
			;(this.cacheName = M.getRuntimeName(e.cacheName)),
				(this.plugins = e.plugins || []),
				(this.fetchOptions = e.fetchOptions),
				(this.matchOptions = e.matchOptions)
		}
		handle(e) {
			const [t] = this.handleAll(e)
			return t
		}
		handleAll(e) {
			e instanceof FetchEvent && (e = { event: e, request: e.request })
			const t = e.event,
				s = typeof e.request == 'string' ? new Request(e.request) : e.request,
				a = 'params' in e ? e.params : void 0,
				i = new v(this, { event: t, request: s, params: a }),
				n = this._getResponse(i, s, t),
				c = this._awaitComplete(n, i, s, t)
			return [n, c]
		}
		async _getResponse(e, t, s) {
			await e.runCallbacks('handlerWillStart', { event: s, request: t })
			let a
			try {
				if (((a = await this._handle(t, e)), !a || a.type === 'error'))
					throw new f('no-response', { url: t.url })
			} catch (i) {
				if (i instanceof Error) {
					for (const n of e.iterateCallbacks('handlerDidError'))
						if (((a = await n({ error: i, event: s, request: t })), a)) break
				}
				if (!a) throw i
			}
			for (const i of e.iterateCallbacks('handlerWillRespond'))
				a = await i({ event: s, request: t, response: a })
			return a
		}
		async _awaitComplete(e, t, s, a) {
			let i, n
			try {
				i = await e
			} catch {}
			try {
				await t.runCallbacks('handlerDidRespond', { event: a, request: s, response: i }),
					await t.doneWaiting()
			} catch (c) {
				c instanceof Error && (n = c)
			}
			if (
				(await t.runCallbacks('handlerDidComplete', {
					event: a,
					request: s,
					response: i,
					error: n,
				}),
				t.destroy(),
				n)
			)
				throw n
		}
	}
	const W = {
		cacheWillUpdate: async ({ response: r }) => (r.status === 200 || r.status === 0 ? r : null),
	}
	class T extends x {
		constructor(e = {}) {
			super(e), (this._networkTimeoutSeconds = e.networkTimeoutSeconds || 0)
		}
		async _handle(e, t) {
			let s, a
			try {
				const i = [t.fetch(e)]
				if (this._networkTimeoutSeconds) {
					const n = C(this._networkTimeoutSeconds * 1e3)
					i.push(n)
				}
				if (((a = await Promise.race(i)), !a))
					throw new Error(
						`Timed out the network response after ${this._networkTimeoutSeconds} seconds.`
					)
			} catch (i) {
				i instanceof Error && (s = i)
			}
			if (!a) throw new f('no-response', { url: e.url, error: s })
			return a
		}
	}
	class A extends x {
		constructor(e = {}) {
			super(e), this.plugins.some((t) => 'cacheWillUpdate' in t) || this.plugins.unshift(W)
		}
		async _handle(e, t) {
			const s = t.fetchAndCachePut(e).catch(() => {})
			t.waitUntil(s)
			let a = await t.cacheMatch(e),
				i
			if (!a)
				try {
					a = await s
				} catch (n) {
					n instanceof Error && (i = n)
				}
			if (!a) throw new f('no-response', { url: e.url, error: i })
			return a
		}
	}
	console.log('sw.js version: 0.0.1'),
		R(new d(({ url: r }) => r.hostname === 'localhost' || r.hostname === '127.0.0.1', new T())),
		R(new d(({ url: r }) => !0, new A({ cacheName: 'sw-cache-main' }), 'GET'))
})()

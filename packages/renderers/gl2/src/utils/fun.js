const PI2 = Math.PI * 2;
const PI_HALF = Math.PI / 2;

// diff(a,b)  返回 a数组里有，b数组没有
// diff(b,a)  返回 b数组里有，a数组没有
export function diff(arrSource, arrTarget) {
	return arrSource.filter(function(i) {
		return arrTarget.indexOf(i) < 0;
	});
}


// 获取url参数
export function getUrlParam(name) {
	const param = window.location.search.replace('?', '').split('&');
	const result = {};
	for (var i = 0; i < param.length; i++) {
		if (param[i]) {
			const val = param[i].split('=');
			const key = val[0];
			const value = val[1];
			result[key] = value;
		}
	}

	if (name) {
		return result[name];
	}

	return result;
}

// 把一天分成48个区域（0-47）
export function getMinuteSegment() {
	const now = new Date();
	return now.getHours() * 2 + Math.floor(now.getMinutes() / 30);
}

// 拿时间戳
export function getNow() {
	return new Date().getTime();
}

// 生成随机整数
export function getRan(a, b) {
	return a + Math.floor(Math.random() * (b - a));
}

// 遍历
export function traverse(target, getChildren, handle) {
	if (Array.isArray(target)) {
		target.forEach(child => {
			handle(child);
			traverse(child, getChildren, handle);
		})
	} else if (target) {
		handle(target);
		traverse(getChildren(target), getChildren, handle);
	}
}


// 获取类名
export function getClassName(objClass) {
	if (objClass && objClass.constructor) {
		const strFun = objClass.constructor.toString();
		let className = strFun.substr(0, strFun.indexOf('('));
		className = className.replace('function', '');
		return className.replace(/(^\s*)|(\s*$)/ig, '');
	}
	return typeof(objClass);
}

// 校验是否为有效值
export function isValid(value) {
	return value !== null && value !== undefined && value === value; // v === v 可以用来判断NaN
}


// 移植GLSL中的函数
export function clamp(x, min, max) {
	return Math.min(Math.max(x, min), max);
}

// 移植GLSL中的函数
export function smoothstep(e0, e1, x) {
	const t = clamp((x - e0) / (e1 - e0), 0, 1);
	return t * t * (3 - 2 * t);
}

// 缓动函数：sin缓动，0-1-0
export function easeSin010(p) {
	return 0.5 + Math.sin(PI2 * p - PI_HALF) / 2;
}

// 缓动函数：sin缓动, inOut吴缓动，0-1-0
export function easeSin010WithoutInOut(p) {
	return Math.cos(p * Math.PI - PI_HALF);
}

// 缓动函数：sin缓动，0-1
export function easeSin01(p) {
	return 0.5 + Math.sin(Math.PI * p - PI_HALF) / 2;
}

// 缓动函数：sin缓动，1-0
export function easeSin10(p) {
	return 0.5 + Math.sin(Math.PI * p + PI_HALF) / 2;
}

// // 缓动函数：组合easeInOutCubic，两节阶梯缓动（中间停一下）
// export function ease2StepsInOutCubic(p) {
// 	if (p < 0.5) {
// 		return TWEEN.Easing.Cubic.InOut(p * 2) / 2;
// 	}
// 	return TWEEN.Easing.Cubic.InOut((p - 0.5) * 2) / 2 + 0.5;
// }


// 缓动函数：sin缓动，0-11-0
export function easeSin0110(p, w = 0.1) {
	const btm = 0.5 - w;
	const top = 0.5 + w;
	if (p < btm) {
		return easeSin01(p / btm);
	} else if (p < top) {
		return 1;
	}
	return easeSin01((1 - p) / btm);
}

// 浏览器版本检测
export function getBrowserInfo() {
	const browser = {};
	const ua = navigator.userAgent.toLowerCase();
	let s;
	(s = ua.match(/msie ([\d.]+)/)) ? browser.ie = s[1] :
	(s = ua.match(/firefox\/([\d.]+)/)) ? browser.firefox = s[1] :
	(s = ua.match(/chrome\/([\d.]+)/)) ? browser.chrome = s[1] :
	(s = ua.match(/opera.([\d.]+)/)) ? browser.opera = s[1] :
	(s = ua.match(/version\/([\d.]+).*safari/)) ? browser.safari = s[1] : 0;
	return browser
	// { chrome: "73.0.3683.75" }
}

// 显卡与底层接口监测
export function getWebGLInfo() {
	const canvas = document.createElement("canvas")
	const gl = canvas.getContext("webgl2") || canvas.getContext("experimental-webgl2")
	if (gl && gl instanceof WebGL2RenderingContext) {
		const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
		return {
			version: gl.getParameter(gl.VERSION),
			vendor: gl.getParameter(gl.VENDOR),
			renderer: gl.getParameter(gl.RENDERER),
			unmaskedVendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
			unmaskedRenderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
		}
	} else {
		return false
	}
}

// WebGL2监测，需要支持300语法才能通过，暂时不能让Safari通过
export function testWebGL2() {
	const canvas = document.createElement("canvas")
	const gl = canvas.getContext("webgl2") || canvas.getContext("experimental-webgl2")
	if (gl && gl instanceof WebGL2RenderingContext) {
		if (gl.getParameter(gl.SHADING_LANGUAGE_VERSION).indexOf('3.') < 0) {
			return false
		}
	} else {
		return false
	}
	return true
}
import { DefaultConfig as ThreeLiteConvConfig, ThreeLiteConverter } from '@gs.i/backend-threelite'
import * as SDK from '@gs.i/frontend-sdk'
import { buildSphere, buildPlane } from '@gs.i/utils-geom-builders'
import { GSIRefiner, DefaultConfig as RefinerConfig } from '@gs.i/utils-optimize'

// 标准之外
import { camera, renderer, timeline, WIDTH } from '../_util/LiteRenderer'
import { scene } from '../_util/LiteScene'

const url = 'https://img.alicdn.com/tfs/TB1UDHOcwoQMeJjy0FoXXcShVXa-286-118.png'
const uvTexUrl =
	'https://img.alicdn.com/imgextra/i3/O1CN01RbMgmM1DWAzg60GCD_!!6000000000223-0-tps-1024-1024.jpg'

const group = new SDK.Mesh()

// Axes helper
// group.add(new AxesHelper({ length: 10000 }))

// Mesh
const mesh1 = new SDK.Mesh({ name: 'mesh1' })
const mesh2 = new SDK.Mesh({ name: 'mesh2' })
const mesh3 = new SDK.Mesh({ name: 'mesh3' })
const mesh4 = new SDK.Mesh({ name: 'mesh4' })

/**
 * Random Color Box - custom shaders
 */
const geom1 = buildSphere({
	radius: 5,
	widthSegments: 20,
	heightSegments: 20,
	normal: true,
	uv: true,
})
const matr1 = new SDK.MatrPbr({
	language: 'GLSL300',
	defines: {
		FLAT_SHADED: true,
	},
	extension: ``,
	uniforms: {
		uTime: { value: 0.0, type: 'float' },
		uColors: {
			// 多维vec3数组test
			value: [
				{ r: 0.6, g: 0.3, b: 0.3 },
				{ r: 0.3, g: 0.6, b: 0.3 },
			],
			type: 'vec3',
		},
		uMatrices: {
			// 多维Matrix数组test
			value: [
				[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
				[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
			],
			type: 'mat4',
		},
		uMat: {
			// 一维Matrix test
			value: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
			type: 'mat4',
		},
	},
	attributes: {
		position: 'vec3', // 测试 three duplicated attr name
	},
	varyings: {
		vRandColor: 'vec3',
	},
	preVert: ``,
	vertGeometry: `
			// Test matrix uniform
			vec4 multiplied = uMat * uMatrices[1] * uMatrices[0] * vec4( position, 1.0 );
			position = multiplied.xyz / multiplied.w;
			`,
	vertOutput: `
			vec3 randVec3 = vec3( 
				rand(vec2(fract(uTime), uv.y)), 
				rand(vec2(floor(uTime), fract(uTime))), 
				rand(vec2(uv.y, fract(uTime))) 
			);
			vRandColor = smoothstep(uColors[0], uColors[1], randVec3);
			`,
	preFrag: ``,
	fragGeometry: `
			#ifdef FLAT_SHADED
				vec3 fdx = vec3( dFdx( modelViewPosition.x ), dFdx( modelViewPosition.y ), dFdx( modelViewPosition.z ) );
				vec3 fdy = vec3( dFdy( modelViewPosition.x ), dFdy( modelViewPosition.y ), dFdy( modelViewPosition.z ) );
				normal = normalize( cross( fdx, fdy ) );
			#endif
			`,
	preLighting: `
			diffuse.rgb = vRandColor;
			emissive.rgb = vRandColor * 0.2;
			metalness = 0.5;
			roughness = 0.1;
			`,
})
mesh1.geometry = geom1
mesh1.material = matr1
mesh1.transform.position.set(10, 10, 10)

/**
 * Sprite - custom shader
 */
const geom2 = new SDK.Geom({
	mode: 'SPRITE',
	attributes: {
		position: new SDK.Attr(new Float32Array([0, 0, 20]), 3),
		// custom attr
		custom: new SDK.Attr(new Uint8Array([127, 0, 127]), 3, true),
	},
})
const matr2 = new SDK.MatrSprite({
	// emissiveFactor: { r: 0.6, g: 0.8, b: 0.6 },
	baseColorTexture: {
		image: { uri: url, flipY: true },
		sampler: {},
	},
	rotation: 0,
	alphaMode: 'BLEND',
	sizeAttenuation: false,
	size: { x: 0.04, y: 0.04 },
	attributes: {
		custom: 'vec3',
	},
	varyings: {
		vCustom: 'vec3',
	},
	vertGeometry: `
		float thickness = 0.2;
		if (corner == 0.0) { uv = vec2( 0.0 - thickness, 0.0 - thickness ); }
		if (corner == 1.0) { uv = vec2( 1.0 + thickness, 0.0 - thickness ); }
		if (corner == 2.0) { uv = vec2( 1.0 + thickness, 1.0 + thickness ); }
		if (corner == 3.0) { uv = vec2( 0.0 - thickness, 1.0 + thickness ); }
	`,
	vertOutput: `
		vCustom = custom;
	`,
	preFrag: `
		const vec2 center = vec2(0.5);
	`,
	fragColor: `
		float dist = distance( vUv, center );
		if (dist < 0.4) {
			fragColor.xyz *= vCustom;
		}
	`,
})
mesh2.geometry = geom2
mesh2.material = matr2

/**
 * Point
 */
const geom3 = new SDK.Geom({
	mode: 'POINTS',
	attributes: { position: new SDK.Attr(new Float32Array([0, 0, 0]), 3) },
})
const matr3 = new SDK.MatrPoint({
	baseColorFactor: { r: 0.2, g: 0.2, b: 0.8 },
	size: 20,
	sizeAttenuation: true,
	alphaMode: 'BLEND',
	language: 'GLSL300',
	defines: {},
	uniforms: {
		uScale: { value: 1, type: 'float' },
		TEX: {
			value: {
				image: { uri: url },
				sampler: {},
			},
			type: 'sampler2D',
		},
	},
	vertPointSize: `
				pointSize *= uScale;
			`,
	fragColor: `
				vec2 uv = gl_PointCoord;
				vec4 tColor = texture2D(TEX, uv);
				fragColor *= tColor;
			`,
})
mesh3.geometry = geom3
mesh3.material = matr3
mesh3.transform.position.set(-10, -10, 20)

/**
 * Plane
 */
const geom4 = buildPlane({
	width: 100,
	height: 100,
	widthSegments: 10,
	heightSegments: 10,
	// normal: true,
	uv: true,
})
const canvas = document.createElement('canvas')
canvas.style.position = 'absolute'
canvas.style.left = WIDTH + 5 + 'px'
canvas.width = canvas.height = 256
const ctx = canvas.getContext('2d')
if (ctx) {
	ctx.fillStyle = '#ccc'
	ctx.fillRect(0, 0, canvas.width, canvas.height)
	ctx.font = '48px serif'
	const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
	gradient.addColorStop(0, 'magenta')
	gradient.addColorStop(0.5, 'blue')
	gradient.addColorStop(1.0, 'red')
	ctx.fillStyle = gradient
	ctx.fillText('Hello world', 10, canvas.height / 2 + 10)
}
document.body.appendChild(canvas)

// Video
const video = document.createElement('video')
video.src = 'https://www.runoob.com/try/demo_source/movie.mp4'
// video.src = 'https://gw-office.alipayobjects.com/bmw-prod/0798b88a-9755-499b-b2ed-c05450928f18.mp4'
video.crossOrigin = 'anonymous'
video.loop = true
video.muted = true
video.autoplay = true
video.style.position = 'absolute'
video.style.top = 300 + 'px'
video.style.left = WIDTH + 5 + 'px'
// document.body.appendChild(video)

const matr4 = new SDK.MatrPbr({
	language: 'GLSL300',
	defines: {
		FLAT_SHADED: true,
	},
	extension: ``,
	uniforms: {
		uTex: {
			value: {
				image: { image: canvas, flipY: true },
				sampler: {},
			},
			type: 'sampler2D',
		},
	},
	attributes: {},
	varyings: {
		vCustomUV: 'vec2',
	},
	preVert: ``,
	vertGeometry: `
			vCustomUV = uv;
			`,
	vertOutput: ``,
	preFrag: ``,
	fragGeometry: ``,
	preLighting: `
			diffuse.rgb = vec3(texture2D(uTex, vCustomUV).rgb);
			// emissive = diffuse.rgb;
			`,
})
mesh4.geometry = geom4
mesh4.material = matr4
mesh4.transform.position.set(0, 0, -10)

//
setTimeout(() => {
	matr3.uniforms['TEX'].value = {
		image: { uri: 'https://img.alicdn.com/tfs/TB1X4pmgAyWBuNjy0FpXXassXXa-64-64.png' },
		sampler: {},
	}
	console.log('point image change')
}, 3000)

//
group.add(mesh1)
group.add(mesh2)
group.add(mesh3)
group.add(mesh4)

const converter = new ThreeLiteConverter(ThreeLiteConvConfig)
const refiner = new GSIRefiner(RefinerConfig)

// 渲染逻辑
refiner.update(group, {
	cameraPosition: camera.position,
	cameraRotation: camera.rotation,
	cameraNear: camera.near,
	cameraAspect: camera.aspect,
	cameraFOV: camera.fov,
	cameraFar: camera.far,
})
scene.add(converter.convert(group))

let count = 0
let angle = 0
timeline.addTrack({
	id: '绘制循环',
	duration: Infinity,
	onUpdate: (t, p) => {
		// Update shader uniform value
		matr1.uniforms.uMatrices.value[1][0] = Math.sin(count / 10) + 1
		// matr1.uniforms.uMatrices.value[1][5] = Math.sin(count / 10) + 1
		matr1.uniforms.uMatrices.value[1][10] = Math.sin(count / 10) + 1
		if (count++ && count % 45 === 0) {
			matr1.uniforms.uTime.value = t
			count = 0
		}

		matr2.rotation += 0.01

		angle += Math.PI / 45
		angle > Math.PI * 2 && (angle = 0)
		matr3.uniforms.uScale.value = Math.sin(angle) + 1

		refiner.update(group, {
			cameraPosition: camera.position,
			cameraRotation: camera.rotation,
			cameraNear: camera.near,
			cameraAspect: camera.aspect,
			cameraFOV: camera.fov,
			cameraFar: camera.far,
		})
		converter.convert(group)
		renderer.render(scene, camera)
	},
})

timeline.play()

window['mesh'] = [mesh1, mesh2, mesh3, mesh4]
window['group'] = group
window['scene'] = scene
window['camera'] = camera
window['renderer'] = renderer
window['refiner'] = refiner

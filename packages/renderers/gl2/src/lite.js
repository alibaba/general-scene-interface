// import core from './core'

import {version} from '../package.json'
console.log('GL2(lite) version:', version);


import { decorateMaterial, decorateGeometry, decorate } from './decorators';

// 专门为Polaris/Worker暴露

import { BufferAttribute } from './utils/threeHelper/three/core/BufferAttribute'
import { BufferGeometry } from './utils/threeHelper/three/core/BufferGeometry'
import { Vector3 } from './utils/threeHelper/three/math/Vector3'
import { Vector4 } from './utils/threeHelper/three/math/Vector4'
import { Box3 } from './utils/threeHelper/three/math/Box3'
import { Sphere } from './utils/threeHelper/three/math/Sphere'
import { Frustum } from './utils/threeHelper/three/math/Frustum'

const _THREE = {
	BufferAttribute, BufferGeometry,
	Vector3, Vector4,
	Box3, Sphere,
	Frustum,
}

const THREE = _THREE

export default {
	_THREE,
	THREE,

	// ...core,

	decorateMaterial,
	decorateGeometry,
	decorate,
}

/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 * All rights reserved.
 */

import { Attribute, Geometry } from '@gs.i/schema-scene'

export const DefaultParams = {
	normal: false,
	uv: false,
	disposable: false,
}

export function buildEmpty(config: Partial<typeof DefaultParams> = {}): Geometry {
	const _config = {
		...DefaultParams,
		...config,
	}
	// build geometry

	const position: Attribute = {
		array: new Float32Array([0, 0, 0]),
		itemSize: 3,
		count: 1,
		normalized: false,
		usage: 'STATIC_DRAW',
		version: 0,
		disposable: true,
	}

	const geom: Geometry = {
		mode: 'TRIANGLES' as const,
		attributes: {
			position: position,
		},
		extensions: {
			EXT_geometry_bounds: {
				box: {
					min: { x: 0, y: 0, z: 0 },
					max: { x: 0, y: 0, z: 0 },
				},
				sphere: {
					center: { x: 0, y: 0, z: 0 },
					radius: 0,
				},
			},
		},
	}

	if (_config.normal) {
		geom.attributes['normal'] = {
			array: new Float32Array([0, 0, 1]),
			itemSize: 3,
			count: 1,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			disposable: _config.disposable,
		}
	}

	if (_config.uv) {
		geom.attributes['uv'] = {
			array: new Float32Array([0, 0]),
			itemSize: 2,
			count: 1,
			normalized: false,
			usage: 'STATIC_DRAW',
			version: 0,
			disposable: _config.disposable,
		}
	}

	return geom
}

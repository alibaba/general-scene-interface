/* eslint-disable array-element-newline */
import { Mesh, Geom, MatrUnlit, Attr } from '@gs.i/frontend-sdk'

export class AxesHelper extends Mesh {
	name = 'AxesHelper'
	length = 1000

	constructor(params: Partial<AxesHelper> = {}) {
		super(params)

		for (const key of Object.keys(params)) {
			const v = params[key]
			if (v !== undefined) {
				this[key] = v
			}
		}

		const lineGeom = new Geom({
			mode: 'LINES',
			attributes: {
				position: new Attr(
					new Float32Array([
						0.0,
						0.0,
						0.0,
						this.length,
						0.0,
						0.0,
						0.0,
						0.0,
						0.0,
						0.0,
						this.length,
						0.0,
						0.0,
						0.0,
						0.0,
						0.0,
						0.0,
						this.length,
					]),
					3
				),
				vertexColor: new Attr(
					new Float32Array([
						1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
						1.0,
					]),
					3
				),
			},
		})

		const lineMatr = new MatrUnlit({
			attributes: {
				vertexColor: 'vec3',
			},
			varyings: {
				vColor: 'vec3',
			},
			vertGeometry: `vColor = vertexColor;`,
			fragColor: `fragColor = vec4(vColor, 1.0);`,
		})

		this.geometry = lineGeom
		this.material = lineMatr
	}
}

import { WebGLState, WebGLUtils, Vector4 } from '../../utils/threeHelper';
// import WebGLUtils from '../../utils/WebGLUtils';

const _vec4 = new Vector4();

/**
 * GL上下文的状态管理
 * 主要是封装掉难看的GL接口，并避免对状态的重复修改
 * 尽量复用THREE源码
 * @MIXIN THREE.State
 */
export default class State {
	constructor(gl, props) {
		this.gl = gl;
		this.threeUtils = new WebGLUtils(gl, null);

		// @NOTE: 该类逻辑上应该继承THREE.State
		// 			然而Three的老式js写法导致无法直接使用类继承
		// 			只能m手工ixin啦ㄟ( ▔, ▔ )ㄏ
		this.superMethods = new WebGLState(gl, null, this.threeUtils);
		Object.entries(this.superMethods).forEach(([name, fun]) => {
			if (name === 'setMaterial') { return; }
			if (this[name]) { return }
			this[name] = fun;
		})

        // @TODO: 需要有个地方集中设置viewport
		// this.setViewport(0, 0, props.width, props.height);

        // @TODO: 需要区分drawBuffer和frameBuffer的clearColor
        // clear使用的颜色
		this.buffers.color.setClear(...(props.clearColor || [0, 0, 0, 1]));

		this.currVAO = null;
		this.currTFO = null;
		this.TFOStates = new WeakMap();
		this.currRasterizer = true;

		// 不使用THREE的，性能太低
		this.currentTextureSlot = null;
		this.currentBoundTextures = {};
		this.maxTextures = this.gl.getParameter( this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS );

		this.emptyTextures = {};
		this.emptyTextures[ this.gl.TEXTURE_2D ] = this.createTexture( this.gl.TEXTURE_2D, this.gl.TEXTURE_2D, 1 );
		this.emptyTextures[ this.gl.TEXTURE_CUBE_MAP ] = this.createTexture( this.gl.TEXTURE_CUBE_MAP, this.gl.TEXTURE_CUBE_MAP_POSITIVE_X, 6 );

		// this.transformFeedbackMode = undefined
	}

	dispose() {
		this.gl.deleteTexture(this.emptyTextures[ this.gl.TEXTURE_2D ])
		this.gl.deleteTexture(this.emptyTextures[ this.gl.TEXTURE_CUBE_MAP ])
	}

	clear() {
		// Ensure depth buffer writing is enabled so it can be cleared on next render
		this.buffers.depth.setTest( true );
		this.buffers.depth.setMask( true );
		this.buffers.color.setMask( true );

		this.setPolygonOffset( false );

		this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT | this.gl.STENCIL_BUFFER_BIT)
	}

	setViewport(x, y, width, height) {
		// this.gl.viewport(x, y, width, height);
		// this.gl.scissor(x, y, width, height);
		_vec4.set(x, y, width, height);
		this.superMethods.viewport(_vec4);
	}

	bindVAO(vao) {
		if (this.currVAO === vao) { return; }
		this.gl.bindVertexArray(vao);
		this.currVAO = vao;
	}

	unbindVAO() {
		this.bindVAO(null);
	}

	bindTFO(tfo) {
		if (this.currTFO === tfo) { return; }
		// console.error('bindTFO', tfo)
		this.gl.bindTransformFeedback(this.gl.TRANSFORM_FEEDBACK, tfo);
		this.currTFO = tfo;
		if (tfo && !this.TFOStates.get(tfo)) {
			this.TFOStates.set(tfo, { active: false })
		}
	}

	unbindTFO() {
		// console.error('unbindTFO', this.currTFO)
		this.bindTFO(null);
	}

	beginTransformFeedback(primitiveMode) {
		if (!this.currTFO) {
			console.error('GL2::State:: no TranformFeedback bound');
			return;
		}

		primitiveMode = primitiveMode || this.gl.POINTS

		this.gl.beginTransformFeedback(primitiveMode)
		this.TFOStates.get(this.currTFO).active = true
	}

	endTransformFeedback() {
		if (
			this.currTFO && 
			this.TFOStates.get(this.currTFO) &&
			this.TFOStates.get(this.currTFO).active
		) {
			this.TFOStates.get(this.currTFO).active = false
			// this.currTFO = null
			this.gl.endTransformFeedback()
		}
	}

    // override setMaterial for TF
	setMaterial(material) {
		this.superMethods.setMaterial(material);
		if (material.rasterize === false && this.currRasterizer !== false) {
			this.gl.enable(this.gl.RASTERIZER_DISCARD);
			this.currRasterizer = false;
		} else if (material.rasterize === true && this.currRasterizer !== true) {
			this.gl.disable(this.gl.RASTERIZER_DISCARD);
			this.currRasterizer = true;
		}
	}

	// 优化IO，避免没有必要的 active 操作
	// NOTE 这里的active是不能省略的
	// program不会保存texture绑定状态
	// 2019.10.19 反反复复想要省掉这个active，结果每次都在reflection时出问题
	// 先告一段落不再节省，下次尝试优化的话一定要测试 平面反射
	activeAndBindTexture(webglSlot, webglType, webglTexture) {

		// 如果该位置已经绑定了正确的贴图，则直接返回
		
		// var _boundTexture = this.currentBoundTextures[ webglSlot ];
		// if ( _boundTexture && _boundTexture.type === webglType && _boundTexture.texture === webglTexture ) {
		// 	return
		// }

		this.activeTexture(webglSlot)
		this.bindTexture( webglType, webglTexture )
		return
	}

	// texture

	activeTexture( webglSlot ) {

		if ( webglSlot === undefined ) webglSlot = this.gl.TEXTURE0 + this.maxTextures - 1;

		if ( this.currentTextureSlot !== webglSlot ) {

			this.gl.activeTexture( webglSlot );
			this.currentTextureSlot = webglSlot;

		}

	}

	bindTexture( webglType, webglTexture ) {

		if ( this.currentTextureSlot === null ) {

			this.activeTexture();

		}

		var boundTexture = this.currentBoundTextures[ this.currentTextureSlot ];

		if ( boundTexture === undefined ) {

			boundTexture = { type: undefined, texture: undefined };
			this.currentBoundTextures[ this.currentTextureSlot ] = boundTexture;

		}

		if ( boundTexture.type !== webglType || boundTexture.texture !== webglTexture ) {

			this.gl.bindTexture( webglType, webglTexture || this.emptyTextures[ webglType ] );

			boundTexture.type = webglType;
			boundTexture.texture = webglTexture;

		}

	}

	createTexture( type, target, count ) {

		var data = new Uint8Array( 4 ); // 4 is required to match default unpack alignment of 4.
		var texture = this.gl.createTexture();

		this.gl.bindTexture( type, texture );
		this.gl.texParameteri( type, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST );
		this.gl.texParameteri( type, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST );

		for ( var i = 0; i < count; i ++ ) {

			this.gl.texImage2D( target + i, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data );

		}

		return texture;

	}
}

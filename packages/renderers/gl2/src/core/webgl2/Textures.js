// import Slots from '../../utils/Slots';
import { Converter } from '../../utils/threeHelper';

/**
 * 对全局贴图资源集中管理
 * WebGL2中多出了很多贴图新特性和新的贴图类型
 * 因此这里完全弃用THREE.WebGLTextures，重新实现贴图系统
 * @PS: THREE的插槽管理方式太简陋了
 * @TODO: 一个贴图没加载出来的时候会串到另一个贴图上
 */
export default class Textures {
	constructor(gl, state) {
		this.gl = gl;
		this.state = state;
		this.converter = new Converter(gl);

		// 获取最大贴图数量
		// https://stackoverflow.com/questions/43022667/what-is-the-difference-between-webgl-2-0-max-image-texture-units-and-max-combine
		this.maxTexture = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
		this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
		// console.log('贴图单元数量', this.maxTexture);
		// console.log('最大贴图尺寸', this.maxTextureSize);

        // 各向异性过滤
        // @NOTE: 利于贴图在多种调度下能够清晰显示
        // https://developer.mozilla.org/en-US/docs/Web/API/EXT_texture_filter_anisotropic
        // https://en.wikipedia.org/wiki/Anisotropic_filtering
		this.extAF = gl.getExtension('EXT_texture_filter_anisotropic');
		this.extAFMax = gl.getParameter(this.extAF.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
		// console.log('各向异性过滤', this.extAFMax);

        // @NOTE: 纹理单元中不保存任何配置，只需要bind即可，不会有太大资源占用
        // 			虽然这种优先占满所有texture unit 的方案能够避免bind操作，
        // 			但是会在整体贴图数量超过16时造成处理逻辑非常复杂，@TODO 暂时先不使用
        // // 贴图单元是有限的，而且初始化一个单元相当费时，需要集中帖调配
		// this.slots = new Slots({
		// 	max: this.maxTexture,
		// 	onFull: () => console.warn('贴图插槽已满, 性能将急剧下降'),
		// });

		this.usedTextureUnits = 0;

		this.glTextures = new WeakMap();
		
		// 对比texture版本和glTextures版本，如果版本不同，则需要上传数据来同步版本
		// PS 之前 两个version都挂在 texture 上，导致 texture 不能跨 renderer 复用
		this.versions = new WeakMap();
	}

	dispose() {
		this.glTextures = new WeakMap();
	}

	/**
	 * 分配texture unit
	 */
	allocateUnit() {
		this.usedTextureUnits ++;
		if (this.usedTextureUnits > this.maxTexture) {
			throw new Error(`贴图数量${this.usedTextureUnits}超出贴图单元数量${this.maxTexture}，需要[减少贴图数|拆分物体]`);
		}
		return this.usedTextureUnits - 1;
	}

	resetUnit() {
		this.usedTextureUnits = 0;
	}

	/**
	 * 分配unit并处理参数等
	 * @return unit
	 */
	set(texture, slot, forceSlot) {
		if (!texture) { return null; }
		// THREE.Texture在下载完成前version是0，下载后变成1
		// const slot = this.allocateUnit();
		slot = forceSlot ? slot : this.allocateUnit();

		if (texture.isGL2RenderTarget) {
			// this.state.activeTexture(this.gl.TEXTURE0 + slot );
			// this.state.bindTexture(this.gl.TEXTURE_2D, this.glTextures.get(texture));
			this.state.activeAndBindTexture(this.gl.TEXTURE0 + slot, this.gl.TEXTURE_2D, this.glTextures.get(texture))
			return slot
		}

		// TODO 不合理，一开始可以传个空的上去，避免串贴图
		// if (texture.version === 0) { return null; }
		// console.log(texture);

        // 分配插槽
		// const slot = this.slots.getSlot(texture, true, slotIndex => {
		// 	console.log('新分配插槽', slotIndex);
		// });

		if (texture.isCubeTexture) {
			this._setTextureCube(texture, slot);
		} else {
			// 首次下载完成或者需要更新
			// @NOTE: version一开始是undefined
			if (texture.version > 0 && this.versions.get(texture) !== texture.version) {
				if ( texture.image === undefined ) {
					// TODO 应该有更好的解决办法来让贴图未下载好的时候行为正常
					console.warn('Texture marked for update but image is undefined');
				} else if ( texture.image.complete === false ) {
					console.warn('Texture marked for update but image is incomplete');
				} else {
					this.uploadTexture(texture, slot);
					return slot; // upload里面必须处理active和bind
				}
			}

			// this.state.activeTexture(this.gl.TEXTURE0 + slot );
			// this.state.bindTexture(this.gl.TEXTURE_2D, this.glTextures.get(texture));
			this.state.activeAndBindTexture(this.gl.TEXTURE0 + slot, this.gl.TEXTURE_2D, this.glTextures.get(texture))
		}

		return slot;
	}

	// 兼容THREE
	setTexture2D( texture, slot ) {
		return this.set(texture, slot, true)
	}

	_setTextureCube(texture, slot) {
		if (texture.version > 0 && this.versions.get(texture) !== texture.version) {
			if (texture.image.length !== 6) {
				// console.log(texture.image);
				return null;
			}

			// debugger
			let glTexture = this.glTextures.get(texture);
			if (!glTexture) {
				glTexture = this.gl.createTexture();
				this.glTextures.set(texture, glTexture);
			}

			// this.state.activeTexture( this.gl.TEXTURE0 + slot );
			// this.state.bindTexture( this.gl.TEXTURE_CUBE_MAP, glTexture );
			this.state.activeAndBindTexture(
				this.gl.TEXTURE0 + slot,
				this.gl.TEXTURE_CUBE_MAP,
				glTexture
			)

			this.gl.pixelStorei( this.gl.UNPACK_FLIP_Y_WEBGL, texture.flipY );
			this.gl.pixelStorei( this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha);
			this.gl.pixelStorei( this.gl.UNPACK_ALIGNMENT, texture.unpackAlignment);

			// var isCompressed = ( texture && texture.isCompressedTexture );
			// var isDataTexture = ( texture.image[ 0 ] && texture.image[ 0 ].isDataTexture );

			var cubeImage = [];

			for (var i = 0; i < 6; i++) {
				cubeImage[i] = texture.image[i];

				// if ( ! isCompressed && ! isDataTexture ) {
				//
				// 	cubeImage[ i ] = clampToMaxSize( texture.image[ i ], capabilities.maxCubemapSize );
				//
				// } else {
				//
				// 	cubeImage[ i ] = isDataTexture ? texture.image[ i ].image : texture.image[ i ];
				//
				// }
			}

			var image = cubeImage[0],
				// isPowerOfTwoImage = isPowerOfTwo( image ),
				glFormat = this.converter.convert(texture.format),
				glType = this.converter.convert(texture.type);

			this.setTextureParameters( this.gl.TEXTURE_CUBE_MAP, texture );

			for (var i = 0; i < 6; i++) {
				// if ( isDataTexture ) {
				//
				// 	state.texImage2D( _gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glFormat, cubeImage[ i ].width, cubeImage[ i ].height, 0, glFormat, glType, cubeImage[ i ].data );
				//
				// } else {

				// this.state.texImage2D( this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glFormat, glFormat, glType, cubeImage[ i ] );
				this.state.texImage2D( this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, glFormat, glFormat, glType, cubeImage[ i ] );
				// this.state.texImage2D(gl.TEXTURE_2D, 0, glFormat, glFormat, glType, texture.image);

				// }
			}

			this.generateMipmap(this.gl.TEXTURE_CUBE_MAP, texture, image.width, image.height)

			// if ( ! isCompressed ) {
			//
			// 	textureProperties.__maxMipLevel = 0;
			//
			// } else {
			//
			// 	textureProperties.__maxMipLevel = mipmaps.length - 1;
			//
			// }

			// if ( textureNeedsGenerateMipmaps( texture, isPowerOfTwoImage ) ) {
			//
			// 	// We assume images for cube map have the same size.
			// 	generateMipmap( _gl.TEXTURE_CUBE_MAP, texture, image.width, image.height );
			//
			// }

			this.versions.set(texture, texture.version)

			// if ( texture.onUpdate ) texture.onUpdate( texture );
		} else {
			// this.state.activeTexture( this.gl.TEXTURE0 + slot );
			// this.state.bindTexture( this.gl.TEXTURE_CUBE_MAP, this.glTextures.get(texture) );
			this.state.activeAndBindTexture(
				this.gl.TEXTURE0 + slot,
				this.gl.TEXTURE_CUBE_MAP,
				this.glTextures.get(texture)
			)
		}
	}

	/**
	 * 同上 .set(texture)
	 * RenderTarget的处理与texture的处理有所不同
	 * @param  {RenderTarget} renderTarget
	 * @return {Int} slotIndex
	 * 已废弃
	 */
	// setupRenderTarget(renderTarget) {
	// 	// console.log('setupRenderTarget', renderTarget);
	// 	// 分配插槽
	// 	// const slot = this.slots.getSlot(renderTarget, true, slotIndex => {
	// 	// 	console.log('新分配插槽(renderTarget)', slotIndex);
	// 	// });
	// 	// debugger
	// 	const slot = this.allocateUnit();

	// 	this.state.activeTexture(gl.TEXTURE0 + slot);
	// 	this.state.bindTexture(gl.TEXTURE_2D, renderTarget.glTexture);
	// 	return slot;
	// }

	/**
	 * 如果贴图版本更新，则需要重新将贴图数据刷入GPU
	 * 注意应该避免重复进行这一操作
	 * @NOTE: frameBuffer绑定的贴图是不需要这一步的
	 * @param  {THREE.Texture} texture
	 * @param  {Int} slot
	 */
	uploadTexture(texture, slot) {
		const gl = this.gl;

		// 清理
		// TODO THREE的这种方案会造成很多重复的回掉函数，
		// 		应该放在createTexture后面，只调用deleteTexture，不处理weakmap
		const onTextureDispose = event => {
			var texture = event.target;
			texture.removeEventListener( 'dispose', onTextureDispose );
			this.deallocateTexture( texture );
		}
		texture.addEventListener( 'dispose', onTextureDispose );

		// 对于过大图片的压缩
		if (texture.maxWidth && texture.image.width > texture.maxWidth) {
			console.warn('超出设定的最大尺寸，将压缩');
			const _w = texture.maxWidth;
			const _h = _w / texture.image.width * texture.image.height;
			texture.image = this.resetSize(texture.image, _w, _h);
		}

        // 创建gl纹理对象
		let glTexture = this.glTextures.get(texture);
		if (!glTexture) {
			glTexture = this.gl.createTexture();
			this.glTextures.set(texture, glTexture);
		}

		// this.state.activeTexture(gl.TEXTURE0 + slot);
		// this.state.bindTexture(gl.TEXTURE_2D, glTexture);
		this.state.activeAndBindTexture(gl.TEXTURE0 + slot, gl.TEXTURE_2D, glTexture)

		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, texture.flipY);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, texture.unpackAlignment);
		this.setTextureParameters(gl.TEXTURE_2D, texture);
		const glFormat = this.converter.convert(texture.format);
		const glType = this.converter.convert(texture.type);

		if (texture.isDepthTexture) {
			console.warn('GL2::TODO:DepthTexture(非FBO)的上传')
		} else if (texture.isDataTexture) {
			gl.texImage2D(gl.TEXTURE_2D, 0, glFormat, texture.image.width, texture.image.height, 0, glFormat, glType, texture.image.data);
		} else {
			// this.state.texImage2D(gl.TEXTURE_2D, 0, glFormat, glFormat, glType, texture.image);
			gl.texImage2D(gl.TEXTURE_2D, 0, glFormat, glFormat, glType, texture.image);
			// gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, texture.image.width, texture.image.height);
		}
		// @TODO: 手工mipmap
		// @TODO: 可能没啥用，应该可配置跳过
		texture.generateMipmaps && gl.generateMipmap(gl.TEXTURE_2D);
		this.versions.set(texture, texture.version)
	}

	/**
	 * 配置纹理单元
	 * @NOTE: 调用之前需要保证绑定了正确的纹理单元
	 * @param {GLType(gl.TEXTURE2D|gl.TEXTURE3D|gl.TEXTURE_ARRAY)} textureType
	 * @param {THREE.Texture} texture
	 */
	setTextureParameters(textureType, texture) {
		const gl = this.gl;
		const converter = this.converter;

		gl.texParameteri(textureType, gl.TEXTURE_WRAP_S, converter.convert(texture.wrapS));
		gl.texParameteri(textureType, gl.TEXTURE_WRAP_T, converter.convert(texture.wrapT));

		gl.texParameteri(textureType, gl.TEXTURE_MAG_FILTER, converter.convert(texture.magFilter));
		gl.texParameteri(textureType, gl.TEXTURE_MIN_FILTER, converter.convert(texture.minFilter));

		if (converter.equal(texture.type, 'FloatType')) return;
		if (converter.equal(texture.type, 'HalfFloatType')) return;

		// if (texture.anisotropy > 1 || texture.__currentAnisotropy !== texture.anisotropy) {
		if (texture.anisotropy > 1) {
			gl.texParameterf(textureType,
							 this.extAF.TEXTURE_MAX_ANISOTROPY_EXT,
							 Math.min(texture.anisotropy, this.extAFMax));
			// texture.__currentAnisotropy = texture.anisotropy;
		}
	}

	deallocateTexture( texture ) {
		if (!texture) return;
		const glTexture = this.glTextures.get(texture);
		if (!glTexture) return;

		this.gl.deleteTexture(glTexture);
		this.glTextures.delete(texture);
	}


	resetSize(image, width, height) {

		if ( image instanceof HTMLImageElement || image instanceof HTMLCanvasElement || image instanceof ImageBitmap ) {

			const canvas = document.createElementNS( 'http://www.w3.org/1999/xhtml', 'canvas' );
			canvas.width = width;
			canvas.height = height;

			const context = canvas.getContext( '2d' );
			context.drawImage( image, 0, 0, width, height );

			return canvas;

		}

	return image;

	}


	generateMipmap( target, texture, width, height ) {

		texture.generateMipmaps && this.gl.generateMipmap(target);

		// Note: Math.log( x ) * Math.LOG2E used instead of Math.log2( x ) which is not supported by IE11
		texture.__maxMipLevel = Math.log( Math.max( width, height ) ) * Math.LOG2E;

	}
}

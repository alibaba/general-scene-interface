import { Converter } from '../../utils/threeHelper';

/**
 * 集中管理RenderTarget
 */
export default class RenderTargets {
	constructor(gl, state, textures) {
		this.gl = gl;
		this.state = state;
		this.textures = textures;
		this.converter = new Converter(gl);

		this.targetCache = new WeakMap();
	}

	dispose() {
		this.targetCache = new WeakMap();
	}

    /**
     * 将当前绘制区域设置为RenderTarget
     * @param {RenderTarget} renderTarget
     */
	set(renderTarget) {
		const gl = this.gl;
		let target = this.targetCache.get(renderTarget);
		if (!target) {
			target = this.makeTarget(renderTarget)
			this.targetCache.set(renderTarget, target);
		}

        // 将当前绘制区域设为fbo
		this.gl.bindFramebuffer(gl.FRAMEBUFFER, target.fboRender);
		// if (renderTarget.mrt) {
		// 	const attachments = [];
		// 	for (let i = 0; i <= renderTarget.mrt; i++) {
		// 		attachments.push(gl.COLOR_ATTACHMENT0 + i);
		// 	}
		// 	gl.drawBuffers(attachments);
		// }

		// NOTE viewport 是全局状态，不需要针对每个FBO进行处理
		// this.gl.viewport(0, 0, renderTarget.width, renderTarget.height);
		this.state.setViewport(0, 0, renderTarget.width, renderTarget.height)
	}

	/**
	 * 生成一套GLRenderTarget需要的对象
	 * @param  {RenderTarget} renderTarget
	 */
	makeTarget(renderTarget) {
		if (renderTarget.mrt) {
			return this.makeMRT(renderTarget);
		}
		// debugger
		const {width, height} = renderTarget;
		const gl = this.gl;
		const converter = this.converter;

        // @NOTE: WebGL2中区分写入Buffer和读取Buffer，需要用blit接口同步数据

        // ** 写入Buffer **
		const fboRender = gl.createFramebuffer();

        // 颜色缓冲
        // @TODO: 是否需要unbind
		const colorRenderBuffer = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, colorRenderBuffer);
        // @NOTE: WebGL2新增抗锯齿版本 renderbufferStorageMultisample
        // 			注意深度缓冲区要对应，如果使用抗锯齿则必须所有缓冲区都使用
		if (renderTarget.multisample) {
			// TODO 为何这里必须用8
			gl.renderbufferStorageMultisample(gl.RENDERBUFFER, renderTarget.multisample, gl.RGBA8, width, height);
		} else {
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA4, width, height);
		}

		// 深度缓冲区
		let depthBuffer;
		if (renderTarget.depth || renderTarget.depthBuffer) {
			depthBuffer = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
			// 测试发现：
			// WebGL2要求 DEPTH_COMPONENT16 或 DEPTH_COMPONENT24， 
			// 其中 DEPTH_COMPONENT16 无法被blit(会抛错，无法定位)，找不到相关文档
			// 无论是 16 还是 24 都无法 multiample
			if (renderTarget.multisample) {
				gl.renderbufferStorageMultisample(gl.RENDERBUFFER, renderTarget.multisample, gl.DEPTH_COMPONENT24, width, height);
			} else {
				gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
			}
		}

		gl.bindRenderbuffer(gl.RENDERBUFFER, null);


		gl.bindFramebuffer(gl.FRAMEBUFFER, fboRender);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, colorRenderBuffer);
		if (renderTarget.depth || renderTarget.depthBuffer) {
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);


        // ** 读取texture **
        // @NOTE MultisampleBuffer需要一个单独的fboResolve，
        // 			通过blit把数据从fboRender刷入fboResolve，才能被读取
        // 			普通Buffer则不需要
		let fboResolve = fboRender;
		if (renderTarget.multisample) {
			fboResolve = gl.createFramebuffer()
		}

        // @NOTE: 这里不需要active，也就不需要分配unit
        // 			写入和读取的预处理是对应的，所以也不需要pixelStorei

		// @NOTE 这里必须使用 this.state.bindTexture，不然不会刷新 this.state. 中对于texture的缓存

		const texture = gl.createTexture();
		this.state.bindTexture(gl.TEXTURE_2D, texture);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, converter.convert(renderTarget.texture.wrapS));
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, converter.convert(renderTarget.texture.wrapT));
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, converter.convert(renderTarget.texture.magFilter));
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, converter.convert(renderTarget.texture.minFilter));

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height)

		gl.bindFramebuffer(gl.FRAMEBUFFER, fboResolve);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		this.state.bindTexture(gl.TEXTURE_2D, null);

		// NOTE 对THREE接口做兼容
		// TODO 待验证
		this.textures.glTextures.set(renderTarget.texture, texture)
		renderTarget.texture.isGL2RenderTarget = true

		// depthTexture
		if (renderTarget.depthTexture) {
			const depthTexture = gl.createTexture();
			this.state.bindTexture(gl.TEXTURE_2D, depthTexture);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, converter.convert(renderTarget.depthTexture.wrapS));
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, converter.convert(renderTarget.depthTexture.wrapT));
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, converter.convert(renderTarget.depthTexture.magFilter));
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, converter.convert(renderTarget.depthTexture.minFilter));

			// Immutable storage
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
			// Webgl2 没有 TexStorage2DMultisample 接口，因此texture不能直接attach到multisample的fbo上
			gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, width, height);

			// webgl2 对阴影的优化，three.texture上没有对应的属性
			// https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/glSamplerParameter.xhtml
			if (renderTarget.depthTexture.compare) {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
			} else {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.NULL);
			}

			gl.bindFramebuffer(gl.FRAMEBUFFER, fboResolve);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);

			this.state.bindTexture(gl.TEXTURE_2D, null);

			// NOTE 对THREE接口做兼容
			// TODO 待验证
			this.textures.glTextures.set(renderTarget.depthTexture, depthTexture)
			renderTarget.depthTexture.isGL2RenderTarget = true
		}

		// check
		gl.bindFramebuffer(gl.FRAMEBUFFER, fboRender);
		this.checkFBO('render')
		gl.bindFramebuffer(gl.FRAMEBUFFER, fboResolve);
		this.checkFBO('resolve')
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // // @TODO: 冗余引用
		renderTarget.fboRender = fboRender;
		renderTarget.fboResolve = fboResolve;

		// to removeEventListener
		const onRenderTargetDispose = event => {
			const renderTarget = event.target;
			renderTarget.removeEventListener( 'dispose', onRenderTargetDispose );
			this.deallocateRenderTarget( renderTarget );
		};

		renderTarget.addEventListener('dispose', onRenderTargetDispose);

		return {
			fboRender, 
			fboResolve,
			colorRenderBuffer,
			depthBuffer,
		};
	}

	/**
	 * 处理MultiRenderTargets
	 * renderTarget.texture = renderTarget.texture0
	 * renderTarget.texture.1
	 * renderTarget.texture.2
	 * ...
	 * renderTarget.texture[ renderTarget.mrt ]
	 * @param {MultiRenderTargets} renderTarget 
	 */
	makeMRT(renderTarget) {
		// debugger
		const {width, height} = renderTarget;
		const gl = this.gl;
		const converter = this.converter;

		if (renderTarget.multisample) {
			renderTarget.multisample = false;
			console.warn('MRT 不支持 multisample');
			// WebGL2不支持drawBuffer接口
			// 只能给每个attachment都建一个resolveFBO才能分别blint
		}

        // @NOTE: WebGL2中区分写入Buffer和读取Buffer，需要用blit接口同步数据

        // ** 写入Buffer **
		const fboRender = gl.createFramebuffer();

        // 颜色缓冲
		// @TODO: 是否需要unbind
		const colorRenderBuffers = [];
		for (let i = 0; i <= renderTarget.mrt; i++) {
			const colorRenderBuffer = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, colorRenderBuffer);
			// @NOTE: WebGL2新增抗锯齿版本 renderbufferStorageMultisample
			// 			注意深度缓冲区要对应，如果使用抗锯齿则必须所有缓冲区都使用
			// if (renderTarget.multisample && i === 0) {
			if (renderTarget.multisample) {
				// gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA8, width, height);
				// TODO 为何这里必须用8
				gl.renderbufferStorageMultisample(gl.RENDERBUFFER, renderTarget.multisample, gl.RGBA8, width, height);
			} else {
				// 这个并不是必要的
				// gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, width, height);
			}
			
			colorRenderBuffers.push(colorRenderBuffer);
		}

		// 深度缓冲区
		let depthBuffer;
		if (renderTarget.depth || renderTarget.depthBuffer) {
			depthBuffer = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
			// @TODO: DEPTH_COMPONENT16的种类区别？
			if (renderTarget.multisample) {
				gl.renderbufferStorageMultisample(gl.RENDERBUFFER, renderTarget.multisample, gl.DEPTH_COMPONENT24, width, height);
			} else {
				gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, width, height);
			}
		}

		gl.bindRenderbuffer(gl.RENDERBUFFER, null);


		gl.bindFramebuffer(gl.FRAMEBUFFER, fboRender);
		const attachments = [];
		for (let i = 0; i <= renderTarget.mrt; i++) {
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.RENDERBUFFER, colorRenderBuffers[i]);
			attachments.push(gl.COLOR_ATTACHMENT0 + i);
		}
		if (renderTarget.depth || renderTarget.depthBuffer) {
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
		}
		gl.drawBuffers(attachments);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);


        // ** 读取texture **
        // @NOTE MultisampleBuffer需要一个单独的fboResolve，
        // 			通过blit把数据从fboRender刷入fboResolve，才能被读取
        // 			普通Buffer则不需要
		let fboResolve = fboRender;
		if (renderTarget.multisample) {
			fboResolve = gl.createFramebuffer()
		}

        // @NOTE: 这里不需要active，也就不需要分配unit
        // 			写入和读取的预处理是对应的，所以也不需要pixelStorei

		// @NOTE 这里必须使用 this.state.bindTexture，不然不会刷新 this.state. 中对于texture的缓存

		const textures = [];
		for (let i = 0; i <= renderTarget.mrt; i++) {
			const texture = gl.createTexture();
			textures.push(texture)
			this.state.bindTexture(gl.TEXTURE_2D, texture);

			const threeTexture = renderTarget['texture' + i];

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, converter.convert(threeTexture.wrapS));
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, converter.convert(threeTexture.wrapT));
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, converter.convert(threeTexture.magFilter));
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, converter.convert(threeTexture.minFilter));

			const glFormat = converter.convert( threeTexture.format );
			const glType = converter.convert( threeTexture.type );

			let glInternalFormat = gl.RGBA8;

			if (glFormat === gl.RGBA) {
				if (glType === gl.UNSIGNED_SHORT_5_5_5_1) {
					glInternalFormat = gl.RGB5_A1
				} else if (glType === gl.UNSIGNED_SHORT_4_4_4_4) {
					glInternalFormat = gl.RGBA4
				}
			} else if (glFormat === gl.RGB) {
				if (glType === gl.UNSIGNED_SHORT_5_6_5) {
					glInternalFormat = gl.RGB565
				} else if (glType === gl.HALF_FLOAT) {
					glInternalFormat = gl.R11F_G11F_B10F
				} else {
					glInternalFormat = gl.RGB8;
				}
			} else if (glFormat === gl.RG) {
				glInternalFormat = gl.RG16F
			} else {
				throw new Error('未适配的RenderTarget贴图格式')
			}

			// NOTE 直接使用texStorage2D性能更好（immutable），但是Spector.js无法识别。。。
			// gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
			// gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
			gl.texImage2D(gl.TEXTURE_2D, 0, glInternalFormat, width, height, 0, glFormat, glType, null);
			gl.texStorage2D(gl.TEXTURE_2D, 1, glInternalFormat, width, height);

			this.state.bindTexture(gl.TEXTURE_2D, null);
		}
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, fboResolve);
		for (let i = 0; i <= renderTarget.mrt; i++) {
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, textures[i], 0);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		// NOTE 对THREE接口做兼容
		// TODO 待验证
		for (let i = 0; i <= renderTarget.mrt; i++) {
			this.textures.glTextures.set(renderTarget['texture' + i], textures[i])
			renderTarget['texture' + i].isGL2RenderTarget = true
		}

		// depthTexture
		if (renderTarget.depthTexture) {
			const depthTexture = gl.createTexture();
			this.state.bindTexture(gl.TEXTURE_2D, depthTexture);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, converter.convert(renderTarget.depthTexture.wrapS));
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, converter.convert(renderTarget.depthTexture.wrapT));
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, converter.convert(renderTarget.depthTexture.magFilter));
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, converter.convert(renderTarget.depthTexture.minFilter));

			// Immutable storage
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
			// Webgl2 没有 TexStorage2DMultisample 接口，因此texture不能直接attach到multisample的fbo上
			gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, width, height);

			// webgl2 对阴影的优化，three.texture上没有对应的属性
			// https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/glSamplerParameter.xhtml
			if (renderTarget.depthTexture.compare) {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
			} else {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.NULL);
			}

			gl.bindFramebuffer(gl.FRAMEBUFFER, fboResolve);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);

			this.state.bindTexture(gl.TEXTURE_2D, null);

			// NOTE 对THREE接口做兼容
			// TODO 待验证
			this.textures.glTextures.set(renderTarget.depthTexture, depthTexture)
			renderTarget.depthTexture.isGL2RenderTarget = true
		}

		// check
		gl.bindFramebuffer(gl.FRAMEBUFFER, fboRender);
		this.checkFBO('render')
		gl.bindFramebuffer(gl.FRAMEBUFFER, fboResolve);
		this.checkFBO('resolve')
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // @TODO: 冗余引用
		renderTarget.fboRender = fboRender;
		renderTarget.fboResolve = fboResolve;
		renderTarget.attachments = attachments;

		// to removeEventListener
		const onRenderTargetDispose = event => {
			const renderTarget = event.target;
			renderTarget.removeEventListener( 'dispose', onRenderTargetDispose );
			this.deallocateRenderTarget( renderTarget );
		};

		renderTarget.addEventListener('dispose', onRenderTargetDispose);
		
		return {
			fboRender,
			fboResolve,
			attachments,
			colorRenderBuffers, 
			// texture,
		};
	}

	deallocateRenderTarget(renderTarget) {
		if (!renderTarget) return;
		const target = this.targetCache.get(renderTarget);
		if (!target) { return; }

		// console.log('rt清理')

		const gl = this.gl;

		if (renderTarget.mrt) {
			// console.warn('GL2::RenderTargets::TODO:MRT资源释放');
			
			// 删掉texture
			renderTarget.textures.forEach(texture => {
				const glTexture = this.textures.glTextures.get(texture)
				if (glTexture) {
					this.gl.deleteTexture(glTexture);
					this.textures.glTextures.delete(texture);
				}
			})

			const glTextureDepth = this.textures.glTextures.get(renderTarget.depthTexture)
			if (glTextureDepth) {
				this.gl.deleteTexture(glTextureDepth);
				this.textures.glTextures.delete(renderTarget.depthTexture);
			}

			// 删掉FBO
			gl.deleteFramebuffer( target.fboRender );
			if (target.fboRender !== target.fboResolve) {
				gl.deleteFramebuffer( target.fboResolve );
			}
			
			// 删掉renderbuffer
			target.colorRenderBuffers.forEach(colorRenderBuffer => {
				gl.deleteRenderbuffer( colorRenderBuffer );
			})
			target.depthBuffer && gl.deleteRenderbuffer( target.depthBuffer );
			
			// 删掉引用
			this.targetCache.delete(renderTarget);
		} else {
			// 删掉texture
			// NOTE 由textures管理的texture可以直接调用dispose，但是这些texture是直接在这里配置的，所以没法用dispose
			// renderTarget.texture.dispose();
			// renderTarget.depthTexture && renderTarget.depthTexture.dispose();
			const glTexture = this.textures.glTextures.get(renderTarget.texture)
			if (glTexture) {
				this.gl.deleteTexture(glTexture);
				this.textures.glTextures.delete(renderTarget.texture);
			}
			const glTextureDepth = this.textures.glTextures.get(renderTarget.depthTexture)
			if (glTextureDepth) {
				this.gl.deleteTexture(glTextureDepth);
				this.textures.glTextures.delete(renderTarget.depthTexture);
			}

			// 删掉FBO
			gl.deleteFramebuffer( target.fboRender );
			if (target.fboRender !== target.fboResolve) {
				gl.deleteFramebuffer( target.fboResolve );
			}
			
			// 删掉renderbuffer
			gl.deleteRenderbuffer( target.colorRenderBuffer );
			target.depthBuffer && gl.deleteRenderbuffer( target.depthBuffer );
			
			// 删掉引用
			this.targetCache.delete(renderTarget);
		}
	}

    /**
     * 把绘制结果从绘制缓冲区刷入下一个pass的读取缓冲（texture中）
     * WebGL2新特性，是使用frameBuffer抗锯齿所必需的
     * http://www.realtimerendering.com/blog/webgl-2-new-features/
     * @param  {[type]} renderTarget [description]
     * @return {[type]}              [description]
     * @TODO 应该以一种更广义的方式暴露出去
     */
	blit(renderTarget) {
		if (!renderTarget) { return; }
		if (renderTarget.fboRender === renderTarget.fboResolve) { return; }

		const gl = this.gl;
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, renderTarget.fboRender);
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, renderTarget.fboResolve);

		// @NOTE 这里只能写入到COLOR_ATTACHMENT0
		// 不确定是不是WebGL2标准设计的bug，只给了 gl.readBuffer 接口，没给 gl.drawBuffer 接口
		// gl.readBuffer(gl.COLOR_ATTACHMENT0);
		// gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
		// gl.clearBufferfv(gl.COLOR, 0, [0.0, 0.0, 0.0, 0.0]);
		// @TODO: 可能会有不同viewport
		gl.blitFramebuffer(
			0, 0, renderTarget.width, renderTarget.height,
			0, 0, renderTarget.width, renderTarget.height,
			gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, gl.NEAREST,
		);

		// https://stackoverflow.com/questions/18825990/opengl-multisample-integer-texture-attached-to-framebuffer-doesnt-resolve-corre
		// When the color buffer is transferred, 
		// values are taken from the read buffer of the read framebuffer 
		// and written to each of the draw buffers of the draw framebuffer.
		// https://stackoverflow.com/questions/37381980/get-some-trounble-when-using-drawbuffers-in-webgl2
		// the `i`th buffer listed in bufs must be COLOR_ATTACHMENTi or NONE
		// 实验结果：这里应该是需要drawBuffer，drawBuffers似乎没有用
		// 			即使把0设为NONE依然只会blit到0
		// if (renderTarget.mrt) {
		// 	for (let i = 1; i <= renderTarget.mrt; i++) {
		// 		// gl.bindFramebuffer(gl.READ_FRAMEBUFFER, renderTarget.fboRender);
		// 		// gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, renderTarget.fboResolve);
		// 		gl.readBuffer(gl.COLOR_ATTACHMENT0 + i);
		// 		const drawBuffers = [];
		// 		for (let j = 0; j <= renderTarget.mrt; j++) {
		// 			if (i === j) {
		// 				drawBuffers.push(gl.COLOR_ATTACHMENT0 + i);
		// 			} else {
		// 				drawBuffers.push(gl.NONE);
		// 			}
		// 		}
		// 		gl.drawBuffers(drawBuffers);
		// 		gl.blitFramebuffer(
		// 			0, 0, renderTarget.width, renderTarget.height,
		// 			0, 0, renderTarget.width, renderTarget.height,
		// 			gl.COLOR_BUFFER_BIT, gl.NEAREST,
		// 		);
		// 	}
		// }

		// 恢复状态
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, renderTarget.fboRender); // 等同于 DRAW_FRAMEBUFFER
	}

	checkFBO(name) {
		const gl = this.gl
		const renderStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		switch (renderStatus) {
			case gl.FRAMEBUFFER_COMPLETE:
				// console.log(`${name} fbo 通过`)
				break;
			case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
				console.warn('FRAMEBUFFER_INCOMPLETE_ATTACHMENT');
				break;
			case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
				console.warn('FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT');
				break;
			case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
				console.warn('FRAMEBUFFER_INCOMPLETE_DIMENSIONS');
				break;
			case gl.FRAMEBUFFER_UNSUPPORTED:
				console.warn('FRAMEBUFFER_UNSUPPORTED');
				break;
			case gl.FRAMEBUFFER_INCOMPLETE_MULTISAMPLE:
				console.warn('FRAMEBUFFER_INCOMPLETE_MULTISAMPLE');
				break;
			default:
				console.error('非标准错误');
				break;
		}
	}
}

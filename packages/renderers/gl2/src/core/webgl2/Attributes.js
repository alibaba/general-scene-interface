let _count = 0;

// TODO Feedback Attribute 不应该上传数据，只进行内存开辟以节约性能

/**
 * 集中管理Attribute
 * @NOTE
 * 		THREE.WebGLAttributes中的数据创建和更新逻辑挺好的，暂时复用
 * 		加入WebGL2的VAO特性以提升性能
 * @NOTE
 * 		three的更新操作放在projectObject里面
 * 		object.update -> geom.update -> attr.update
 */
export default class Attributes {
	constructor(gl, state) {
		this.gl = gl;
		this.state = state;

		this.buffers = new WeakMap();
		// TransformFeedback可能需要 read/write 双Buffer
		this.feedbackBuffers = new WeakMap();

		this.vaoCache = {};
		this.tfoCache = {};
	}

	dispose() {
		this.buffers = new WeakMap();
		this.feedbackBuffers = new WeakMap();
		this.vaoCache = {};
		this.tfoCache = {};
	}

	set(geometry, material, program) {
		const gl = this.gl;
		// @NOTE (THREE.Attribute)
		// Three在WebGLAttribute中维护了一份attrCache，来管理全局的Attribute，
		// 调用update方法就可以完成所有需要的操作，包括创建、更新检测、刷入数据，
		// 然而相关的接口都没有暴露出来，而且needsUpdate只设置了setter，
		// 这里只能将Three的Attribute单独对待

		// @NOTE 在进行所有Buffer操作前解绑，以免被记录

		const index = geometry.index; // element Array
		const attrEntries = Object.entries(geometry.attributes || {}); // [[name, attribute], ...]
		const feedbackEntries = Object.entries(geometry.feedbacks || {}); // [[name, attribute], ...]

		// 创建与更新（常规Attribute）
		attrEntries.forEach(([name, attribute]) => {
			// three内置Attribute
			// - 如果没创建过就去创建
			// - 如果创建过而且需要更新，就刷数据
			this.update(attribute, gl.ARRAY_BUFFER, geometry); // geometry是为了挂dispose事件

			// @UPDATE
			// 		VAO ID 已经包含所有的 Attribute，如果attributes变化则会直接还VAO
			// 		也就是说，VAO一旦创建不再修改
		});

		if (index) {
			// 创建与更新（index）
			this.update(index, gl.ELEMENT_ARRAY_BUFFER, geometry);
		}

		// 创建与更新（Feedback Attribute）
		feedbackEntries.forEach(([name, attribute]) => {
			// TODO 这里不应该允许上传数据
			// - 如果没创建过就去创建，并上传一次数据完成内存开辟
			// - 如果创建过也应该可以更新数据，毕竟可能调整内存大小
			// - 应该给feedback attribute 的 needsupdate 做个明确的定义
			// 		- 覆盖掉tf中的数据，重新上传数据
			// 		- 调整内存尺寸
			this.updateFeedback(attribute, gl.ARRAY_BUFFER, geometry); // geometry是为了挂dispose事件
		});

        // 如果没有创建VAO和TFO就创建
		// @NOTE: 
		// 		VAO由program和所有的attribute共同决定，
		// 		如果Program变化，activeAttribute的数量和location都可能变化，tf varying也会变化
		// 		每个tfAttribute的flag状态决定了VAO中使用那个Buffer作为输入
		// @NOTE:
		// 		每个tfAttribute的flag都会影响到VAO，不同的组合需要不同的VAO
		const vaoID = program.uuid + 
			'_' +
			attrEntries
				.map(([name, attribute]) => '' + attribute.uuid + '-' + attribute.swapState)
				.join('_') + 
			'_' +
			(index ? ('index#' + index.uuid) : 'noIndex')

		const tfoID = program.uuid + 
			'_' +
			feedbackEntries
				.map(([name, attribute]) => '' + attribute.uuid + '-' + attribute.swapState)
				.join('_')

		// VAO START ====================================

		if (!this.vaoCache[vaoID]) {
			// console.error('createVertexArray')
			// 创建
			const vao = gl.createVertexArray()
			this.vaoCache[vaoID] = vao

			const dispose = () => {
				// this.remove
				gl.deleteVertexArray(vao)
				delete this.vaoCache[vaoID]
				geometry.removeEventListener( 'dispose', dispose )
			}
			geometry.addEventListener( 'dispose', dispose )

			// 绑定
            // @NOTE: THREE.state.enableAttribute | disableUnusedAttributes
            // 		虽然可以避免对Attribute的重复开启与关闭
            // 		但是这种开启对于vao录制来说是必须的，
            // 		被three省略的重复操作将导致录制到的最终状态不完整
            // 		因此不使用该接口，而是要在每次重新录制的时候都重复所有开启操作
            // 		不需要关闭，因为切换vao后没用attr的自然会关闭

			// 绑定
			this.state.bindVAO(vao);
			// 录制
			attrEntries.forEach(([name, attr]) => {
				// 如果program没有用到这个Attribute，就忽略之
				if (program.attributes[name] === undefined) {
					return;
				}

                // @TODO 暂时不支持BufferAttribute和InstancedBufferAttribute以外的类型
				if (!attr.isBufferAttribute && !attr.isInterleavedBufferAttribute) {
					throw new Error('暂不支持BufferAttribute/InstancedBufferAttribute/InterleavedBufferAttribute以外的类型');
				}

				// 如果不需要更新，就正常绑定
				const offset = attr.offset || 0; // NOTE 只有InterleavedBufferAttribute有这个值
				const stride = (attr.data || {}).stride || 0; // NOTE 只有InterleavedBufferAttribute有这个值
				const normalized = attr.normalized;
				const size = attr.itemSize;

				const attribute = this.get(attr);
				const buffer = attribute.buffer;
				const type = attribute.type;
				const bytesPerElement = attribute.bytesPerElement;

				this.gl.enableVertexAttribArray(program.attributes[name]);
				this.gl.bindBuffer( this.gl.ARRAY_BUFFER, buffer );
				// @TODO: WebGL2 vertexAttribIPointer 传入整数
				this.gl.vertexAttribPointer(program.attributes[name], size, type, normalized, stride * bytesPerElement, offset * bytesPerElement);

                // @TODO: 待测试
				// console.log(attr);
				if (attr.isInstancedBufferAttribute) {
                	this.gl.vertexAttribDivisor(program.attributes[name], attr.meshPerAttribute);
				} else {
					// @TODO 待测试！！
	                this.gl.vertexAttribDivisor(program.attributes[name], 0);
				}
			});
			
			if (index) {
				// 绑定（index）
				const attribute = this.get(index);
				const buffer = attribute.buffer;
				this.gl.bindBuffer( this.gl.ELEMENT_ARRAY_BUFFER, buffer );
			}

			// 清理
			// 		vertexAttrib 相关的buffer可以全部解绑，pointer才是真正有效的
			// 		ELEMENT_ARRAY_BUFFER 不能解绑，不然 VAO 里面就没有了
			this.gl.bindBuffer( this.gl.ARRAY_BUFFER, null );
		} else {
			this.state.bindVAO(this.vaoCache[vaoID]);
		}

		// VAO END ====================================

		// TFO START ====================================

		if (material.transformFeedback) {

			// TFO创建 NOTE 虽然多数非TFGeometry都用不到，多建一个也没啥
			if (!this.tfoCache[tfoID]) {
				// console.error('createFransformFeedback')

				const tfo = gl.createTransformFeedback()
				this.tfoCache[tfoID] = tfo

				const dispose = () => {
					gl.deleteTransformFeedback(tfo)
					delete this.tfoCache[tfoID]
					geometry.removeEventListener( 'dispose', dispose )
				}
				geometry.addEventListener( 'dispose', dispose )

				// 绑定
				this.state.bindTFO(tfo);
				feedbackEntries.forEach(([name, attribute]) => {
					if (program.tfVaryings[name] === undefined) return

					// 这个似乎被计入了 VAO 
					gl.bindBufferBase( // glBindBufferRange 等效
						gl.TRANSFORM_FEEDBACK_BUFFER,
						program.tfVaryings[name], // bindingPoint
						this.get(attribute, true).buffer // 输出Buffer
					);
				})
				this.state.unbindTFO();

				// 清理
				feedbackEntries.forEach(([name, attribute]) => {
					if (program.tfVaryings[name] === undefined) {return}

					// 这个似乎被计入了 VAO 
					gl.bindBufferBase( // glBindBufferRange 等效
						gl.TRANSFORM_FEEDBACK_BUFFER,
						program.tfVaryings[name], // bindingPoint
						null
					);
				})
			}

			// 绑定、录制TFO
			// TFO 用于记录 绑定点（outBuffer）
			const tfo = this.tfoCache[tfoID];
			this.state.bindTFO(tfo);
	
			// 相关绑定都已经完成，这里swap两个Buffer和两个TFO
			feedbackEntries.forEach(([name, attr]) => {
				if (!program.useTransformFeedback) {return}
				if (program.tfVaryings[name] === undefined) {return}
	
				const attributeTransform = this.get(attr);
				const attributeFeedback = this.get(attr, true);
				
				// 如果这个attribute既做输入又做输出，
				if (attributeTransform && attributeFeedback) {
					// swap r/w buffers everytime after w buffer written
					// 这里swap会在下次绘制生效
					// NOTE 这里需要注意分析 attributes.set() 被跳过的情况
					attr.swap()
					const tmp = attributeTransform.buffer;
					attributeTransform.buffer = attributeFeedback.buffer;
					attributeFeedback.buffer = tmp;
				}
			});
		} else {
			this.state.unbindTFO();
		}

		// TFO END ====================================
	}

	// feedback Buffer
	updateFeedback( attribute, bufferType, geometry ) {
		if ( attribute.isInterleavedBufferAttribute ) attribute = attribute.data;

		const data = this.feedbackBuffers.get(attribute);

		if ( data === undefined ) {
			// TODO 评估这里对VAO的影响，是否需要解绑
			// this.state.unbindVAO();
			// TODO 这里不需要写入数据，只需要开辟空间
			this.feedbackBuffers.set(attribute, this.createBuffer(attribute, bufferType));

			const onDispose = () => {
				geometry.removeEventListener( 'dispose', onDispose );
				this.deallocateAttribute( attribute );
			}

			// NOTE 如果一个attribute即用来做输入有用来做输出，就会被绑定两次结构
			// 		不过不会造成什么问题
			geometry.addEventListener( 'dispose', onDispose );
		} else if ( data.version < attribute.version ) {
			// TODO 评估这里对VAO的影响，是否需要解绑
			// this.state.unbindVAO();
			this.updateBuffer( data.buffer, attribute, bufferType );
			data.version = attribute.version;
		}
	}

    // @NOTE: 重写THREE.WebGLAttributes中的update，用于避免VAO重复rebind，
	update( attribute, bufferType, geometry ) {

		if ( attribute.isInterleavedBufferAttribute ) attribute = attribute.data;

		const data = this.buffers.get(attribute);
		if ( data === undefined ) {
			// TODO 评估这里对VAO的影响，是否需要解绑
			this.state.unbindVAO();
			this.buffers.set(attribute, this.createBuffer(attribute, bufferType));

			const onDispose = () => {
				geometry.removeEventListener( 'dispose', onDispose );
				this.deallocateAttribute( attribute );
			}

			geometry.addEventListener( 'dispose', onDispose );
		} else if ( data.version < attribute.version ) {
			// TODO 评估这里对VAO的影响，是否需要解绑
			this.state.unbindVAO();
			this.updateBuffer( data.buffer, attribute, bufferType );
			data.version = attribute.version;
		}

	}

	// @NOTE: 移植THREE.WebGLAttributes
	remove( attribute, isFeedback = false  ) {

		const buffers = isFeedback ? this.feedbackBuffers : this.buffers;

		if ( attribute.isInterleavedBufferAttribute ) attribute = attribute.data;

		var data = buffers.get(attribute);

		if ( data ) {

			this.gl.deleteBuffer( data.buffer );

			buffers.delete(attribute);

		}

	}

	// @NOTE: 移植THREE.WebGLAttributes
	get( attribute, isFeedback = false ) {

		const buffers = isFeedback ? this.feedbackBuffers : this.buffers;

		if ( attribute.isInterleavedBufferAttribute ) attribute = attribute.data;

		return buffers.get(attribute);

	}

	// @NOTE: 移植THREE.WebGLAttributes
	updateBuffer( buffer, attribute, bufferType ) {
		const gl = this.gl;

		var array = attribute.array;
		var updateRange = attribute.updateRange;

		gl.bindBuffer( bufferType, buffer );

		if ( attribute.dynamic === false ) {

			gl.bufferData( bufferType, array, gl.STATIC_DRAW );

		} else if ( updateRange.count === - 1 ) {

			// Not using update ranges

			gl.bufferSubData( bufferType, 0, array );

		} else if ( updateRange.count === 0 ) {

			console.error( 'THREE.WebGLObjects.updateBuffer: dynamic THREE.BufferAttribute marked as needsUpdate but updateRange.count is 0, ensure you are using set methods or updating manually.' );

		} else {

			// TODO FIXME flyline 在 chrome.canary on mac 的测试中发现，该操作有时会变得异常慢

			// gl.bufferSubData( bufferType, updateRange.offset * array.BYTES_PER_ELEMENT,
				// array.subarray( updateRange.offset, updateRange.offset + updateRange.count ) );

			// NOTE 如果上面的卡顿则需要使用这个
			// gl.bufferData( bufferType, array, gl.STATIC_DRAW );

			// webgl2

			gl.bufferSubData(bufferType, updateRange.offset * array.BYTES_PER_ELEMENT, array, updateRange.offset, updateRange.count)

			updateRange.count = - 1; // reset range

		}

	}

	// @NOTE: 移植THREE.WebGLAttributes
	createBuffer( attribute, bufferType ) {
		const gl = this.gl;

		// 编ID
		attribute.uuid = attribute.uuid || (_count++); // 这个其实不能叫UUID，但是为了和three接口语义保持一致

		var array = attribute.array;
		var usage = attribute.dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;

		var buffer = gl.createBuffer();

		gl.bindBuffer( bufferType, buffer );
		gl.bufferData( bufferType, array, usage );

		attribute.onUploadCallback();

		var type = gl.FLOAT;

		if ( array instanceof Float32Array ) {

			type = gl.FLOAT;

		} else if ( array instanceof Float64Array ) {

			console.warn( 'THREE.WebGLAttributes: Unsupported data buffer format: Float64Array.' );

		} else if ( array instanceof Uint16Array ) {

			type = gl.UNSIGNED_SHORT;

		} else if ( array instanceof Int16Array ) {

			type = gl.SHORT;

		} else if ( array instanceof Uint32Array ) {

			type = gl.UNSIGNED_INT;

		} else if ( array instanceof Int32Array ) {

			type = gl.INT;

		} else if ( array instanceof Int8Array ) {

			type = gl.BYTE;

		} else if ( array instanceof Uint8Array ) {

			type = gl.UNSIGNED_BYTE;

		}

		return {
			buffer,
			type: type,
			bytesPerElement: array.BYTES_PER_ELEMENT,
			version: attribute.version
		};

	}

	// 释放
	deallocateAttribute(attribute) {
		const data = this.buffers.get(attribute);
		if (data) {
			this.gl.deleteBuffer(data.buffer);
		}
		this.buffers.delete(attribute);
		
		const dataTF = this.feedbackBuffers.get(attribute);
		if (dataTF) {
			this.gl.deleteBuffer(dataTF.buffer);
		}
		this.feedbackBuffers.delete(attribute);
	}
}

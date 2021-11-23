/**
 *  webGL2 集中管理所有Block
 *  @author Simon Meng.
 */

import { isValid } from 'utils/fun';

export default class Blocks {
	constructor(gl) {
		this.gl = gl;
		// this.state = state;

		// 保存UBO
		this.uboCache = {};
		this.currBlocks = {};

		this.currentProgram = null;
	}

	dispose() {
		this.uboCache = {};
		this.currBlocks = {};
		this.currentProgram = null;
	}

	set(material, program, commonBlocks) {
		this.currBlocks = {};

		this.currentProgram = program;
		this.setBlocks(material, program, commonBlocks);
	}

	setBlocks(material, program, commonBlocks={}) {
		const blocks = {...material.blocks, ...commonBlocks};

		Object.entries(blocks).forEach(([name, block]) => {
			const programBlock = program.blocks[name];
			// 忽略shader中不存在的block
			if (!programBlock) { return; }

			this.update(block, programBlock);

			this.currBlocks[name] = {
				block: programBlock,
				ubo: this.uboCache[block.uuid],
			};
		});
	}


	get(block) {
		return this.uboCache[block.uuid];
	}

	update(block, programBlock) {
		const ubo = this.uboCache[block.uuid];
		// 还没创建的要创建
		if (ubo === undefined) {
            // 创建UBO
			this.uboCache[block.uuid] = this.createUBO(block, programBlock);
			block.onDispose = () => delete this.uboCache[block.uuid];
            // 首次上传数据，保持UBO和Block版本一致
			this.updateUBO(this.uboCache[block.uuid], block);
		} else if (ubo.version < block.version) {
			this.updateUBO(ubo, block);
			ubo.version = block.version;
		}
	}

	bindUBOs() {
		Object.entries(this.currBlocks).forEach(([name, {block, ubo}]) => {
			// console.log(name, block, ubo);
			// 绑定
			this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, block.index, ubo.buffer);
		});
	}

	createUBO(block, programBlock) {
		const buffer = this.gl.createBuffer();
		// @TODO 应该还支持其他数据结构，暂时忽略
		const array = new Float32Array(programBlock.size / 4);

		// 首次填充数据并bind
		this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, buffer);
		this.gl.bufferData(this.gl.UNIFORM_BUFFER, array, this.gl.DYNAMIC_DRAW);
		this.gl.bindBufferBase(this.gl.UNIFORM_BUFFER, block.index, buffer);
		// @TODO 不需要解绑
		this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);

		return { buffer, array, version: block.version };
	}

	updateUBO(ubo, block) {
		// layout uniforms
		// @NOTE 注意offset和size都要除以4！！！！！单位不是len
		Object.entries(block.uniforms).forEach(([name, value]) => {
			const programUniform = this.currentProgram.uniforms[name];
			if (isValid(programUniform) && isValid(value) && programUniform.blockIndex > -1) {
				const array = ubo.array;

				switch ( programUniform.type ) {
					case 0x1406: // FLOAT
						array[programUniform.offset / 4] = value;
						return;
					case 0x8b50: // _VEC2 (float)
						copyToArray(value, array, programUniform.offset / 4, 2);
						return;
					case 0x8b51: // _VEC3 (float)
						copyToArray(value, array, programUniform.offset / 4, 3);
						return;
					case 0x8b52: // _VEC4 (float)
						copyToArray(value, array, programUniform.offset / 4, 4);
						return;


					case 0x8b5a: // _MAT2
						copyToArray(value, array, programUniform.offset / 4, 4);
						return;

					case 0x8b5b: // _MAT3
						copyToArray(value, array, programUniform.offset / 4, 9);
						return;

					case 0x8b5c: // _MAT4
						copyToArray(value, array, programUniform.offset / 4, 16);
						return;

					default:
						console.warn('不支持的block类型');
						return;
				}
				// @TODO 其他类型（不能放在Float32Array里的）
			}
		});

        // 上传数据
		this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, ubo.buffer);
		this.gl.bufferSubData(this.gl.UNIFORM_BUFFER, 0, ubo.array);
		// this.gl.bindBuffer(this.gl.UNIFORM_BUFFER, null);
	}
}


function copyToArray(source, target, start, count) {
	if (!isValid(source)) { return; }

	let arrayFrom = [];

	// source可能undefined或者直接是数组
	if (source[0]) {
		arrayFrom = source;
	} else {
        // @TODO 性能问题
		if (source.r) {
			arrayFrom = [source.r, source.g, source.b];
		} else if (source.x) {
			arrayFrom = [source.x, source.y, source.z, source.w];
		} else if (source.toArray) {
			arrayFrom = source.toArray();
		}
	}

	for (let i = 0; i < count; i++) {
		target[start + i] = arrayFrom[i] || 0;
	}

	// for (let i = 0; i < target.length; i++) {
	// 	target[i] = i;
	// }
}

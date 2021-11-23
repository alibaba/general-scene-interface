/**
 * 有限资源管理器
 * 在一个插槽有限的插床上为对象分配插槽
 * @author 萌Simon
 */

import uuidv4 from 'uuid/v4';


export default class Slots {
	constructor({max:__max = 5, onFull}) {
		if (__max < 1) { throw new Error('插槽数量不能小于1'); }

		this.onFull = onFull;

		// 最大插槽数量
		Object.defineProperty(this, 'max', {
			get: () => { return __max; },
			// @TODO: 动态调整插槽数量
		});

		// 插床
		this.slotter = [];
		// 可用插槽
		this.available = [];
		for (let i = 0; i < this.max; i++) {
			this.available[i] = this.max - 1 - i;
		}

		// 循环计数器，用于释放插槽
		let __circle = 0;
		Object.defineProperty(this, 'circle', {
			get: () => { return __circle; },
			set: (value) => { __circle = value % this.max; },
		});
	}

	// 是否已满
	get isFull() {
		return this.available.length === 0;
	}

	/**
	 * 为一个对象分配插床
	 * @param  {Object} target
	 * @param  {Int} slotIndex @:TODO
	 * @return {Int}
	 */
	allocate(target, slotIndex) {
		// 没有必要为空目标占用插槽
		if (target === null || target === undefined) { return null; }
		// 如果满了，就释放一个插槽再来
		if (this.isFull) {
			this.onFull && this.onFull();
			this.freeSlot(this.circle++);
			return this.allocate(target, slotIndex);
		}

		// 获取一个空闲位置
		const _slotIndex = this.available.pop();
		// bake target
		const id = uuidv4();
		target.__slot_id__ = id;
		// 插入
		this.slotter[_slotIndex] = {target, id};
		return _slotIndex;
	}

	// 为一个对象释放插槽
	free(target) {
		this.freeSlot(this.getSlot(target));
	}

	/**
	 * 释放指定插槽
	 * @param  {[type]} slotIndex [description]
	 * @return {[type]}           [description]
	 */
	freeSlot(slotIndex) {
		if (slotIndex === null) { return; }
		if (!Number.isInteger(slotIndex)) { throw new Error('不合法的插槽值:', slotIndex); }
		if (slotIndex > this.max) { return console.warn('超出插槽资源'); }

		this.slotter[slotIndex] = undefined;
		this.available.push(slotIndex);
	}

	/**
	 * 获取一个对象的插槽值
	 * @param  {Object} target
	 * @param  {Bool} allocate 如果未分配，则分配一个
	 * @param  {Function(slotIndex, target)} onAllocate 如果立即分配，回调，参数为分配的slotIndex和target
	 * @return {Int|Null}
	 */
	getSlot(target, allocate = false, onAllocate) {
		if (target === undefined || target === null) { return null; }

		// 现用笨方法检索 @TODO: 更合理的索引方式
		for (let i = 0; i < this.slotter.length; i++) {
			if (this.slotter[i] !== undefined &&
				this.slotter[i].id === target.__slot_id__) {
				return i;
			}
		}

		// 不在插盘上（未分配过插槽，或者被别人挤占了）
		if (allocate) {
			const slotIndex = this.allocate(target);
			onAllocate && onAllocate(slotIndex, target);
			return slotIndex;
		} else {
			return null;
		}
	}
}

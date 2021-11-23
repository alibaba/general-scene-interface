import uuidv4 from 'uuid/v4';

export default class Block {
	constructor(name, uniforms = {}) {
		this.name = name;
		this.uuid = uuidv4();

		this.uniforms = uniforms;

		this.version = 0;
	}

	set needsUpdate(value) {
		if (value) { this.version++; }
	}

	dispose() {
		this.onDispose && this.onDispose()
	}
}

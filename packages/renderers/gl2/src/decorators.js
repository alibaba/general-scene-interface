/**
 * 需要对THREE内置类型做一些修改才能适应GL2
 */

/**
 * THREE.Material不接受未定义的属性，transformFeedback需要下面的属性
 * @param  THREE.Material
 */
export function decorateMaterial(target) {
    target.prototype.transformFeedback = false;
    // NOTE 这里会被公用，不安全，需要要求用户自己创建一个新的而不是直接修改这个
    target.prototype.blocks = Object.freeze({});
    target.prototype.rasterize = true;
    // NOTE 这里会被公用，不安全，需要要求用户自己创建一个新的而不是直接修改这个
    target.prototype.tfVaryings = Object.freeze([]);

    // GBuffer
    target.prototype.outputColor = true
    target.prototype.outputRoughness = false
    target.prototype.outputNormal = false

    const oldCopy = target.prototype.copy
    target.prototype.copy = function(source) {
        oldCopy.call( this, source );

        this.transformFeedback = source.transformFeedback;
        this.blocks = source.blocks;
        this.rasterize = source.rasterize;
        this.tfVaryings = source.tfVaryings;

        target.prototype.outputColor = source.outputColor
        target.prototype.outputRoughness = source.outputRoughness
        target.prototype.outputNormal = source.outputNormal

        return this;
    }
}

/**
 * THREE.Geometry transformFeedback需要变换状态，
 * 不仅是TFGeometry需要，其他使用了TFAttribute的BufferGeometry也需要
 */
export function decorateGeometry(target) {
    target.prototype.tfFlag = 'A';
    target.prototype.swapFlag = function() {
        this.tfFlag = this.tfFlag === 'A' ? 'B' : 'A';
    };

    // !!添加引用对象会破坏原型链
    // target.prototype.feedbacks = {}
    target.prototype.addFeedback = function(name, attribute) {
        if (!attribute || !attribute.isBufferAttribute) {
            throw new Error('GL2::addFeedback::attribute must be BufferAttribute')
        }
        if (attribute.isInterleavedBufferAttribute) {
            throw new Error('GL2::addFeedback:: 暂未支持 InterleavedBufferAttribute')
        }

        if (!this.feedbacks) {
            this.feedbacks = {}; // 只能通过这种方式安全的增加引用属性
        }

        this.feedbacks[ name ] = attribute;

		return this;
    };
}

export function decorateBufferAttribute(target) {
    target.prototype.swapState = 0;
    target.prototype.swap = function() {
        // this.tfSwapped = !this.tfSwapped
        this.swapState = 1 ^ this.swapState
    };
}

// 增加对MultiRenderTarget的支持
export function decorateWebGLRenderTarget(target) {
    target.prototype.mrt = 0;
    target.prototype.targetsCount = 1;
    target.prototype.textures = null;

    // 将该RenderTarget设置为MultiRenderTarget
    target.prototype.setMultiTargets = function(count, optionsArray = []) {
		if (count > 1) {
            this.textures = [];
			this.mrt = count - 1
			this.targetsCount = count
            this.texture0 = this.texture // 0
            this.textures.push(this.texture0)
			for (let i = 1; i < count; i++) {
                const options = optionsArray[i] || {}
                const texture = this.texture.clone()
                texture.wrapS = options.wrapS || texture.wrapS
                texture.wrapT = options.wrapT || texture.wrapT
                texture.magFilter = options.magFilter || texture.magFilter
                texture.minFilter = options.minFilter || texture.minFilter
                texture.format = options.format || texture.format
                texture.type = options.type || texture.type
                texture.anisotropy = options.anisotropy || texture.anisotropy
                texture.encoding = options.encoding || texture.encoding

                this['texture' + i] = texture
                this.textures.push(texture)
			}
		}
    }
}

/**
 * 一次性处理THREE
 */
const supportedVersion = '94'
export function decorate(THREE) {
    if (THREE.__GL2_decorated) { return; }
    if (THREE.REVISION !== supportedVersion) {
        console.warn('THREE version:', THREE.REVISION, '当前支持的版本: ', supportedVersion);
        console.warn('该THREE版本未经测试，可能存在兼容性问题，建议使用版本：', supportedVersion);
    }
    THREE.__GL2_decorated = true;
    decorateMaterial(THREE.Material)
    decorateGeometry(THREE.BufferGeometry);
    decorateBufferAttribute(THREE.BufferAttribute);
    decorateWebGLRenderTarget(THREE.WebGLRenderTarget);
    // decorateGeometry(THREE.BufferGeometry); // @TODO remove

    THREE.RGFormat = 33319
}

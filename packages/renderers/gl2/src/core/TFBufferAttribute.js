import { BufferAttribute } from 'utils/threeHelper';

// import * as THREE from 'three'

// import {
//     BufferAttribute
// } from 'three'

export default class TFBufferAttribute extends BufferAttribute {
    constructor(array, itemSize, normalized) {
        super(array, itemSize, normalized);

        // 继承自BufferAttribute：
        // this.array
        // this.itemSize
        // this.count
        // this.normalized
        // this.dynamic
        // this.updateRange
        // this.version
        // this.setArray()
        // this.copy()

        this.isTFBufferAttribute = true;
        this.tfSource = 'A';
        this.tfTarget = 'B';

        // 应该允许用户像操作BufferAttribute一样操作这个Buffer的数据
        // 因此需要让用户正常操作Array并能得到期望的结果
        // 当时TransformFeedback过程中两个Buffer需要交换，因此操作和读取的对象需要控制好

        // 用户不应该直接读取该数据（因为该数据的处理在GPU端进行）（如需读取，需要专用接口）
        // 用户写入的数据，应该作为下一次TF的source数据
        // 常规绘制拿到的数据应该是TF变换后的结果
        // 但是如果用户写入后没有经过TF就直接用来绘制，使用的应该是用户刚刚写入的数据而非空数据

        // 需要集中维护两个Buffer
        // TFpass使用其中一个作为source，另一个作为target
        // drawPass中使用最后一次TFpass的target作为source

        // case 0: (1 tfPass & 1 drawPass per render)
        // - source = array, target = empty
        // - LOOP_START
        // - tfPass: source -> target
        //           swap(source, target)
        // - vaoF
        // - drawPass: source ->
        // - swap([vaoTA, vaoFA], [vaoTB, vaoFB])
        // - LOOP_END
        //
        // case 1: (tf & draw in 1 pass per render)
        // - source = array, target = empty
        // - LOOP_START
        // - tf & draw: source -> target
        //              swap(source, target)
        // - LOOP_END
        //
        // case 2: (drawPass only)
        // - source = array, target = empty
        // - LOOP_START
        // - drawPass: source ->
        // - LOOP_END
        //
        // case 3: (multi-tfPass per render)
        // - source = array, target = empty
        // - LOOP_START
        // - tfPass: source -> target
        //           swap(source, target)
        // - tfPass: source -> target
        //           swap(source, target)
        // - drawPass: source ->
        // - LOOP_END
        //
        // case 4: (complex pipeline)
        // - use hocks or expose some low level api

        // 为了使TF正常工作，
        // 每个TFAttribute需要两个Buffer（来回切换）
        // 每个包含TFAttribute的Geometry需要两个VAO（一个用于绘制一个用于计算）

        // @TODO 从GPU读取数据的接口
        // @TODO GPU端直接操作数据（远程copy）的接口（BufferAttribute上）
    }

    swapFlag() {
        const tmp = this.tfSource;
        this.tfSource = this.tfTarget;
        this.tfTarget = tmp;
    }
}
// export default function TFBufferAttributeFac(THREE) {
    // return class TFBufferAttribute extends THREE.BufferAttribute {

// }

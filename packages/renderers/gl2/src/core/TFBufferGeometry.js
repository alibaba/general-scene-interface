import { BufferGeometry } from 'utils/threeHelper';

// import * as THREE from 'three'

// import {
//     BufferGeometry
// } from 'three'

export default class TFBufferGeometry extends BufferGeometry {
    constructor() {
        super();

        this.isTFBufferGeometry = true;

        this.transformFeedbacks = {};
        // this.tfFlag = 'A';

        // @NOTE: TF只能使用 drawArray 和 drawArrayInstanced
        //          index在这里不能生效
        // this.count = 0;
    }

    // get index() {
    //     return undefined;
    // }

    // set index(value) {}

    addTransformFeedback(iName, oName, tfAttribute) {
        this.transformFeedbacks[iName] = {
            iName,
            oName,
            attribute: tfAttribute,
        };
        // this.count = tfAttribute.count;
    }

    // setIndex() {
    //     console.warn('TFBufferGeometry does not support index, drawArray and drawArrayInstanced only');
    // }

    // swapFlag() {
    //     this.tfFlag = this.tfFlag === 'A' ? 'B' : 'A';
    // }
}
// export default function TFBufferGeometryFac(THREE) {
    // return class TFBufferGeometry extends THREE.BufferGeometry {
// }

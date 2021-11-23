import Pass from '../Pass';
import fs from './glsl/combine_fs.glsl';
import vs from './glsl/combine_vs.glsl';

const defaultConf = {
    tex: null,

    add: [],
    addFactor: [],
    multi: [],
    multiFactor: [],
    mix: [],
    mixFactor: [],
    mixAlpha: [],
    mixAlphaFactor: [],
    extraReflection: [],
    extraReflectionFactor: [],
    reflection: [],
    reflectionFactor: [],
};

export default class CombinePass extends Pass {
    constructor(conf, THREE) {
        conf = {
            ...defaultConf,
            ...conf,
        };
        conf.vs = vs
        conf.fs = fs
        if (conf.addFactor.length < conf.add.length) {
            for (let index = 0; index < conf.add.length - conf.addFactor.length; index++) {
                conf.addFactor.push(1)
            }
        }
        if (conf.multiFactor.length < conf.multi.length) {
            for (let index = 0; index < conf.multi.length - conf.multiFactor.length; index++) {
                conf.multiFactor.push(1)
            }
        }
        if (conf.mixAlphaFactor.length < conf.mixAlpha.length) {
            for (let index = 0; index < conf.mixAlpha.length - conf.mixAlphaFactor.length; index++) {
                conf.mixAlphaFactor.push(1)
            }
        }
        if (conf.extraReflectionFactor.length < conf.extraReflection.length) {
            for (let index = 0; index < conf.extraReflection.length - conf.extraReflectionFactor.length; index++) {
                conf.extraReflectionFactor.push(1)
            }
        }
        if (conf.reflectionFactor.length < conf.reflection.length) {
            for (let index = 0; index < conf.reflection.length - conf.reflectionFactor.length; index++) {
                conf.reflectionFactor.push(1)
            }
        }
        conf.uniforms = {
            tex: { value: conf.tex },
            add: {value: conf.add},
            addFactor: {value: conf.addFactor},
            multi: {value: conf.multi},
            multiFactor: {value: conf.multiFactor},
            mixAlpha: {value: conf.multi},
            mixAlphaFactor: {value: conf.mixAlphaFactor},
            extraReflection: {value: conf.extraReflection},
            extraReflectionFactor: {value: conf.extraReflectionFactor},
            reflection: {value: conf.reflection},
            reflectionFactor: {value: conf.reflectionFactor},
        }
        conf.defines = {
            ADD: conf.add.length,
            MULTI: conf.multi.length,
            MIX_ALPHA: conf.mixAlpha.length,
            EXTRA_REFLECTION: conf.extraReflection.length,
            REFLECTION: conf.reflection.length,
        }
        super(conf, THREE);

        this.conf = conf;
    }
}
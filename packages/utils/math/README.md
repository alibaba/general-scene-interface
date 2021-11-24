# Math lib

Port from three@0.123.0 . 删掉 three 内部依赖（删掉 BufferGeometry Object3D Camera 相关接口）。

Do not update unless nessesary.

并不需要编译。

## usage

import {Vector3} from '@gs.i/utils-math'

## notice

这个库是用来做 Math 计算的，不作为 Math 类 的定义（接口太多，有兼容性问题，Math类的定义应该是最小可用数值字段）

## TODO

conv 使用 类有很多不方便之处以及性能损失。 conv 里的数学模块应该是函数式编程（ 值->值 而非 对象->对象 ）。

## disclaimer

本模块修改自 three.js 的代码，three.js 代码的版权归 three.js 作者所有。
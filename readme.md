# General Scene Interface

**This Project Is Still In Uploading Process.**

> 抛砖引玉
>
> Build Your Web3D Programs With a Paradigm.

GSI 是一个 Web 3D 实时渲染领域的伞项目，包含一套标准化的通用场景接口，以及基于其上的工具集。致力于为 Web 3D 中的必要环节提供接口规范、算法范式和最佳实践，作为砖瓦，帮助开发者快速构建复杂的渲染引擎和高级 3D 软件。

本项目不是一个新的渲染引擎，恰恰相反，本项目可以与 Web 和桌面端的渲染引擎、建模软件协同工作。

## Development

- Make sure you have `nodejs`, `yarn` and `lerna` installed

```sh
node -v # v14 or higher

npx yarn -v # v1.x

npx lerna -v # v4.x recommended
```

- setup

`npm run setup`

Should not see any error. If something goes wrong (probably caused by a registry). Run `npm run clean` and try it again.

> If you are in China. You may want to change registry to a mirror. 
> - `npm config set registry https://registry.npm.taobao.org`
> - `yarn config set registry https://registry.npmmirror.com/`

- build packages

`npm run build`

If something goes wrong. You should try `npm run rebuild` which will clean up all the build caches.

- watch files and serve examples

Good old fashioned `npm start`

## Code of Conduct

Alibaba has adopted a Code of Conduct that we expect project participants to adhere to.

Please refer to [Alibaba Open Source Code of Conduct](https://github.com/AlibabaDR/community/blob/master/CODE_OF_CONDUCT.md) ([中文版](https://github.com/AlibabaDR/community/blob/master/CODE_OF_CONDUCT_zh.md)).

## 协议

本项目使用 MIT 协议，three.js 源码版权归 three.js 作者所有。

详见 ./LICENSE

## 免责声明

General Scene Interface (GSI) is a 3-D graphics toolkit library with a scene definition API which is inspired by syntax of three.js, glTF 2.0 and other popular specifications and implements.

We makes no claim that GSI is compatible of glTF.

WebGL and the WebGL logo are trademarks of the Khronos Group Inc.

glTF and the glTF logo are trademarks of the Khronos Group Inc.

OpenGL® and the oval logo are trademarks or registered trademarks of Hewlett Packard Enterprise in the United States and/or other countries worldwide.

OpenGL is a registered trademark and the OpenGL ES logo is a trademark of Hewlett Packard Enterprise used by permission by Khronos.

本项目包含的 three.js 的部分源码，版权归 three.js 的作者所有。

本项目的 scene graph 部分的接口语义，借鉴了 threejs, glTF 2.0 和 BabylonJS 的命名思路，未使用 BabylonJS 的源码。

本项目没有经过 khronos 验证程序的验证，并非 “兼容” 或 “实现” 了 glTF, OpenGL 和 webgl 的接口或标准。

对于本项目的使用者或标准实现者，如果需要 khronos 的认证，可自行向 khronos 提交认证申请。

详见 [./disclaimer.txt](./disclaimer.txt)

# General Scene Interface

**This Project Is Under Heavy Depelopment And Not Yet Fully Uploaded. **

**本项目仍处于整理与上传过程中**

----

> 抛砖引玉
>
> Build your own 3D engine and editor.

GSI 是一个 Web 3D 实时渲染领域的伞项目，包含一套标准化的通用场景接口，以及基于其上的工具集。致力于为 Web 3D 中的必要环节提供接口规范、算法范式和最佳实践，作为砖瓦，帮助开发者快速构建复杂的渲染引擎和高级 3D 软件。

本项目不是一个新的渲染引擎，恰恰相反，本项目可以与 Web 和桌面端的渲染引擎、建模软件协同工作。

## 项目目标

> Web 3D 社区已经有很多优秀的渲染引擎，本项目的开发者们也写过几个（不那么优秀的），设计上难免同质。实现上，基于 WebGL 画一个场景并没有想象中麻烦。
>
> 但是对比影视工业和游戏工业的基础设施，会发现，Web 3D 仍旧处于刀耕火种的荒蛮年代。再做一个渲染引擎，也并不会解决 Web 3D 生产力低下的行业现状。
>
> 不容置疑的是，Web 3D 正如其他 Web 领域，变革性的产品必然是来自开源社区的点滴积累，而非商业化的集成软件。
>
> 罗马不是一天建成的，于是所以我们决定回过头来，老老实实做砖，希望大家能在上面添砖加瓦，建更好的高楼大厦。

本项目致力于做 Web 3D 领域的 LLVM，把实时渲染中最脏最重复的环节做到最好，为 Web 3D 开发的现代化进程提供砖石，打破和游戏、影视行业工具链的壁垒。

本项目将在框架、平台、工具库之外，维护一个标准化的运行时场景接口，和基于此标准的工具集，平行于 “渲染引擎” “游戏引擎” “开发工具” 这些概念，
为引擎开发者和高级工具开发者提供跨引擎、跨生态系统的开发方案和 最佳实践。

我们不会提供一个新的渲染引擎，而是提供能孕育更复杂的底层渲染技术和上层开发工具。把 3D 开发过程中，最固定、最重复、最脏的环节，做到最完善。

本项目的目标用户是 `{渲染引擎、可视化框架、地图库、建模软件、场景编辑器、高级创意开发软件}` 的开发者，如果你只需要做常规的 3D 模型渲染，建议选择一个开源渲染引擎，事实上，本项目的许多组件都可以和 three.js 等渲染引擎协同工作。

## 项目结构

> 本项目结构使用 monorepo，但是努力将复用粒度缩小到 “代码片段” 而非 “npm包及其依赖”，我们尽可能不对开发框架和工程方案做任何限制，并且尽可能地减少依赖。

### IR

Scene Graph IR 是该项目的核心标准。

我们需要一个标准化的场景描述和接口，才能让渲染引擎、外部软件、工具集之间在运行时协同工作，同时将 前置流程（建模、场景构建与更新）、中置流程（场景本身的优化与预处理）、后置流程（与底层 API 的交互以及图形渲染）良好的分离。

该 IR 需要满足以下特征：

- 实时高效
- 运行时动态编辑
- 能够与社区标准之间实时互转
- 核心标准稳定而简洁
- 可扩展
- 语言特性无关

为了实现这些艰巨的目标，我们将 场景定义 分为两部分：

Scene Graph：场景树，场景内容的具体定义，包括物体之间的 DAG 结构、每个物体的几何数据和材质数据。Scene Graph 的设计同质而又多样，这种不必要的不兼容，在图形软件之间建立了壁垒。为了打破壁垒，我们要做的只是在其中取个交集、合并语义。

该标准需要力求稳定与无偏，努力与现有工具保持实质上的等效性，来实现“无感的”实时互转。

该部分设计参考了 three.js API、BabylonJS API、glTF 2.0 等接口设计中的语义。

Scene Props：场景的扩展属性。包含对期望渲染效果的语义性描述，包含相机、光照、后期、渲染管线等分歧较大、底层相关性高、难以标准化的接口。

该部分的接口设计，我们用松散的、目标导向的语义性描述，而非指定一种实现或者算法。把具体的实现方案、效果等级和参数优化，交给渲染管线和底层引擎的设计者来决定，并允许丰富的自定义字段。

只有这样才能保证 Scene Graph IR 的稳定性和公正性。保证引擎实现者发挥空间的同时，“尽可能”地实现效果分级。

### processors

图形软件中的常用环节，包括对场景的交验、标准化、裁剪、简化、拾取、优化等算法。在每个步骤中逼近最佳实践，来帮助开发者实现“默认的最佳实践”。

所有算法基于 IR 来保证持续优化。

该部分应可独立应用于外部软件可现有渲染引擎。

### frontend toolset

IR 的前序流程。包括构建与编辑场景的开发接口、从 three.js 等软件到 IR 的实时转换、从 gltf 2.0 格式数据到 IR 的实施转换。

开发者可以使用该部分组件，来设计自己的顶层 API，或者接入现有软件的顶层 API

### backend toolset

IR 的后续流程。包括 IR 到外部软件、渲染器的实时转换、IR 到 glTF 文件的实时转换、基于不同图形 API 的 IR 渲染器。

开发者可以在此环节实现具有特定功能或针对特定平台的渲染器。

## 性能考量

- IR 这一环节的存在意味着：高级场景接口的数据结构 和 IR 数据结构 之间会发生实时互转。
- IR 的标准化意味着：开发者无法为某个特定的功能设计独特而高效的数据格式。
- 前中后三阶段的分离和解耦意味着单向数据流，数据修改的创建和响应者之间要遵循严格的先后次序，同时意味着增量更新和变化监测机制的存在

以上三个现实，会为整个系统增加不可避免的 overhead，我们认为这种结构上的 overhead 从长远来看是值得的。

一个系统的最终性能并不只是由每个环节之间的通信性能决定的，更是由整个系统的“可优化性”、对瓶颈优化的实际投入、以及这些优化在系统发展中的保留率决定的。

一个系统中的所有瓶颈环节能够实现关注点分离、模块内部能够专注于最佳实践、模块之间存在稳定的沟通规范，终究会带来更多的价值，这些现象在 微服务和微内核 的发展中已经有所体现。

## 开发文档

%%TODO

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

详见 ./disclaimer.txt

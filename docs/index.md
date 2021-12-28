# General Scene Interface Project

This is the document for GSI Project.

[toc]

> #### Document roadmap
>
> - [x] 文档结构
> - [ ] Project Intro
> - [ ] Fast Useage
> - [ ] Philosophy
> - [ ] Examples
> - [ ] Best Practice
> - [ ] API Doc

## Project Intro

> 对 GSI 项目的介绍，包括缘由、定位、特点、结构、开发方案等。

本项目的存在是为 Web 3D 社区提供规范化的基础设施，以提高 Web 3D 技术产品的～～～

长期以来 Web 3D 社区将

## Philosophy

> 该项目的设计哲学

## Getting Started

> 快速上手

## Structure

> 项目结构和源代码结构

## Development

> 如何使用 GSI 开发 3D 应用；
>
> 如何本地开发 GSI。

## API Doc

> API 接口

## Examples

> Examples index

## 管理员手记

> 项目管理员的操作文档和操作规范

### 复用的最小粒度

JS 的语法、模块、包管理机制，虽然简单却复杂多变，提高了 JS 代码的维护和复用成本，长远来看制约了该领域知识的健康迭代，解决问题的钥匙也许不是设计更先进的机制，也许是在更细的粒度上、共享复用价值更高的知识，因为黑盒的维护者总有一天会停止维护，无力再去迎合瞬息万变的“机制”，在 JS 社区中这一天来得格外早。

理想的开源社区是 sharing knowledge 而不是 sharing work。

理想的代码复用粒度应该是 any code fragments 而不是 a package with all it's dependents。

### Why yarn+lerna

Yarn、lerna、boltpkg，对我们来说只是维护 monorepo 的脚本库，最终得到的依然是 humble old npm packages。

pnpm/pnp 和集成方案 nx 等，与 npm 不完全兼容，要求下游项目全部使用相同的机制。避免生态割据是本开源库的核心目的，因此在工程选型的时候必须尽可能少地限制和假设使用者的开发环境。

当前尽量从开发流程和维护脚本上规避 yarn 和 npm 的问题。

尽量不使用任何高级的管理工具，去掉所有能去掉的开发依赖，帮助用户可以按照任意粒度复用我们开源出来的知识。

### 规避 hoist 的问题

尽可能的避免 hoist 带来的风险。

是用 yarn 作为 monorepo 的 package manager，hoist 是不可避免的，如果为每个 package 安装独立的依赖，效率和空间占用都是无法接受的。因此需要在 hoist 的基础上增加限制，来避免 **pathom dependencies** 等问题。

- always symlink explicit dependents to local，必须将显式依赖 symlink 到当前文件夹的 node_modules 中，避免 nodejs 向上查找依赖。

- 限制编译器向上查找 modules
  - tsconfig 限制 resolution 范围
- 尽可能详尽地在 root/package.json 中标出 nohoist
  - 来避免 root/node_modules 中出现不必要的包
- 尽可能的自动删除 root/node_modules 中不必要的内容
  - 主动删除 lerna link 过的 package

### Lerna 和 yarn 的问题

As an important tool, Lerna&yarn1 sure looks like out of maintenance.

开发者需要对 Lerna 有个正确的预期：Lerna 设计用来维护结构简单的 monorepo 工程。不兼容 multi-monorepo 等复杂的工程结构。没有插件系统和丰富的配置项。Hacking lerna means ditching lerna.

Lerna 的许多 filter 并不会如期望中工作。[官方表示][link-lerna-bootstrap-filter] 不支持 partial bootstrap，导致 lerna 项目不能单独处理部分 package, 对于有大量外部依赖的大型项目会造成性能问题。

yarn 不能 ignore optional dependents（有接口但不生效）。
yarn.lock 与 symlink 同时使用会造成非常多的问题，每次修改 dependents 或者创建 symlink，都需要删掉 yarn.lock，还不如不要。

在项目稳定之后，可以参照[微软的方案](https://github.com/angular/angular/blob/master/yarn.lock.readme.md)对 yarn.lock 做出规范.

Partial setup 和 multi repo link 等功能需要使用脚本自己实现。

### 开发环境依赖

example 需要的依赖应该安装在 example 目录中；开发环境用到的依赖因为只能放在 root，因此必须最小化。

**ts 应永远升级最新版，但是编码应该避免使用新特性。**

### Shared Stuff

共享代码修改的风险比较高，不应该留出文档交给用户操作。必须在共享内容中明确注释“不可修改”，以免修改后被直接覆盖。

可以设置一个 hook 来检查 共享内容和 root 是否一致，如果有用户修改要 reject 掉。

宁可每次把 shared code 复制到每个 package 中造成重复代码，也不要在 package 里依赖 ../../../ 这种上游目录，导致 package 无法拿出 monorepo 使用。

### 避免依赖 typescript 的 project 机制

tsc 提供的 project/references/compose 机制，解决了 monorepo 的增量更新和编辑器 go-to-define 等问题，但是存在严重的缺陷：

#### 问题

- 存在多种语言、多种编译器或打包工具的项目无法使用

该机制只适用于全局只有 ts/js 一种编程语言的项目中，如果某个 package build 的过程涉及到 tsc 之外的脚本，该机制将无法工作。

- 硬编码的目录结构

reference 的正常工作要求 package 目录之间的相对路径稳定不变，将导致 package 无法单独从项目中拿出来复用。这一举措违背了本项目和 monorepo 的设计初衷。

- 全量编译存在明显的性能问题

多个入口的共同依赖会被编译多次。Actually，我们从 tsc project 改为 “逐个编译” 之后，编译时间缩短了一半以上。

- reference 编写繁琐且容易出错
- 语义上与 package.json 的 dependents 略微重复

#### 方案

- 区分编译和 vscode 使用的 tsconfig
- project 仅用于改进 vscode 的代码提示，编译阶段则完全不使用。
- 使用脚本检查 vscode 使用的 tsconfig.references，和 dependents 保持一致。
- 编译阶段使用 monorepo 通用的方案：依赖拓扑分析后按顺序编译。
- 单独复用 package 的时候可以主动删除 references

### 如何保证 monorepo 的 packages 可以脱离 monorepo 工作

可以将 monorepo 的 package 同步成独立的 repo （https://github.com/splitsh/lite），独立repo将必须是只读的，所有对这些 package 的开发工作必须在 monorepo 中进行（这也是 monorepo 的意义所在）。

可以通过 git 脚本，单独 clone monorepo 的 package ，而非整个 monorepo，需要保证 package 依赖的其他 package 即使不存在也要能正常工作。

可以将独立 repo 作为 subtree clone 到 monorepo 中作为一个 package。这种情况下需要 monorepo setup 的时候能够 ignore 这些 package。

由于 alibaba 开源管理方案不允许我们创建任意多个 repo，因此目前无法使用拆分 repo 的方案，至少无法放在官方 org 里。

### multi monorepo 如何联调

#### 方案 A

如果 root 开发环境相同，可以合并两个 monorepo 的 packages。得到一个新的 repo。但是这个新的 repo 会非常奇怪。

#### 方案 B

如果 root 开发环境相同，可以把上游 monorepo 的代码放进来。缺点是，下游 repo 会变得非常大。

#### 方案 C

上游开发好，发布到本地 register，作为普通依赖安装。需要一个稳定的本地 register 或者更简单的中转方案。

#### 方案 D

symlink，通过脚本识别上游 monorepo 为本地项目，然后用类似 lerna 的 dependents link 的方案，把上游项目 link 到下游项目。实质上是跨 monorepo 的 monorepo link。

https://github.com/lerna/lerna/blob/a47fc294393a3e9507a8207a5a2f07648a524722/utils/symlink-dependencies/symlink-dependencies.js#L22

##### 不建议的方案

- 将上游 repo 的调试代码发布到公开 register 中。
- 使用 yarn 或者 npm 的全局 link，不是为 monorepo 设计的。

#### monorepo 如何 watch

不太可能依赖编译器或者打包工具的 watch 机制。需要脚本实现。

注意：如果一个 package 的 build 过程只涉及 语法转译，而不涉及“将依赖代码打包”，那其实完全不受上游依赖变化的影响。watch 的时候不需要考虑 dirty tree ，只 build 每个 dirty 包即可。

参考 [scripts/watch](../scripts/watch.mjs)

### 单向数据流

Scene Schema 作为整个工作流的 IR，需要将前置流程和后置流程隔离开。前置写，后置读。

规定：对于前置流程，IR 应该视为 write-only，用户不应该从 IR 上读到自己没有主动输入的内容

于是：

- IR 不应该包含 “不应该由用户输入” 的字段
- IR 上不应该存在 “事件” “生命周期” “钩子函数” 的接口
- 后置流程对 IR 的处理过程、进度、结果不应该保存在 IR 上，不应该通过 IR 反馈给前置流程
- 用户如果需要某个计算结果，应该显式得调用计算过程
- 用户如果需要生命周期勾子，应该从

然而：

- 常规的渲染流程每个步骤都会产生中间产物，这些计算结果经常会被用户逻辑使用到
- 许多计算结果有 “一桢之内不用重新计算” 的特征，不需要缓存逻辑

然而的然而：

- 中间计算结果的更新时机往往十分复杂多变，通常不在渲染器的 “标准接口” 里，而是开发者根据经验手工处理的
- 使用中间结算结果修改场景，存在许多安全隐患，相当于 react 在 setStates 中又调用 setStates
- “一桢之内不用重新计算” 并不是可靠的缓存逻辑，其实质是 “用户调用 render 之后不再修改场景，于是不用再重新计算”，但是生命周期和钩子函数的存在破坏了这个假设

于是：

- 重复调用应该用缓存来解决
- 缓存应该由具体的计算过程决定而不是依赖 “常见的渲染流程”
- 应该允许用户假设 “何时何地调用计算” 得到的结果都是正确且 up-to-date 的

### ts and es-module

ts 可以通过 tsconfig 的配置生成 es modules 的语法，但是有两个语法错误：

- es modules 语法被写在 .js 文件中
- import 的文件没有 .js/.mjs 扩展名

这两个问题在使用 webpack 的时候不会显现出来。因为 webpack 的语法判断逻辑比 node 要宽松的多。

但是如果使用其他工具或者直接使用nodejs执行（包括jest等测试环境），这些错误就会显现出来。

#### es modules 语法被写在 .js 文件中

.js 文件默认被判断为 commonjs 语法，因此包含 es module 的 import export 语法属于语法错误。

ts 不支持将 .ts 文件的 output 写入到 .mjs 文件中（在 ts 4.5 之后，可以将原文件改命为 .mts 来生成 .mjs）

nodejs 支持通过修改 package.json 中的 type 字段来指定目录中所有 .js 文件的语法。
如果在 package.json 中增加 `"type": "module"`，该文件夹下的所有 .js 都会被识别为 es module 语法。

可以通过这种方式在不修改代码的情况下。快速修复该问题。但是要注意副作用：

- 该文件夹下的所有 .js 文件都会变成 es module 语法，包括 build script、dev server 等

如果不想重写这些 commonjs 代码，则需要把这些文件名改成 .cjs 来覆盖掉 package.json 中的规则。

nodejs 规定 .cjs .mjs 这两个文件扩展名的优先级高于 package.json 中的 type 字段。

- es module 语法的文件中，不能使用 __dirname,   __filename 等 commonjs 才有的全局变量

可以自行添加 polyfill 计算得到

#### import 的文件没有 .js/.mjs 扩展名

在 commonjs 中 `require('./X')` 这种语法是正确的，nodejs 会[按照顺序查找这些文件](https://nodejs.org/api/modules.html#all-together)

```
1. If X is a file, load X as its file extension format. STOP
2. If X.js is a file, load X.js as JavaScript text. STOP
3. If X.json is a file, parse X.json to a JavaScript Object. STOP
4. If X.node is a file, load X.node as binary addon. STOP
```

但是在 es module 中，`import './X'` 是不合法的, 

> [**Mandatory file extensions**](https://nodejs.org/api/esm.html#mandatory-file-extensions)
> A file extension must be provided when using the import keyword to resolve relative or absolute specifiers. Directory indexes (e.g. './startup/index.js') must also be fully specified.
> 
> This behavior matches how import behaves in browser environments, assuming a typically configured server.

该问题在社区中有 [非常非常长的争论](https://github.com/microsoft/TypeScript/issues/16577)。结论是 `won't fix`。

官方回复中，某个版本之后的 ts 允许用户这样写来生成正确的 es module 代码:

```typescript
// file b.ts
import a from './a.js' // use `./a.js` instead of `./a` or `./a.ts`

// file a.ts
export const a = 1
```

这样做的问题是，你明知道 `./a.js` 是个不存在的文件，旁边的文件明明叫 `a.ts` 

#### webpack 为什么没有问题

也许由于历史原因，测试发现，webpack 对很多混乱的写法都做了兼容。

https://webpack.js.org/api/module-methods/

在 .js 文件中：

- 使用 import export 这些 es module 语法是合法的
- 使用 require 这种 commonjs 语法也是合法的
- **import 和 require 都不需要后文件缀名**

在 .mjs 文件中，或者被 package.json 标注了 `"type": "module"` 的 .js 文件中:

- 使用 import export 这些 es module 语法是合法的
- **使用 require 这种 commonjs 语法也是合法的, 但是会被原样保留，被 require 的包不会被打包（与 webpack 文档冲突）**
- require 语法由于不会打包，也不需要后缀名
- import 的语法需要后缀名

在 .cjs 文件，或者被 package.json 标注了 `"type": "commonjs"` 的 .js 文件中：

- 不能使用 import export 这些 es module 语法
- require 不需要后缀名

因此，错误的语法可以通过webpack编译。

#### typescript 4.5 新增的方案

[Announcing TypeScript 4.5 Beta](https://devblogs.microsoft.com/typescript/announcing-typescript-4-5-beta/#esm-nodejs)

首先，应该避免重度依赖 ts 最新版本的特性。

从文档来看， `module` 设为 `node12` ，将会和 `nodejs` 一样通过 `package.json->type` 来判断一个文件使用 es modules 还是 commonjs，
而不是现在从 `tsconfig.json->compilerOptions->module` 来判断。

更新文档多个地方存在描述混乱，4.5.2 仍不支持文档中提到的字段，所以目前不是很清楚会带来多少影响。

typescript 事到如今已经积累了大量的历史遗留问题和设计缺陷，我们倾向于不要使用核心功能以外的特性。

#### 怎么办

对于文件后缀名，如果不想大动干戈，可以在所有 package.json 中标注 type=module, 然后把老的 commonjs 文件后缀改为 .cjs.

对于 import 路径的后缀名，没有完美的方案：

- 将错就错，忠于一套能用的打包工具，不支持脱离 webpack 运行

不考虑，还是要想方设法生成正确的语法，而不是要求所有环节的工具都支持错误的语法

- 在 build 脚本中，把生成的 js 代码中，所有的 `import 'x'` 改写成 `import 'x.js'`

社区方案

- 把所有ts源码中的 `import 'x'` 改写成 `import 'x.js'`

ts 官方推荐的方案， 写出来不合逻辑，但是生成的代码是正确的（前提是你生成的一定是.js后缀名）

### Bounding 的继承问题

按照 three.js 和 gltf2 的设计，bounds只存在在 geometry 和 attribute 上，因此只有 renderable object 拥有 bounding volume。
因此 culling 只能检查所有的 renderable object，不能检查 枝干节点（inode），bounds 范围不包含 children，parent 的 culling 也不会影响 children 的 culling。

这是一种简单直白的方案，但是 object 的 visibility 是继承的（父节点的 visible=false 会导致所有子节点不可见），culling 却不继承。
如果渲染引擎没有留出其他不继承的 visibility 判断接口，将很难从外部进行 culling（除非改变树结构）。

#### 可能的解决方案

- 使用 BVH 而非 geometry bounds 进行 culling 计算

BVH 的生成实现在 processor-bounds 中，生成耗时比较长，很难进行缓存（需要判断整个子树的变化），每帧更新是非常不划算的。主要原因是所有的 aabb 都要在 world space 中，而 box 进行 world matrix transform 需要对8个顶点分别变换并取新的bbox。

因此，BVH 只应该用在能生成 BVH 的场合，例如静态场景的优化。不能作为解决问题的前置条件。

- 修改树形状，解除 cull-able 物体的父子关系

可以局部修改，将 renderable object 和 inode 分离开，由于几乎所有渲染引擎都允许 renderable object 拥有自己的 children，因此不方便在 IR 中要求 inode 不可渲染（or maybe we can？）。

也可以将整个输出打平，更有利于性能优化，也更符合 “不继承” 的行为。

- 要求用户保证 geometry bounds 包含 children 的 geometry bounds

语义上可以这样要求，但是如果子元素会动，这个要求将变得不可实现，schema 中不应该出现明确不可实现智能ignore掉的标准。

### 材质编程插槽的设计问题

插槽编程材质由于本身的复杂性，很难定出一个schema，潜在的判定标准例如：

- 支持编程材质可以跨backend底层引擎运行

webgl引擎，无论 1/2，api的glsl的区别比较容易处理，主要的麻烦在于引擎自身的shader代码完全不同，因此插槽代码的运行上下文不同，只需要统一调

- 支持编程材质可以跨图形API运行

- 支持编程材质向下兼容

- 支持今后可能会出现的异构运行环境

业内的可能方案：

- 使用蓝图编辑器或者定义一个新的脚本语言，来拼装成不同地层需要的shader

假设有以下限制因素的情况下：


可以发挥的边界：

---

[a][link-a]

---

<!-- Identifiers -->

[link-a]: http://google.com
[link-lerna-bootstrap-filter]: https://github.com/lerna/lerna/issues/2352

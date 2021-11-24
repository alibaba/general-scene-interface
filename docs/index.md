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

#### 复用的最小粒度

JS 的语法、模块、包管理机制，虽然简单却复杂多变，提高了 JS 代码的维护和复用成本，长远来看制约了该领域知识的健康迭代，解决问题的钥匙也许不是设计更先进的机制，也许是在更细的粒度上、共享复用价值更高的知识，因为黑盒的维护者总有一天会停止维护，无力再去迎合瞬息万变的“机制”，在 JS 社区中这一天来得格外早。

理想的开源社区是 sharing knowledge 而不是 sharing work。

理想的代码复用粒度应该是 any code fragments 而不是 a package with all it's dependents。

#### Why yarn+lerna

Yarn、lerna、boltpkg，对我们来说只是维护 monorepo 的脚本库，最终得到的依然是 humble old npm packages。

pnpm/pnp 和集成方案 nx 等，与 npm 不完全兼容，要求下游项目全部使用相同的机制。避免生态割据是本开源库的核心目的，因此在工程选型的时候必须尽可能少地限制和假设使用者的开发环境。

当前尽量从开发流程和维护脚本上规避 yarn 和 npm 的问题。

尽量不使用任何高级的管理工具，去掉所有能去掉的开发依赖，帮助用户可以按照任意粒度复用我们开源出来的知识。

#### 规避 hoist 的问题

尽可能的避免 hoist 带来的风险。

是用 yarn 作为 monorepo 的 package manager，hoist 是不可避免的，如果为每个 package 安装独立的依赖，效率和空间占用都是无法接受的。因此需要在 hoist 的基础上增加限制，来避免 **pathom dependencies** 等问题。

- always symlink explicit dependents to local，必须将显式依赖 symlink 到当前文件夹的 node_modules 中，避免 nodejs 向上查找依赖。

- 限制编译器向上查找 modules
  - tsconfig 限制 resolution 范围
- 尽可能详尽地在 root/package.json 中标出 nohoist
  - 来避免 root/node_modules 中出现不必要的包
- 尽可能的自动删除 root/node_modules 中不必要的内容
  - 主动删除 lerna link 过的 package

#### Lerna 的问题

As an important tool, Lerna sure looks like out of maintenance.

开发者需要对 Lerna 有个正确的预期：Lerna 设计用来维护结构简单的 monorepo 工程。不兼容 multi-monorepo 等复杂的工程结构。没有插件系统和丰富的配置项。Hacking lerna means ditching lerna.

Lerna 的许多 filter 并不会如期望中工作。[官方表示][link-lerna-bootstrap-filter]不支持 partial bootstrap，导致 lerna 项目不能单独处理部分 package，和 yarn 配合的时候甚至不能忽略掉 optional dependents, 对于有大量外部依赖的大型项目会造成性能问题。

Partial setup 等功能需要使用脚本自己实现。

#### 开发环境依赖

example 需要的依赖应该安装在 example 目录中；开发环境用到的依赖因为只能放在 root，因此必须最小化。

ts 应使用升级最新版，但是 package 应该避免使用最新特性。

#### Shared Stuff

共享代码修改的风险比较高，不应该留出文档交给用户操作。必须在共享内容中明确注释“不可修改”，以免修改后被直接覆盖。

可以设置一个 hook 来检查 共享内容和 root 是否一致，如果有用户修改要 reject 掉。

#### 避免依赖 typescript 的 project 机制

tsc 提供的 project/references/compose 机制，解决了 monorepo 的增量更新和编辑器 go-to-define 等问题，但是存在严重的缺陷：

##### 问题

- 存在多种语言、多种编译器或打包工具的项目无法使用

该机制只适用于全局只有 ts/js 一种编程语言的项目中，如果某个 package build 的过程涉及到 tsc 之外的脚本，该机制将无法工作。

- 硬编码的目录结构

reference 的正常工作要求 package 目录之间的相对路径稳定不变，将导致 package 无法单独从项目中拿出来复用。这一举措违背了本项目和 monorepo 的设计初衷。

- 全量编译存在明显的性能问题

多个入口的共同依赖会被编译多次。Actually，我们从 tsc project 改为 “逐个编译” 之后，编译时间缩短了一半以上。

- reference 编写繁琐且容易出错
- 语义上与 package.json 的 dependents 略微重复

##### 方案

- 区分编译和 vscode 使用的 tsconfig
- project 仅用于改进 vscode 的代码提示，编译阶段则完全不使用。
- 使用脚本检查 vscode 使用的 tsconfig.references，和 dependents 保持一致。
- 编译阶段使用 monorepo 通用的方案：依赖拓扑分析后按顺序编译。
- 单独复用 package 的时候可以主动删除 references

#### 如何保证 monorepo 的 packages 可以脱离 monorepo 工作

可以将 monorepo 的 package 同步成独立的 repo （https://github.com/splitsh/lite），独立repo将必须是只读的，所有对这些 package 的开发工作必须在 monorepo 中进行（这也是 monorepo 的意义所在）。

可以通过 git 脚本，单独 clone monorepo 的 package ，而非整个 monorepo，需要保证 package 依赖的其他 package 即使不存在也要能正常工作。

可以将独立 repo 作为 subtree clone 到 monorepo 中作为一个 package。这种情况下需要 monorepo setup 的时候能够 ignore 这些 package。

由于 alibaba 开源管理方案不允许我们创建任意多个 repo，因此目前无法使用拆分 repo 的方案，至少无法放在官方 org 里。

#### multi monorepo 如何联调

##### 方案 A

如果 root 开发环境相同，可以合并两个 monorepo 的 packages。得到一个新的 repo。但是这个新的 repo 会非常奇怪。

##### 方案 B

如果 root 开发环境相同，可以把上游 monorepo 的代码放进来。缺点是，下游 repo 会变得非常大。

##### 方案 C

上游开发好，发布到本地 register，作为普通依赖安装。需要一个稳定的本地 register 或者更简单的中转方案。

##### 方案 D

symlink，通过脚本识别上游 monorepo 为本地项目，然后用类似 lerna 的 dependents link 的方案，把上游项目 link 到下游项目。实质上是跨 monorepo 的 monorepo link。

https://github.com/lerna/lerna/blob/a47fc294393a3e9507a8207a5a2f07648a524722/utils/symlink-dependencies/symlink-dependencies.js#L22

##### 不可取的方案

- 将上游 repo 的调试代码发布到公开 register 中。
- 使用 yarn 或者 npm 的全局 link，不是为 monorepo 设计的，后患无穷。

#### monorepo 如何 watch

不太可能依赖编译器或者打包工具的 watch 机制。可能需要脚本实现。

---

** TODO ** 该机制疑似造成 vscode ts server 崩溃。考虑完全移除该机制的方案。

[a][link-a]

---

<!-- Identifiers -->

[link-a]: http://google.com
[link-lerna-bootstrap-filter]: https://github.com/lerna/lerna/issues/2352

## 环境配置


- macOS/linux
- nodejs
- yarn (v1)
- vscode (optinal)

## 安装依赖

```bash
npm run setup
```

## 编译

```bash
# 根目录
npm run rebuild
# 不应该看到任何报错
```

## 启动 examples

```
npm start
```

然后打开 `http://localhost:2222/`

如果想要增加 demo，请在 exampels 下新建一个文件夹，然后在 examples/webpack.config.js 中增加对应的 entry

## 工程结构

本项目采用 monorepo，并兼容 multi-monorepo 复杂结构。

本项目努力将复用粒度缩小到 “代码片段” 而非 “npm包及其依赖”，我们尽可能不对开发框架和工程方案做任何限制，并且尽可能地减少依赖。

%%TODO
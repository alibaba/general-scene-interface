echo "安装 examples 的 *外部* 依赖"
cd ./examples
# NOTE package backend 中带了到 renderer 的依赖，这里这样写其实没有意义
npx yarn install --ignore-optional

echo "link examples 的 *本地* 依赖"
cd ../
npx lerna link --force-local


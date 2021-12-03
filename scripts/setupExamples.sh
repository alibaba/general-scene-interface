echo "安装 examples 的 *外部* 依赖"
cd ./examples
npx yarn install

echo "link examples 的 *本地* 依赖"
cd ../
npx lerna link --force-local


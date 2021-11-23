echo "安装 gl2-renderer 的依赖"
cd ./packages/renderers/gl2 
cnpm i 

echo "编译 gl2-renderer"
npm run dist


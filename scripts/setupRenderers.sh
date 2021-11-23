echo "安装 gl2-renderer 的依赖"
cd ./packages/backend/gl2-renderer 
cnpm i 

echo "编译 gl2-renderer"
npm run dist


echo "安装 threelite-renderer 的依赖并编译之"
cd ./packages/backend/threelite-renderer 
cnpm i 

echo "安装 threelite-renderer 的依赖并编译之"
npm run dist
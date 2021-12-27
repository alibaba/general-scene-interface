#!/bin/bash

# DO NOT EDIT
# AUTO COPIED FROM ROOT/shared

echo OUT OF MAINTAINING, USE `build` INSTEAD

./build.sh

# pwd

# npx tsc -v

# rm -rf tsconfig.build.tsbuildinfo

# tsc --project tsconfig.build.json --incremental

# npx tsc --project tsconfig.build.json

# tsc output es module codes in .js files
# which WILL NOT BREAK in nodejs env
# > SyntaxError: The requested module '***' is expected to be of type CommonJS, which does not support named exports.
# add 'type' 'module' properties in package.json fix this.
# but es modules require that `import` must have extension
# so fix it here

# npx node ./scripts/fixTscExtension.mjs
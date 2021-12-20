#!/bin/bash

# DO NOT EDIT
# AUTO COPIED FROM ROOT/shared

# npx tsc --project tsconfig.build.json
# ⬇️ much faster
if [ -e .cached-built-head &&  ]

then
	builtHead=$(.cached-built-head)

	if [`git diff --quiet $builtHead -- ./ || echo changed` == "changed"]
	then
		echo "changed"
		# ./node_modules/.bin/tsc --project tsconfig.build.json
		echo `git rev-parse --short HEAD` > .cached-built-head
	else
		echo "not changed"
	fi
else
	echo "first build"
	# ./node_modules/.bin/tsc --project tsconfig.build.json
	echo `git rev-parse --short HEAD` > .cached-built-head
fi


# tsc output es module codes in .js files
# which WILL NOT BREAK in nodejs env
# > SyntaxError: The requested module '***' is expected to be of type CommonJS, which does not support named exports.
# add 'type' 'module' properties in package.json fix this.
# but es modules require that `import` must have extension
# so fix it here

# npx node ./scripts/fixTscExtension.mjs
# ⬇️ much faster
node ./scripts/fixTscExtension.mjs
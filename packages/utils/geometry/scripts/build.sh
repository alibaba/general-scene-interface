#!/bin/bash

# DO NOT EDIT
# AUTO COPIED FROM ROOT/shared

build () {
	echo building

	# npx tsc --project tsconfig.build.json
	# ⬇️ much faster
	./node_modules/.bin/tsc --project tsconfig.build.json

	# tsc output es module codes in .js files
	# which WILL NOT BREAK in nodejs env
	# > SyntaxError: The requested module '***' is expected to be of type CommonJS, which does not support named exports.
	# add 'type' 'module' properties in package.json fix this.
	# but es modules require that `import` must have extension
	# so fix it here

	# npx node ./scripts/fixTscExtension.mjs
	# ⬇️ much faster
	node ./scripts/fixTscExtension.mjs

	# fix: clean build, dirt rebuild, clean again, should rebuild anyway
	# if folder is dirty, should delete cache file
	if [ -z `git status --porcelain -- ./` ] # True if the string is empty
	then 
		echo `git rev-parse --short HEAD` > .cached-built-head
	else
		rm -f .cached-built-head
	fi
}

if [ -e .cached-built-head ]

then
	builtHead=$(<.cached-built-head)

	if [ `git diff --quiet $builtHead -- ./ || echo "true"` ]
	then
		echo changed
		build
	else
		echo not-changed
	fi
else
	echo first-build
	build
	
fi



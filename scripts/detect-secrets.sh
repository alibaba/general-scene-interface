#!/bin/sh

# install detect-secrets 

python3 -m pip install detect-secrets

# create baseline

detect-secrets scan \
	--exclude-files ".*package.json$" \
	--exclude-lines "password = 'EXAMPLE'" \
	> scripts/.secrets.baseline

# update baseline

detect-secrets scan \
	--baseline scripts/.secrets.baseline

# scan all files

git ls-files -z | xargs -0 detect-secrets-hook --baseline scripts/.secrets.baseline

# scan staged files

git diff --staged --name-only -z | xargs -0 detect-secrets-hook --baseline scripts/.secrets.baseline
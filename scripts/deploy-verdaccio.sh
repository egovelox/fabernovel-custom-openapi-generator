#!/usr/bin/env bash

set -e

export NPM_REGISTRY=http://localhost:4873

cd "$(dirname "$0")/.."
npm run build

# push to local server (verdaccio)
npm unpublish --registry ${NPM_REGISTRY} --force
npm publish --registry ${NPM_REGISTRY} --force

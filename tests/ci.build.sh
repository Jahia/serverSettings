#!/bin/bash
# This script can be used to manually build the docker images necessary to run the tests
# It should be executed from the tests folder

echo " ci.build.sh == Build test image"

source ./set-env.sh

# It assumes that you previously built the module you're going to be testing
#   and that the modules artifacts are located one level up

if [ ! -d ./artifacts ]; then
  mkdir -p ./artifacts
fi

if [[ -e ../target ]]; then
  cp ../target/*-SNAPSHOT.jar ./artifacts/
fi

# Use Docker buildx with cache if enabled via environment variables
if [ "$DOCKER_BUILD_CACHE_ENABLED" = "true" ]; then
  echo "Docker cache is enabled, building using 'docker buildx build'"
  echo "cache-from: $DOCKER_BUILDX_CACHE_FROM"
  echo "cache-to: $DOCKER_BUILDX_CACHE_TO"
  docker buildx build \
    --cache-from "$DOCKER_BUILDX_CACHE_FROM" \
    --cache-to "$DOCKER_BUILDX_CACHE_TO" \
    -t ${TESTS_IMAGE} \
    --load \
    .
else
  echo "Docker cache is disabled, building using 'docker build'"
  docker build -t ${TESTS_IMAGE} .
fi

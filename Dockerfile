# Expects a prior "npm run build" on the host: dist/standalone bundles are self-contained (no npm install needed).
FROM node:22-alpine AS baseline

ENV NODE_ENV=development

# The bundles need only the node binary; npm/yarn/corepack ship most of the base image's CVEs.
RUN apk upgrade --no-cache \
 && rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

WORKDIR /sp

COPY ./dist/standalone ./dist/standalone/

# Specify the 3rd arg in the command option in the compose yml or docker run command
ENTRYPOINT [ "node", "--enable-source-maps", "--inspect=0.0.0.0" ]
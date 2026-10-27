# Expects a prior "npm run build" on the host: dist/standalone bundles are self-contained (no npm install needed).
FROM node:22-slim AS baseline

ENV NODE_ENV=development
WORKDIR /sp

COPY ./dist/standalone ./dist/standalone/

# Specify the 3rd arg in the command option in the compose yml or docker run command
ENTRYPOINT [ "node", "--enable-source-maps", "--inspect=0.0.0.0" ]
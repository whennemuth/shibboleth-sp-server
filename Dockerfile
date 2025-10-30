# -----------------------------------------------------------
#                      STAGE 1
# -----------------------------------------------------------
FROM node:slim AS baseline

ENV NODE_ENV=development
USER root


# Install esbuild globally
RUN npm install -g typescript

# Install dependencies
COPY ./package.json ./sp/
WORKDIR /sp
RUN npm install --save-dev

# Copy in source files and the typescript configuration for their build
COPY ./src ./src/
COPY ./tsconfig.json ./

# Transpile all source, including the sp request event handler package, and create source maps
# RUN node_modules/typescript/bin/tsc -p tsconfig.json
RUN npm run build:tsc

# Specify the 3rd arg in the command option in the compose yml or docker run command
ENTRYPOINT [ "node", "--inspect=0.0.0.0" ]
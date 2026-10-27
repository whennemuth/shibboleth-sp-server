# Packaging and Installing:

The following is an example of how shibboleth-sp-server can be packaged and installed into another npm project.
Here shibboleth-sp-server is packaged up, and then we proceed from the perspective of a user who is importing it into a separate project to run/sample. 

1. Download this repo, package shibboleth-sp-server as a tarball to a new project folder *(shibboleth-sp-client)*, and open that new project in vscode:

   ```
   # Prerequisite (Node.js 22+): the shibboleth-sp library tarball must exist, since it is a dev dependency of this project.
   (cd ../shibboleth-sp && npm install && npm run pack)

   # Be in the root directory of this project:
   npm install
   mkdir ../shibboleth-sp-client
   npm pack --pack-destination ../shibboleth-sp-client
   code ../shibboleth-sp-client
   ```

   `npm pack` runs the build automatically *(via the `prepack` script)*, producing:

   - `dist/cjs/index.js` - CommonJS build, used by `require()`
   - `dist/esm/index.mjs` - ES module build, used by `import`
   - `dist/types/index.d.ts` / `index.d.mts` - type declarations

   The shibboleth-sp library is bundled into these files, so consumers do not need its tarball.

2. Open a bash prompt in the root of the new vscode project and install and configure required dependencies

   ```
   # Install typescript and tsx (runs typescript files directly, no compile step)
   npm install -D typescript tsx @types/node
   
   # Configure typescript (used for type checking and editor support only):
   echo '{
     "compilerOptions": {
       "target": "ES2023",
       "module": "nodenext",
       "types": [ "node" ],
       "noEmit": true,
       "strict": true,
       "skipLibCheck": true
     }
   }' > tsconfig.json
   
   # Install the shibboleth-sp-server package
   npm install shibboleth-sp-server-1.0.0.tgz
   ```

   *NOTE: If you re-pack the tarball without changing its version number, npm may keep installing the old contents. Run `npm uninstall shibboleth-sp-server` before installing it again (or bump the version in shibboleth-sp-server's package.json).*

3. Create some code to import and use the package

   - **typescript:** *(recommended)*

     1. Create a new typescript file `./Main.ts`, with the following content:

        ```
        import { handler, startExpressServer } from 'shibboleth-sp-server';
        
        startExpressServer(handler);
        ```

     2. Create a launch configuration to run `Main.ts`:

        ```
        mkdir .vscode && echo '{
          "configurations": [
            {
              "type": "node",
              "request": "launch",
              "name": "launch-sp-in-express",
              "skipFiles": [
                "<node_internals>/**"
              ],
              "runtimeArgs": [
                "--import", "tsx"
              ],
              "args": [
                "${workspaceFolder}/Main.ts",
              ],
              "env": {
                "UNIT_TESTING": "true"
              },
              "envFile": "${workspaceFolder}/.env",  
            }
          ]
        }' > .vscode/launch.json
        ```

   - or...

   - **cjs:**

     1. Create a new javascript file `./main.js`, with the following content:

        ```
        const { handler, startExpressServer } = require('shibboleth-sp-server');
        
        startExpressServer(handler);
        ```

     2. Create a launch configuration to `run main.js`:

        ```
        mkdir .vscode && echo '{
          "configurations": [    {
              "type": "node",
              "request": "launch",
              "name": "launch-sp-in-express-cjs",
              "skipFiles": [
                "<node_internals>/**"
              ],
              "args": [
                "${workspaceFolder}/main.js",
              ],
              "env": {
                "UNIT_TESTING": "true"
              },
              "envFile": "${workspaceFolder}/.env",  
            }
          ]
        }' > .vscode/launch.json
        ```

4. Create a .env file with configuration values *(See Configuration section in [main readme.md file](../README.md))*. Example:

   ```
   DOCKER_REGISTRY="037860335094.dkr.ecr.us-east-2.amazonaws.com"
   TZ="utc"
   ENTITY_ID="https://*.kualitest.research.bu.edu/shibboleth"
   IDP_CERT="MIIDPDCCAiSgAwIBAgIVAJ6... more content..."
   ENTRY_POINT="https://shib-test.bu.edu/idp/profile/SAML2/Redirect/SSO"
   LOGOUT_URL="https://shib-test.bu.edu/idp/logout.jsp"
   APP_AUTHORIZATION="true"
   APP_LOGIN_HEADER="SHIB-HANDLER"
   APP_LOGOUT_HEADER="SHIB_IDP_LOGOUT"
   APP_APPEND_AUTH_HEADERS="false"
   DOCKER_APP_PORT="443"
   DOCKER_SP_PORT=5000
   SAML_CERT="-----BEGIN CERTIFICATE-----
   Lines of content...
   -----END CERTIFICATE-----"
   SAML_PK="-----BEGIN PRIVATE KEY-----
   Lines of content...
   -----END PRIVATE KEY-----"
   ```

5. Navigate to https://localhost:5000 in the browser. This should result in the standard shibboleth login showing up.
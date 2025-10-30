# Packaging and Installing:

The following is an example of how shibboleth-sp-server can be packaged and installed into another npm project.
Here shibboleth-sp-server is packaged up, and then we proceed from the perspective of a user who is importing it into a separate project to run/sample. 

1. Download this repo, package shibboleth-sp-server as a tarball to a new project folder *(shibboleth-sp-client)*, and open that new project in vscode:

   ```
   # Be in the root directory of this project:
   
   mkdir ../shibboleth-sp-client
   npm run build && npm pack --pack-destination ../shibboleth-sp-client
   code ../shibboleth-sp-client
   ```

2. Open a bash prompt in the root of the new vscode project and install and configure required dependencies

   ```
   # Install the typescript and its compiler, tsc
   npm install -g typescript
   npm install ts-node
   
   # Configure typescript compiler:
   echo '{
     "compilerOptions": {
       "target": "es2016",
       "module": "Node16",
       "moduleResolution": "node16",
       "esModuleInterop": true,
       "forceConsistentCasingInFileNames": true,
       "strict": true,
       "skipLibCheck": true
     }
   }' > tsconfig.json
   
   # Install the shibboleth-sp-server package
   npm install shibboleth-sp-server-1.0.0.tgz
   ```

3. Create some code to import and use the package

   - **esm:** *(recommended)*

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
                "-r", "./node_modules/ts-node/register/transpile-only"
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
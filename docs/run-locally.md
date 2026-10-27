# Running Locally

- #### DOCKER (with step debugging)

  Run a docker-compose app that simulates the standard scenario of shibboleth-sp-server running in one space and a client app running elsewere.

  1. **Container A**: A lambda@edge simulator.
     The nodejs package that backs the lambda@edge origin request function will run in a container and be exposed to ones browser over port 5000.
  2. **Container B**: The targeted origin or "app".
     This will be something like wordpress or anything else that listens for https requests.
     Its port is not published and will only be accessible by container A over the internal docker network bridge *(as an origin typically would only be accessible by the lambda@edge function)*.

  With these two containers running, the cloud-based scenario is simulated to some degree in that all requests bound for container B must go through container A first to be inspected for tokens and proof of authenticated status with the shibboleth IDP.

  Container A is essentially a nodejs/express app acting as a reverse proxy with some "adapter" functionality applied.
  The "adapter" functionality allows container A to simulate cloudfront@edge, by transforming http requests from express into objects that conform to the [lambda@edge event structure](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-event-structure.html#lambda-event-structure-request) before passing them in to the main lambda@edge nodejs artifact. Similarly, all response objects returned are converted back into regular http responses on their way back to the client.

  #### Steps to run

  1. **Install**
     Requires Node.js 22+. The shibboleth-sp library tarball must exist first, since it is a dev dependency of this project:

     ```
     (cd ../shibboleth-sp && npm install && npm run pack)
     npm install
     ```

  2. **Create .env file**:

     ```
     DOCKER_REGISTRY="037860335094.dkr.ecr.us-east-2.amazonaws.com"
     ENTITY_ID="https://*.kualitest.research.bu.edu/shibboleth"
     IDP_CERT="<ds:X509Certificate> value from https://shib-test.bu.edu/idp/shibboleth goes here"
     ENTRY_POINT="https://shib-test.bu.edu/idp/profile/SAML2/Redirect/SSO"
     LOGOUT_URL="https://shib-test.bu.edu/idp/logout.jsp"
     APP_APPEND_AUTH_HEADERS="false"
     APP_AUTHORIZATION="true"
     APP_LOGIN_HEADER="SHIB-HANDLER"
     APP_LOGOUT_HEADER="SHIB_IDP_LOGOUT"
     DOCKER_APP_PORT="80"
     DOCKER_SP_PORT=5000
     SAML_CERT="-----BEGIN CERTIFICATE-----
     MIIEGzCCAoOgAwIBAgIJAPhkIj1CZ3z3MA0GCSqGSIb3DQEBCwUAMCcxJTAjBgNV
     BAMTHGlwLTEwLTU3LTIzNy0yMS5lYzIuaW50ZXJuYWwwHhcNMTYwODA4MDQyNzE4
     ...
     -----END CERTIFICATE-----"
     SAML_PK="-----BEGIN PRIVATE KEY-----
     MIIG/gIBADANBgkqhkiG9w0BAQEFAASCBugwggbkAgEAAoIBgQDLQEgmPeVMBas1
     50ujt9qPzpch1W9cae5KCmr2BBzq+koNSZNzLTVUN4bl4ZeZrtCeJ7WBJN6Uztva
     ...
     -----END PRIVATE KEY-----"
     ```
  
     Replace `SAML_CERT` and `SAML_PK` with the full values.
     *NOTE: The JWT keys do not need to be set here as they are arbitrary for running locally and will be auto-generated.*
     If you want to simply run the dockerized app, skip the remaining steps below and simply run:
  
     ```
     npm run deploy-slim
     ```
  
     This builds the project and then produces two "slim" docker images containing only the self-contained js bundles from `dist/standalone` *(no node_modules)*.
     Visit `https://localhost:5000.` in your browser.
     If instead you want step debugging, proceed as follows instead...
  
  3. **Build the project:**
     The docker images do not build anything themselves; they copy in the `dist/standalone` bundles built on your machine. Rebuild whenever the source changes.
  
     ```
     npm run build
     ```
  
  4. **Run the docker-compose app:**
  
     The following command should build 2 images and run 2 containers *(container A, and container B as mentioned above).*
  
     ```
     npm run up
     ```

     *NOTE: `npm run up` reuses existing images. To pick up a new build, use `npm run deploy`, which builds the project and recreates the images and containers.*

  5. **Run "attach-to-docker-sp-process":**
     This vscode launch configuration should to attach to the container A *(the shibboleth-sp-server container)*. 
     This launch config maps the internal container directory `/sp` to the local `${workspace}` directory.
     The bundles in `dist/standalone` carry source maps that point back to the local `src` directory, so source mapping should work as long as the bundles in the container match your local build.
  
  6. **Browser:**
     Navigate to `https://localhost:5000.`
     You should see content output by container B, proxied by container A
  
  7. **Step debug:**
     While "attach-to-docker-sp-process" is running, you should be able to place a breakpoint into any code in scope (ie: src/EntrypointSp.ts), refresh the browser, and observe excecution pause on the breakpoint.
  
  **SIMPLE LAUNCH CONFIGS:**
  You can also step debug by running either of two vscode launch configurations:
  
  - **sp-express-sp**
    Runs in isolation and mocks a dummy app, since non is running or reachable.
    Once running, it is reachable at `https://localhost:5000`
  - **sp-express-app**
    Runs in isolation and "pretends" requests have passed through a shibboleth-sp-server proxy.
    Once running, it is reachable at `https://localhost`
  
  Neither of these involve any docker usage.

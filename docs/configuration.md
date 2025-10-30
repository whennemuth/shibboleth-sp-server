# Configuration:

There are two sets of configurations:

1.  `./src/Config.ts` in the imported `shibboleth-sp` package, defines how this core component is configured
2. `./src/Config.ts` in this project, apply to running locally in docker compose.

Defaults for these will be overridden with entries in a `./.env` file that you create:

### shibboleth-sp:

|        Name        |       type       |   default   | environment<br />variable name | description                                                  |
| :----------------: | :--------------: | :---------: | :----------------------------: | :----------------------------------------------------------- |
|       domain       |      string      | "localhost" |            DOMAIN             | The domain for requests to your app that shibboleth-sp is "listening" to. |
|   appLoginHeader   |      string      |     n/a     |       APP_LOGIN_HEADER       | The name of a header shibboleth-sp will apply to requests. Apps will look for this header when redirecting for login. |
|  appLogoutHeader   |      string      |     n/a     |       APP_LOGOUT_HEADER       | The name of a header shibboleth-sp will apply to requests. Apps will look for this header when redirecting for logout. |
|  appAuthorization  |     boolean      |   "true"    |       APP_AUTHORIZATION       | True indicates the standard mode as described in the authentication flow section above. False indicates the basic mode as described in the authentication flow section above. |
|  samlParms.entityId  |      string      |     n/a     |           ENTITY_ID           | The entity ID of your app known to shibboleth.<br />**example:** `'https://*.myapp.bu.edu/shibboleth'` |
| samlParms.entryPoint |      string      |     n/a     |          ENTRY_POINT          | The entry point, aka IDP address of shibboleth.<br />**example:** `'https://shib-test.bu.edu/idp/profile/SAML2/Redirect/SSO'` |
| samlParms.logoutUrl  |      string      |     n/a     |          LOGOUT_URL           | The logout url used by the IDP.<br />**example:** `'https://shib.bu.edu/idp/logout.jsp'` |
|  samlParms.idpCert   |      string      |     n/a     |           IDP_CERT            | The public cert of the IDP. Navigate to the IDP entry point in a browser and acquire this cert from the `'<ds:X509Certificate>'` element. |
|   samlParms.cert     |      string      |     n/a     |           SAML_CERT           | The SAML certificate item of your service provider metadata. |
|    samlParms.key     |      string      |     n/a     |           SAML_PK             | The private key item of your service provider metadata. |
|  jwtPrivateKeyPEM  |      string      | generated | JWT_PRIVATE_KEY_PEM | A private key for JSON web token (JWT) generation. If not provided, one will be generated that lasts as long as the application process is running, which would make sense in a testing scenario. |
|  jwtPublicKeyPEM   |      string      | generated |  JWT_PUBLIC_KEY_PEM  | A public key for JSON web token (JWT) generation. If not provided, one will be generated that lasts as long as the application process is running, which would make sense in a testing scenario. |
|   customHeaders    | KeyValuePair[]   |     n/a     |              n/a               | A way to inject those headers that one wishes sp-shibboleth to append to incoming requests. Currently not available as environment variable(s). |

### shibboleth-sp-server:

|     Name      |      type       | default | environment<br />variable name |                        description                         |
| :-----------: | :-------------: | :-----: | :----------------------------: | :--------------------------------------------------------- |
|    spPort     | string\|number  |  5000   |        DOCKER_SP_PORT        | The port that the "sp" container will bind to the host machine. This is the port that all requests from the browser must use as they all need to pass through the "sp" container. |
| spProxyExtras |     boolean     |   n/a   |     DOCKER_SP_PROXY_EXTRAS     | This boolean indicates whether to add or modify various headers to the request that is being proxied from the "sp" container to the "app" container. This is useful if the app container is running something (like WordPress) for which it would otherwise seem that requests are NOT self-originated, and would potentially issue a redirect in an effort to "normalize" or correct what it sees as a port mismatch from the host header, or produces markup that does not reflect the protocol, port or hostname that the browser is using to access the app via the sp proxy. |
|    appPort    | string\|number  |   80    |       DOCKER_APP_PORT        | The port that the "app" container will expose and the "sp" container will proxy to using [Axios](https://axios-http.com/) requests. Use "443" if you want the "app" container to expect https traffic and use ssl.<br />**example:** 443 |
|  appHostname  |     string      |   n/a   |         hard-coded           | The name of the hostname of the "app" container as published on the Docker network. This will be the same name as the service element in the docker-compose.yml file and is "hard-coded" as an environment variable both the sp and app service definitions - thus, no need to have a corresponding entry in `./.env` file for it. |
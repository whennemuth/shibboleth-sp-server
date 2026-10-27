import { Application, Request, Response } from 'express';
import { createServer as createHttpServer, Server as HttpServer } from 'http';
import { createServer as createHttpsServer, Server as HttpsServer } from 'https';
import { 
  getConfigFromEnvironment,
  IConfig,
  AUTH_PATHS,
  addHeader, 
  IRequest, 
  IResponse,
  Keys
} from 'shibboleth-sp';
import { getDockerConfigFromEnvironment } from './Config';
import { transformExpressRequest } from './Http';
import { Host } from './Host';
import { handler } from './HandlerApp';


// Get configuration values from the environment as a consolidated object
const config:IConfig = getConfigFromEnvironment();

/**
 * Start an instance of express listening on the designated port
 * 
 * @remarks does not process multipart/form-data.
 * @see https://expressjs.com/en/resources/middleware/multer.html
 */
export const startExpressServer = () => {

  const express = require('express');

  const app = express() as Application;

  // for parsing application/x-www-form-urlencoded
  app.use(express.urlencoded({ extended: true }));

  // for parsing application/json
  app.use(express.json());

  // for parsing application/octet-stream
  app.use(express.raw());

  app.use(express.static('public'));

  const { appPort } = getDockerConfigFromEnvironment();
  
  let server: HttpServer | HttpsServer;
  if(appPort == 443) {
    console.log(`Preparing to run on port 443, using HTTPS.`);
    const { privateKeyPEM, certificatePEM } = new Keys();
    server = createHttpsServer({key: privateKeyPEM, cert: certificatePEM }, app);
  }
  else {
    console.log(`Preparing to run on port ${appPort}, using HTTP.`);
    server = createHttpServer(app);
  }
    
  // Handle all http requests
  app.all('/{*splat}', async (req:Request, res:Response) => {
    try {
      console.log(`Incoming request: ${JSON.stringify(req, Object.getOwnPropertyNames(req), 2)}`);     
      const request:IRequest = buildRequest(req);
      console.log(`Generated request: ${JSON.stringify(request, null, 2)}`);

      const response = await handler(request, config) as IResponse;

      const { headers } = response;

      // Restore/add the headers to the express request object from the handler response obj.
      if(headers) {
        for(const hdr in headers) {
          const { key, value } = headers[hdr][0];
          res.set(key, value);
        }
      }

      // Apply the status of the handler response obj to the original express response obj.
      res.status(parseInt(response.status));

      // Normally an sp handler would intercept requests to the login endpoint, but account for running as test-harness.
      if(req.path == AUTH_PATHS.LOGIN) {
        response.body = '<!DOCTYPE html><html><body><h3>This is the IDP login page</h3></body></html>';
      }

      // Send the response.
      res.send(response.body);
      console.log(`App response: ${JSON.stringify(response, null, 2)}`);     
    }
    catch(e:any) {
      res.status(500).contentType('text/html').send(`
      <!DOCTYPE html>
      <html>
        <body>
          <p><b>${e.message}</b></p>
          <pre>${e.stack}</pre>
        </body>
      </html>      
    `);
    }
  });
  
  console.log('STARTUP CONFIG:');
  console.log(JSON.stringify(config, null, 2));

  server.listen(appPort, '0.0.0.0', () => console.log(`⚡️[bootup]: Server is running at port: ${appPort}`));
}

/**
 * Convert express.Request to IRequest and add the login and logout headers.
 * @param req A complete express request object
 * @returns An object implementing the simpler IRequest interface.
 */
export const buildRequest = (req:Request): IRequest => {
  const host = Host(config);
  const request:IRequest = transformExpressRequest(req);
  const { APP_APPEND_AUTH_HEADERS='true' } = process.env;

  // Add the login and logout headers to the request if configured to do so.
  if(APP_APPEND_AUTH_HEADERS === 'true') {
    const relayUrl = host.getPublicHostURL(request);

    // Construct the login url for relay state
    const loginUrl = new URL(relayUrl.origin);
    loginUrl.pathname = AUTH_PATHS.LOGIN;
    loginUrl.searchParams.set('relay_state', encodeURIComponent(relayUrl.href));

    // Construct the logout url.
    const logoutUrl = new URL(relayUrl.origin);
    logoutUrl.pathname = AUTH_PATHS.LOGOUT;

    const { appLoginHeader, appLogoutHeader } = config;
    
    addHeader(request, appLoginHeader, encodeURIComponent(loginUrl.href));
    addHeader(request, appLogoutHeader, encodeURIComponent(logoutUrl.href));
  }

  return request;
}

startExpressServer();
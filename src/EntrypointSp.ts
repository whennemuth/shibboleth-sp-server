import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { Request, Response } from 'express';
import { Server, createServer } from 'https';
import { 
  IConfig, 
  getConfigFromEnvironment,
  handler,
  Headers, 
  IRequest, 
  IResponse,
  JwtTools,
  Keys,
  safeStringify
} from 'shibboleth-sp';
import { getAxiosInstance } from './Axios';
import { getDockerConfigFromEnvironment } from './Config';
import { getHref, transformExpressRequest } from './Http';
import { Host, IHost } from './Host';

/**
 * Start an express server running to take all requests for authentication to the service provider endpoint.
 * @todo Move this and related express and proxying files to a subfolder called "express" or "test_harness"
 */
export const startExpressServer = (handler:any) => {
  // Get config docker compose configurations from the environment in case we are running that way.
  const { spPort, spProxyExtras, isDockerCompose } = getDockerConfigFromEnvironment();

  // Get main configuration values from the environment as a consolidated object
  const config:IConfig = getConfigFromEnvironment();

  // Get host utilities to help with host and port management
  const host = Host(config);

  // Set domain (using ".host" should include the port if it is not the default port 80 or 443)
  config.domain = host.getPublicHostOrigin().host;

  // set an axios instance for "talking" to the target app container
  const axiosInstance:AxiosInstance = getAxiosInstance(host);
  
  const express = require('express');

  const app = express();

  // for parsing application/x-www-form-urlencoded
  app.use(express.urlencoded({ extended: true }));

  // for parsing application/json
  app.use(express.json());

  // for parsing application/octet-stream
  app.use(express.raw());

  // The sp server should always be running over https, so create it with ssl keys.
  const { privateKeyPEM, certificatePEM } = new Keys();
  const server = createServer({key: privateKeyPEM, cert: certificatePEM }, app) as Server;

  // Handle all http requests
  app.all('/{*splat}', async (req:Request, res:Response) => {

    try {
      if(/favicon/i.test(req.url)) {
        res.status(200).send('favicon');
        return;
      }

      await screenRequestForAuthentication(req, res, axiosInstance, (error:any) => {
        handleRequestByImpersonatingTargetApp(req, res, error);
      });
    } 
    catch (e:any) {
      console.log(`APP RESPONSE ERROR: ${e.stack}`);
      res.status(500).send(`${JSON.stringify({ message: e.message, stack: e.stack }, null, 2)}`);
    }    
  });
  
  console.log('CONFIG VARS:');
  console.log(JSON.stringify(config, null, 2));

  // Listen for https requests
  server.listen(spPort, '0.0.0.0', () => console.log(`⚡️[bootup]: HTTPS Server is running at port: ${spPort}`));

  /**
   * This function performs the "sp" (shibboleth service provider) actions where the incoming request is either
   * passed through to the target app if a valid auth token is found, else login with the IDP is initiated.
   * @param req 
   * @param res 
   * @param axiosInstance 
   * @param onProxyError 
   * @returns 
   */
  const screenRequestForAuthentication = async (req:Request, res:Response, axiosInstance:AxiosInstance, onProxyError:Function) => {

    // Transform the incoming express request object to an object of IRequest type
    const authRequest:IRequest = transformExpressRequest(req);

    // Handle the authentication
    const authResponse:IRequest|IResponse = await handler(authRequest, config);

    const spRedirect = ():boolean => `${authResponse.status}`.startsWith('30')
    const authenticated = Headers(authResponse).isTruthy('authenticated');

    if(isDockerCompose() && ! spRedirect()) {
        // Proxy to the app container across the docker bridge network
      try {
        const appUrl = host.getInternalDockerAppHostURL(authRequest).href;
        await proxypass({ appUrl, authResponse, axios:axiosInstance, host, spProxyExtras, req, res, config });
      }
      catch(e) {
        onProxyError(e);
      }
      return;
    }

    if(authenticated) {
      // No separate container as app host, so just simulate one by returning a dummy response in lieu of app host.
      handleRequestByImpersonatingTargetApp(req, res, null);
      return;
    }

    // Not authenticated, so start next step of saml flow
    const { headers } = authResponse;
    if(headers) {
      for(const hdr in headers) {
        res.set(hdr, headers[hdr][0].value);
      }
    }
    const statusCodeStr = (authResponse as IResponse).status ?? `${res.statusCode}`;
    res.status(parseInt(statusCodeStr)).send(authResponse.body);
  }

  /**
   * Just impersonate an app by doing something with the http request - in this case, render the jwt it is 
   * getting now out to the response (and an error from a failed proxy attempt by the sp if provided).
   * @param req 
   * @param res 
   * @param error 
   */
  const handleRequestByImpersonatingTargetApp = (req:Request, res:Response, error:any) => {
    const jwtTools = new JwtTools();
    const { jwtPrivateKeyPEM, jwtPublicKeyPEM } = config;
    jwtTools.resetPrivateKey(jwtPrivateKeyPEM!);
    jwtTools.resetPublicKey(jwtPublicKeyPEM!);
    const authRequest:IRequest = transformExpressRequest(req);
    const token = jwtTools.getToken(authRequest);
    const { user } = token ? token[jwtTools.getTokenName()] : { user: 'unknown user' };
    const json = JSON.stringify(user, null, 2);
    const logoutUrl = `https://${req.header('host')}/logout`;
    let logout = `<button type="button" onclick="document.location.href = '${logoutUrl}';">Logout</button>`;
    let msg1 = `This is an impersonation of the application endpoint ${logout}`;
    let msg2 = 'Had you been running under docker, a separate container on the docker bridge would have served up this page';
    let msg3 = 'This is what was found in the JWT:'
    let msg4 = `<pre>${json}</pre>`
    if(error && isDockerCompose()) {
      const errJson = safeStringify(error, null, 2);
      let resHtml = '';
      if(error.response && error.response.data) {
        const { data } = error.response;
        if(typeof data === 'string' && data.includes('<html>')) {
          resHtml = `<b>response data: </b><br><div>${data}</div><br>`;
        }
        else if(typeof data === 'object') {
          resHtml = `<b>response data: </b><br><pre>${safeStringify(data, null, 2)}</pre><br>`;
        }
      }
      msg2 = `There was an error attempting to proxy to the docker app container: <br>${resHtml}` +
        `<b>error: </b><pre>${errJson}</pre>`;
    }
    console.log(`REPLYING WITH: ${json}`)  
    res.send(`
      <html><body>
        <p>${msg1}</p>
        <p>${msg2}</p>
        <p>${msg3}</p>
        <p>${msg4}</p>
      </body></html>`);
  }
}


export type ProxyPassParms = {
  appUrl:string,
  req:Request,
  res:Response,
  authResponse:IResponse|IRequest,
  axios:AxiosInstance,
  spProxyExtras:boolean,
  host:IHost,
  config:IConfig,
}

/**
 * Proxy to the app container across the docker bridge network. 
 * This is equivalent to a cloudfront@edge function returning the request it was initially provided, 
 * where that request would be allowed to continue on to the origin.
 * @param parms Parameters containing the request, response, authentication data, and configuration
 * @returns Promise that resolves when the proxy request is complete
 */
export const proxypass = async (parms:ProxyPassParms) => {
  const { appUrl, authResponse, axios, req, req: { url, method, headers, body }, res, host, spProxyExtras, config } = parms;

  // Put all original headers
  const headersOut = {} as any;
  Object.keys(headers).forEach(key => {
    headersOut[key.toLowerCase()] = req.header(key);
  });

  // Put all additional headers returned in the authentication response.
  const { headers:lrHeaders } = authResponse;
  const publicURL = host.getPublicHostURL(getHref(req));
  if(headers) {
    for(const hdr in lrHeaders) {
      const key = lrHeaders[hdr][0].key;
      const value = lrHeaders[hdr][0].value;
      headersOut[key] = value;
    }
  }
  
  /** @todo Change publicURL to "proxyURL" to reflect that it is the URL of the proxying service. */
  if(publicURL) {
    // Add headers that reflect the proxying of the request to the target app.
    headersOut['host'] = publicURL.host;
    headersOut['x-forwarded-host'] = publicURL.host;
    headersOut['x-forwarded-proto'] = 'https';
    headersOut['x-forwarded-port'] = publicURL.port;
  }

  let response:AxiosResponse<any, any> | undefined;

  const reqConfig:AxiosRequestConfig = { headers: headersOut };

  // Proxy to the app container
  switch(method.toLowerCase()) {
    case 'get':
      console.log(`Proxying ${url} get request to ${appUrl}, config: ${JSON.stringify(reqConfig, null, 2)}`);
      response = await axios.get(appUrl, reqConfig);
      break;
    case 'post':
      const formdata = body;
      console.log(`Proxying ${url} post request to ${appUrl}: ${JSON.stringify({
        config: reqConfig, 
        formdata
      }, null, 2)}`);
      response = await axios.post(appUrl, formdata, reqConfig);          
      break;
  }

  res.set(response?.headers);
  res.status(response?.status ?? 500).send(response?.data);

  console.log(`RESPONSE: ${JSON.stringify(res, Object.getOwnPropertyNames(res), 2)}}`);    
}

if(process.env.UNIT_TESTING != 'true') {
  startExpressServer(handler);
}
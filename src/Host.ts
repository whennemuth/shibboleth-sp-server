import { IConfig, getHost, IRequest } from "shibboleth-sp";
import { getDockerConfigFromEnvironment } from "./Config";

export type IHost = {
  getPublicHostOrigin: (request?:IRequest) => URL;
  getPublicHostURL: (request:IRequest|string) => URL;
  getInternalDockerAppHostURL: (request?: IRequest) => URL;
}

/**
 * This module provides utilities for constructing host URLs that are used by the sp-shibboleth application,
 * particularly for making adjustments when running under docker compose and working with a network bridge
 * and bound ports.
 * 
 * @todo Rename this file as Proxy.ts and move the proxypass function here.
 * @param config The configuration object containing domain and other settings
 * @returns An IHost instance with methods for URL construction and host management
 */
export const Host = (config:IConfig): IHost => {

  const { domain } = config;
  const { appHostname, appPort, spPort } = getDockerConfigFromEnvironment();

  /**
   * @param request 
   * @returns The origin from a request, which is protocol, host and port.
   * This will be the "public" origin that the browser will use to access the app container via the sp container.
   */
  const getPublicHostOrigin = (request?:IRequest):URL => {
    // Just start off with a basic localhost URL
    const url = new URL('http://localhost');

    // The public URL will always be https, so we can set that here.
    url.protocol = 'https';

    // Favor the domain from the config, but if not set, default with the request host
    if(domain) {
      url.hostname = domain;
    }
    else if(request) {
      const host = getHost(request);
      if(host) {
        url.hostname = host;
      }
    }

    // If the port is not the default for https or http, we need to set it
    if(spPort != 443 && spPort != 80) {
      url.port = `${spPort}`;
    }

    return url;
  }

  /**
   * @param request 
   * @returns The full url from a request, which is the full URL including protocol, host, port, path, and querystring.
   * This will be the "public" URL that the browser will use to access the app container via the sp container.
   */
  const getPublicHostURL = (request:IRequest|string):URL => {
    let url:URL = {} as URL;
    if(typeof request === 'string') {
      // The request parameter will be the href of the URL.
      url = new URL(request);
      const origin = getPublicHostOrigin();
      url.protocol = origin.protocol;
      url.hostname = origin.hostname;
      if(origin.port) {
        url.port = origin.port;
      }
    }
    else {
      // The request parameter is an IRequest object, so we need to construct the URL from it.
      url = getPublicHostOrigin(request);
      if(request.uri) {
        url.pathname = request.uri;
      }
      if(request.querystring) {
        url.search = request.querystring;
      }

    }
    return url;
  }

  /**
   * Get the url that the sp container must use to access the app container over the internal docker network.
   * The protocol will default to http, which assumes the target app is not running the ssl termination itself,
   * but is simulating a real-life situation in which that is perhaps happening in a reverse proxy like nginx, 
   * or cloudfront if running in AWS.
   * @param pathname 
   * @returns 
   */
  const getInternalDockerAppHostURL = (request?:IRequest):URL => {
    // Just start off with a basic localhost URL
    const url = new URL('http://localhost');

    // Configure the URL based on the environment
    url.protocol = appPort === 443 ? 'https:' : 'http:';
    if(appHostname) {
      url.hostname = appHostname;
    }
    if( appPort && appPort != 443 && appPort != 80) {
      url.port = appPort.toString();
    }
    if(request) {
      if(request.uri && request.uri !== '/') {
        url.pathname = request.uri;
      }
      if(request.querystring) {
        url.search = request.querystring;
      }
    }

    // Return the formatted URL
    return url;
  }


  /**
   * We must be running as a vscode launch configuration (not docker), so countermand the APP_AUTHORIZATION
   * variable because there is no app container to proxy to for delegating the authentication decisions to.
   */
  if( ! appHostname) {
    config.appAuthorization = false;
  }


  return {
    getPublicHostOrigin,
    getPublicHostURL,
    getInternalDockerAppHostURL,
  };
}
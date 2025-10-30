import { Request, Response } from 'express';
import { IRequest, RequestHeaders, RequestBody, KeyValuePair } from 'shibboleth-sp';

/**
 * Convert express.Request to IRequest.
 * @param {*} req A complete express request object
 * @returns An object implementing the simpler IRequest interface.
 */
export const transformExpressRequest = (req: Request): IRequest => {
  let { url, method, headers: headersIn, body: rawBody } = req;

  // Reform headers
  const headersOut = {} as RequestHeaders;
  Object.keys(headersIn).forEach(key => {
    headersOut[key.toLowerCase()] = [{
      key, value: req.header(key) as string
    }]
  });

  // Get the uri and querystring
  const parts = url.split('?');
  const uri = parts[0];
  const querystring = parts.length > 1 ? parts[1] : '';

  // Reform the body
  let body = { data: {} } as RequestBody;
  rawBody = rawBody || {};
  if (Object.keys(rawBody).length > 0) {
    const bodyString = Object.keys(rawBody).map(key => `${key}=${encodeURIComponent(rawBody[key])}`).join('&');
    body = {
      data: Buffer.from(bodyString, 'utf8').toString('base64')
    }
  }

  return {
    body, headers: headersOut, method, querystring, uri, headerActivity: { added: {}, modified: {}, removed: {} }
  } as IRequest;
}

/**
 * 
 * @param req 
 * @returns The href of a request, which is the full URL including protocol, host, port, path, and querystring.
 */
export const getHref = (req: Request): string => {
  let { protocol, originalUrl, url } = req;
  const host = req.get('host');
  originalUrl = originalUrl || url;
  return `${protocol}://${host}${originalUrl}`;
}

export const changeToHttps = (url: URL | string): URL => {
  const _url = new URL(url);
  if (_url.protocol !== 'https:') {
    _url.protocol = 'https:';
  }
  return _url;
}

export const redirectToHttps = (req: Request, res: Response): void => {
  console.log(`Redirecting to https: ${getHref(req)}`);
  const httpsHref = changeToHttps(getHref(req));
  res.redirect(httpsHref.href);
}
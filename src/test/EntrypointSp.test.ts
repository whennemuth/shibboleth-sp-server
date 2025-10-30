import { btoa } from 'buffer';
import { Request } from 'express';
import { transformExpressRequest } from '../Http';

class ResponseMock {
  _status:number = 200;
  headers:any = {};
  public status = (status:number) => {
    this._status = status;
    return this;
  }
  public set = (headers:any) => {
    this.headers = headers;
    return this;
  }
  public send = (data:string) => {
    console.log(`Sending data: ${data}`);
  }
};

class AxiosMock {
  url:string = '';
  private AxiosResponse = () => {
    return { headers: {}, data: [] }
  };
  public get = async (url:string, headers:any) => {
    this.url = url;
    return this.AxiosResponse();
  }
  public post = async (url:string, formdata:any, headers:any) => {
    this.url = url;
    return this.AxiosResponse();
  }
}

describe('entrypoint.js', () => {

  const port = '5000';
  const app_host = 'app';
  process.env.DOCKER_SP_PORT = port;
  process.env.DOCKER_APP_HOST = app_host;
  process.env.UNIT_TESTING = 'true';


  it('Should build a simple request object from http request as expected', () => {
    const headers = {
      key1: 'val1',
      key2: 'val2',
      key3: 'val3', 
      host: 'localhost:5000'
    } as any;
    const requestMock = {
      url: '/path/to/endpoint?this=that&these=those',
      method: 'GET', 
      headers,
      header: (key:string) => { return headers[key]; },
      body: {
        key1: 'val1', key2: 'val2', key3: 'val3'
      }
    };

    const request = transformExpressRequest(requestMock as Request);
    expect(request).toEqual({
      body: {
        data: btoa('key1=val1&key2=val2&key3=val3')
      },
      method: 'GET',
      querystring: 'this=that&these=those',
      uri: '/path/to/endpoint',
      headers: {
        key1: [ { key: 'key1', value: 'val1' }],
        key2: [ { key: 'key2', value: 'val2' }],
        key3: [ { key: 'key3', value: 'val3' }],
        host: [ { key: 'host', value: 'localhost:5000' }]
      },
      headerActivity: {
        added: {}, modified: {}, removed: {}
      }
    })
  });

  it('Should proxypass sp url to expected url of app host', async () => {
    const { proxypass } = require('../EntrypointSp.ts');
    const requestMock = {
      url: '/path/to/endpoint?this=that&these=those',
      method: 'GET',
      headers: { host: 'localhost:5000' },
      header: (key:string) => key === 'host' ? 'localhost:5000' : '',
      get: (key:string) => key === 'host' ? 'localhost:5000' : '',
      body: [ 'request body' ]
    }
    const responseMock = new ResponseMock();
    const axiosMock = new AxiosMock();
    const appUrl = `https://${app_host}/path/to/endpoint?this=that&these=those`;
    const hostMock = {
      getPublicHostURL: () => ({ host: 'localhost:5000', port: '5000' })
    };
    const configMock = {} as any;
    const proxyPassParms = {
      appUrl,
      req: requestMock,
      res: responseMock,
      axios: axiosMock,
      authResponse: { headers: {} },
      host: hostMock,
      spProxyExtras: false,
      config: configMock
    };
    await proxypass(proxyPassParms);

    expect(axiosMock.url).toEqual(appUrl);
  });
});
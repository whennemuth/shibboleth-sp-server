import axios, { AxiosInstance, CreateAxiosDefaults } from "axios";
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';
import { getDockerConfigFromEnvironment } from "./Config";
import { IHost } from "./Host";

/**
 * Get an axios instance configured to make requests to the app container from within the sp 
 * container across the docker network bridge.
 * @param host The host utilities for URL construction
 * @returns Configured Axios instance for internal Docker communication
 */  
export const getAxiosInstance = (host:IHost):AxiosInstance => {
  const baseURL = host.getInternalDockerAppHostURL().href;
  const axiosConfig = { baseURL } as CreateAxiosDefaults;
  const { appPort } = getDockerConfigFromEnvironment();

  if(appPort == 443) {
    console.log(`Using https agent for axios requests to ${baseURL}`);
    axiosConfig.httpsAgent = new HttpsAgent({ rejectUnauthorized: false });
  }
  else {
    console.log(`Using http agent for axios requests to ${baseURL}`);
    axiosConfig.httpAgent = new HttpAgent({ port: appPort });
  }

  // Create the axios instance with the base URL
  const axiosInstance = axios.create(axiosConfig);

  if(appPort == 443) {
    axiosInstance.defaults.httpsAgent = new HttpsAgent({ rejectUnauthorized: false });
  }
  else {
    axiosInstance.defaults.httpAgent = new HttpAgent({ port: appPort });
  }
  axiosInstance.defaults.maxRedirects = 0;    
  axiosInstance.interceptors.response.use(
    response => response,
    error => {
      if(error.response && [301, 302].includes(error.response.status)) {
        console.log('Axios got a redirect response');
        // console.log(`${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
        return Promise.resolve(error.response);
      }
      if(error.response && error.response.status == 403) {
        return Promise.resolve(error.response);
      }
      return Promise.reject(error);
    }
  );
  return axiosInstance;
}
/**
 * A type that accounts for only those configurable values that are needed when running in Docker compose.
 * 
 * @property spPort - The port that the "sp" container binds to the host machine
 * @property spProxyExtras - Whether to add/modify headers when proxying to the "app" container 
 * @property appPort - Optional port that the "app" container exposes (use 443 for HTTPS)
 * @property appHostname - Optional hostname of the "app" container on the Docker network
 * @property isDockerCompose - Function to check if running in Docker compose mode
 */
export interface IDockerConfig {
  spPort: number;
  spProxyExtras: boolean;
  appPort?: number;
  appHostname?: string;
  isDockerCompose: () => boolean;
}

/**
 * @returns An instance of IDockerConfig whose values are ALL obtained from the environment.
 */
export const getDockerConfigFromEnvironment = (): IDockerConfig => {
  let {
    DOCKER_SP_PORT: spPort,
    DOCKER_SP_PROXY_EXTRAS: spProxyExtras,
    DOCKER_APP_PORT: appPort,
    DOCKER_APP_HOST: appHostname
  } = process.env;

  const cfg = { appHostname } as IDockerConfig;
  if (spPort && !isNaN(parseInt(spPort))) {
    cfg.spPort = parseInt(spPort);
  }
  if (appPort && !isNaN(parseInt(appPort))) {
    cfg.appPort = parseInt(appPort);
  }
  cfg.spProxyExtras = `${spProxyExtras}`.toLowerCase() == 'true';
  cfg.isDockerCompose = () => {
    // spPort is a minimum requirement for running in Docker compose. If it is not set, then we are not 
    // running in Docker compose (though may still be running "locally" from a vscode launch configuration).
    return !!cfg.spPort;
  };

  // If not isDockerCompose, then what is returned here as defaults probably has no use, but return it anyway in case.
  return cfg;
}
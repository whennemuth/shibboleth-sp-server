import { 
  IConfig,
  JwtTools,
  Headers, 
  IHeaders, 
  IRequest, 
  IResponse,
  APP_AUTHORIZATION_HEADER_NAME
} from 'shibboleth-sp';

const faviconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABhGlDQ1BJQ0MgcHJvZmlsZQAAKJF9kT1Iw0AcxV/TSkUqDnYQcchQXbSLijiWViyChdJWaNXB5NIvaNKQpLg4Cq4FBz8Wqw4uzro6uAqC4AeIq4uToouU+L+k0CLGg+N+vLv3uHsHCK0aU81ADFA1y8gk42K+sCoGXxGCHwGImJSYqaeyizl4jq97+Ph6F+VZ3uf+HINK0WSATySOMd2wiDeI5zYtnfM+cZhVJIX4nHjKoAsSP3JddvmNc9lhgWeGjVwmQRwmFss9LPcwqxgq8SxxRFE1yhfyLiuctzirtQbr3JO/MFTUVrJcpzmGJJaQQpo6ktFAFTVYiNKqkWIiQ/txD/+o40+TSyZXFYwcC6hDheT4wf/gd7dmaWbaTQrFgb4X2/4YB4K7QLtp29/Htt0+AfzPwJXW9ddbwPwn6c2uFjkChraBi+uuJu8BlzvAyJMuGZIj+WkKpRLwfkbfVACGb4GBNbe3zj5OH4AcdbV8AxwcAhNlyl73eHd/b2//nun09wOl3XK7fzzCVAAAAAZiS0dEAPcA0QAGZn/NAAAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAAd0SU1FB+cMAwYTIqDSv7EAAAAZdEVYdENvbW1lbnQAQ3JlYXRlZCB3aXRoIEdJTVBXgQ4XAAAB50lEQVRYw+2XsWsUQRSHvzczewkSBIlCUihYSEQwBkFRMJDKVhBSBISUCgYr04j5C9JYaJ3C3kZCwEoU7MRclTbBQgshkkLvbnfeszg0t5c7o3eb3Savm52dmW/e/H7DGzEwKgxHxVE5QOhsNOq1UhYdvdLqDSB7xshs2nvUWbDzYJeFeMsTL7mSj+AzyDtwL4xkISNZz6rVgH+iyJ4dLUBcdTTqNRqfajTfJtiC5Ppl10rKgAM7JcQbXb+PSbEu6J8KcLuG/6B/PumSoOPDA0jnTdh8n/R3QUfoY0c6H7DR4W04kAhly/CbsZBLfDCAdSPcjySvs6PVQFx1pLdDe6cR3DcjeZYhG+2t+xXFr+ynM33pidP+gFNG5tLcnP+fAWmj6oSgN4UiI/xz2lsgXxT3RssD8MuKX2717be7gryy8kX4e/F4x5V3BJwBuwA2Leg1Rzbj8dtaLICdlNJqguOSrBiArtHS7G3fvLWkOAA70VUfbB+0pPuaF6qNFZgBPS0w1bG550rYjMhPgxTcjuLX8gB6Tga0YR8PZQ894VFst79DWIwEYm/gB4JOumJFmM164tPDp7F7QroYhriI/iLEdD4Qryv+o+LqhmwZ/ACbEmxGiFcd8aIDf0hFVMXDRI4fp1UD/AJxjqN8NNTlNgAAAABJRU5ErkJggg==';
const MISSING_APP_LOGIN_HEADER = 'missing_login_url_header';
const MISSING_APP_LOGOUT_HEADER = 'missing_logout_url_header';

/**
 * This handler represents an "application" that one is trying to access to after having authenticated with
 * the saml IDP. It is just a dummy app and will only return user info found in the request object, formatted 
 * for html as <pre> element content. But depending on if config.appAuthorization is set, it may first involve 
 * itself in determining if the request needs authentication and is also authorized to view the requested 
 * endpoint before returning the html (simulates how typical apps, like wordpress, work and delegate to shibboleth). 
 * @param originRequest 
 * @param config 
 * @returns 
 */
export const handler = async (originRequest:IRequest, config:IConfig):Promise<IResponse> => {
  console.log(`Request: ${JSON.stringify(originRequest, null, 2)}`);

  let { appAuthorization } = config;
  const { uri='/' } = originRequest;
  const pathParts = (uri as string).split('/').map(p => p.toLocaleLowerCase());
  const headers = Headers(originRequest);
  
  // Allow option to override the config appAuthorization value with a header value.
  let appAuth:boolean = `${headers.get(APP_AUTHORIZATION_HEADER_NAME) ?? appAuthorization}` == 'true';

  if(appAuth) {
    const authenticated = headers.isTruthy('authenticated');
    console.log(`App Authorization is set to ${appAuth}, authenticated: ${authenticated}`);

    if(pathParts.includes('private') && !authenticated) {
      console.log(`Request is for a private endpoint, but not authenticated. Redirecting to login.`);
      return getLoginResponse(originRequest, config);
    }

    if(pathParts.includes('unauthorized')) {
      if(authenticated) {
        console.log(`Request is for an unauthorized endpoint, but authenticated. Returning 403.`);
        return getUnauthorizedResponse(originRequest);
      }
      console.log(`Request is for an unauthorized endpoint, but not authenticated. Redirecting to login.`);
      return getLoginResponse(originRequest, config);
    }
  }
  else {
    console.log(`App Authorization is set to ${appAuth}, skipping authentication and authorization checks.`);
  }

  return getOkResponse(originRequest, config);
}

/**
 * Get the login url to return for redirection to the IDP.
 * @param originRequest 
 * @param config 
 * @returns 
 */
const getLoginResponse = (originRequest:IRequest, config:IConfig):IResponse => {
  const headers = Headers(originRequest);
  const { appLoginHeader } = config;
  const loginUrl = decodeURIComponent(headers.get(appLoginHeader) ?? MISSING_APP_LOGIN_HEADER);
  const loginResponse = {
    status: '302',
    statusDescription: 'Found',
    headers: {
      ['content-type']: [{ key: 'content-type', value: 'text/html' }],
      location: [{ key: 'Location', value: loginUrl }],
    }
  } as IResponse

  console.log(`LOGIN RESPONSE: ${JSON.stringify(loginResponse, null, 2)}`);
  return loginResponse;
}

/**
 * Request is authenticated, but still the user lacks the authorization to view the endpoint. Return a 403.
 * @param originRequest 
 * @returns 
 */
const getUnauthorizedResponse = (originRequest:IRequest):IResponse => {
  const headers = Headers(originRequest);
  const authenticated = headers.get('authenticated');
  let msg = 'Forbidden: Sorry, I know who you are, but you lack the authorization to view this resource.'
  if(authenticated != 'true') {
    msg = 'Forbidden: Sorry, I don\'t know who you are, and cannot tell if you have the authorization to view this resource.'
  }
  return {
    status: '403',
    statusDescription: 'Unauthorized',
    body: `<!DOCTYPE html><html><body><h3>${msg}</h3></body></html>`,
    headers: {
      ['content-type']: [{ key: 'content-type', value: 'text/html' }],
    }
  }
}

/**
 * Request is authenticated and authorized. Return the requested content.
 * This is a dummy app, return a printout of all user data returned from the IDP in the header/cookie. 
 * @param event 
 * @returns 
 */
const getOkResponse = (originRequest:IRequest, config:IConfig):IResponse => {
  try {
    const headers = Headers(originRequest);

    // WHAT! No headers?
    if( headers.empty) {
      return {
        status: '500',
        statusDescription: 'Internal Server Error',
        body: '<!DOCTYPE html><html><body><h3>Something went wrong!<br>No headers detected</h3></body></html>',
        headers: {
          ['content-type']: [{ key: 'content-type', value: 'text/html' }],
        }
      }
    }

    // 1) First check the "user-details" header for user data.
    let user;
    if(headers.get('user-details')) {
      const userBase64 = headers.get('user-details') ?? '';
      const authTokenJson = Buffer.from(userBase64, 'base64').toString();
      user = (JSON.parse(authTokenJson))[JwtTools.TOKEN_NAME].user;
    }

    // 2) If No user details header, check for the jwt and get user details from that.
    if( ! user) {
      user = getUserFromJwt(headers.get('cookie'), JwtTools.COOKIE_NAME);
    }

    // 3) If no jwt or expected jwt content, respond with warning and list out what headers were found.
    if( ! user) {
      const { appLoginHeader } = config;
      const loginUrl = decodeURIComponent(headers.get(appLoginHeader) ?? MISSING_APP_LOGIN_HEADER);
      const onclick = loginUrl ?
        `document.location.href = '${loginUrl}';` :
        `alert('No login URL configured!');`;

      return {
        status: '200',
        statusDescription: 'Ok',
        body: `
          <!DOCTYPE html>
          <html>
            <head>
              <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-rbsA2VBKQhggwzxH7pPCaAqO46MgnOM80zW1RWuH61DGLwZJEdK2Kadq2F9CUG65" crossorigin="anonymous">
              <link rel="shortcut icon" href="data:image/x-icon;base64,${faviconBase64}" />
            </head>
            <body>
              <p style="padding:30px; font-weight:bold; font-size:24px;">
                Welcome, whoever you are. You do not seem to be authenticated, but this is a public portion of the website. 
                <button class="btn btn-primary btn-lg" type="button" onclick="${onclick}">Login</button> 
              </p>
              <p style="padding:30px; font-weight:bold; font-size:24px;">
                user-details and jwt cookie header missing, but here are the remaining headers:
              </p>
              <pre style='padding-left:30px;font-size:14px;'>${headers.join('<br>')}</pre>
            </body>
          </html>`,
        headers: {
          ['content-type']: [{ key: 'content-type', value: 'text/html' }],
        }
      }
    }

    // 4) User details retrieved. Return them as html.
    return {
      status: '200',
      statusDescription: 'Ok',
      body: userToHtml(user, config, headers),
      headers: {
        ['content-type']: [{ key: 'content-type', value: 'text/html' }],
      }
    };
  }
  catch(e:any) {
    return {
      status: '500',
      statusDescription: 'Internal Server Error',
      body: `
        <!DOCTYPE html>
        <html>
          <body>
            <p><b>${e.message}</b></p>
            <pre>${e.stack}</pre>
          </body>
        </html>`,
      headers: {
        ['content-type']: [{ key: 'content-type', value: 'text/html' }],
      }
    }
  }
}

/**
 * Convert a user into html to set the response to for rendering by a browser.
 * @param user 
 * @param headers 
 * @returns 
 */
const userToHtml = (user:any, config:IConfig, headers:IHeaders) => {
  const { appLogoutHeader } = config;
  const logoutUrl = decodeURIComponent(headers.get(appLogoutHeader) ?? MISSING_APP_LOGOUT_HEADER);
  const userJson = JSON.stringify(user, null, 2);
  let preContent = userJson.replace(/\n/g, '<br>').replace(/\\"/g, '"');
  do {
    preContent = preContent.replace(/\\"/g, '"');
  } while(/\\"/.test(preContent));

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-rbsA2VBKQhggwzxH7pPCaAqO46MgnOM80zW1RWuH61DGLwZJEdK2Kadq2F9CUG65" crossorigin="anonymous">
        <link rel="shortcut icon" href="data:image/x-icon;base64,${faviconBase64}" />
      </head>
      <body>
        <p style="padding:30px; font-weight:bold; font-size:24px;">
          Welcome, Warren <button id="btnSignin" class="btn btn-primary btn-lg" type="button" onclick="document.location.href = '${logoutUrl}';">Logout</button> 
        </p>
        <p style="padding-left:30px; font-size:16px; font-weight:bold;">Here is what shibboleth "said" about you:</p>
        <pre style='padding-left:30px;font-size:14px;'>${preContent}</pre>
        <p style="padding-left:30px; font-size:16px; font-weight:bold;">Here are the remaining headers:</p>
        <pre style='padding-left:30px;font-size:14px;'>${headers.join('<br>', [ 'user-details' ])}</pre>
      </body>
    </html>
  `;
}

/**
 * The "cookie" header of the request may contain a jwt with user data inside. Extract the user data.
 * @param cookies 
 * @param cookieName 
 * @returns 
 */
const getUserFromJwt = (cookies:string|null, cookieName:string):string|undefined => {
  try {
    if( ! cookies) return undefined;
    const authTokenJson = atob(
      cookies
        .split(/;\x20?/)
        .filter(a => a.split('=')[0] == cookieName)
        .map(c => c.split('.')[1])[0]
    );
    return (JSON.parse(authTokenJson))[JwtTools.TOKEN_NAME].user
  }
  catch(e) {
    return undefined;
  }
}
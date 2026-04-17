declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

export const initFacebookSDK = () => {
  return new Promise<void>((resolve) => {
    // Load the Facebook SDK asynchronously
    (function (d: Document, s: string, id: string) {
      if (d.getElementById(id)) return;
      const fjs = d.getElementsByTagName(s)[0];
      const js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      if (fjs && fjs.parentNode) {
        fjs.parentNode.insertBefore(js, fjs);
      }
    }(document, 'script', 'facebook-jssdk'));

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v18.0'
      });
      resolve();
    };
  });
};

export const facebookLogin = () => {
  return new Promise<any>((resolve, reject) => {
    if (!window.FB) {
      reject('Facebook SDK not loaded');
      return;
    }
    window.FB.login((response: any) => {
      if (response.authResponse) {
        resolve(response.authResponse);
      } else {
        reject('User cancelled login or did not fully authorize.');
      }
    }, { scope: 'public_profile,email' });
  });
};

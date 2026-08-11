const FB_APP_ID = '997382516096935';
const FB_SDK_VERSION = 'v26.0';
const FB_SCRIPT_ID = 'facebook-jssdk';
const FB_SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

let sdkPromise = null;

export function loadFacebookSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Facebook SDK can only be loaded in the browser.'));
  }

  if (window.FB && typeof window.FB.init === 'function') {
    return Promise.resolve(window.FB);
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(FB_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.FB && typeof window.FB.init === 'function') {
          resolve(window.FB);
        } else {
          reject(new Error('Facebook SDK loaded but failed to initialize.'));
        }
      });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Facebook SDK script.')));
      return;
    }

    window.fbAsyncInit = () => {
      try {
        window.FB.init({
          appId: FB_APP_ID,
          autoLogAppEvents: true,
          xfbml: true,
          version: FB_SDK_VERSION,
        });
        resolve(window.FB);
      } catch (err) {
        reject(err);
      }
    };

    const script = document.createElement('script');
    script.id = FB_SCRIPT_ID;
    script.src = FB_SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.addEventListener('load', () => {
      if (window.FB && typeof window.FB.init === 'function') return;
      if (typeof window.fbAsyncInit !== 'function') {
        reject(new Error('Facebook SDK loaded but fbAsyncInit was not called.'));
      }
    });
    script.addEventListener('error', () => reject(new Error('Failed to load Facebook SDK script.')));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

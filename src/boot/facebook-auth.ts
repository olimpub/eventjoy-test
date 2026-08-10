import { boot } from 'quasar/wrappers';

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

export default boot(() => {
  return new Promise<void>((resolve) => {
    window.fbAsyncInit = function() {
      window.FB.init({
        appId      : '2944722095883838',
        cookie     : true,
        xfbml      : true,
        version    : 'v18.0'
      });
      window.FB.AppEvents.logPageView();
      resolve();
    };

    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) { return; }
      js = d.createElement(s) as HTMLScriptElement; 
      js.id = id;
      js.src = "https://connect.facebook.net/hu_HU/sdk.js";
      if (fjs && fjs.parentNode) {
        fjs.parentNode.insertBefore(js, fjs);
      } else {
        d.head.appendChild(js);
      }
    }(document, 'script', 'facebook-jssdk'));
  });
});

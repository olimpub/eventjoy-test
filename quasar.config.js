const { configure } = require('quasar/wrappers');

module.exports = configure(function (/* ctx */) {
  return {
    boot: [
      'axios',
      'google-auth',
      'facebook-auth',
      'notify'
    ],

    css: [
      'app.scss'
    ],

    extras: [
      'roboto-font',
      'material-icons',
      'material-symbols-rounded',
      'mdi-v7',
    ],

    build: {
      target: {
        browser: [ 'es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1' ],
        node: 'node16'
      },
      vueRouterMode: 'history',
    },

    devServer: {
      open: true,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'
      }
    },

    framework: {
      config: {},
      plugins: [
        'Dialog',
        'Notify',
        'Loading'
      ]
    },

    animations: [],

    ssr: {
      pwa: false,
    },

    pwa: {
      workboxMode: 'generateSW',
      injectPwaMetaTags: true,
      manifest: {
        name: 'EventJoy App',
        short_name: 'EventJoy',
        description: 'Complex event management app',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#027be3',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          }
        ]
      }
    },

    cordova: {},

    capacitor: {
      hideSplashscreen: true
    },

    electron: {
      inspectPort: 5858,
      bundler: 'packager',
    },

    bex: {
      contentScripts: [
        'my-content-script'
      ],
    }
  }
});

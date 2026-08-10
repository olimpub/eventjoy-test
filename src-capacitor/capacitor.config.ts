import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'hu.eventjoy.app',
  appName: 'EventJoy App',
  webDir: 'dist/capacitor',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https'
  }
};

export default config;

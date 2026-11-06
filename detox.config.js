module.exports = {
  testRunner: {
    args: { config: 'e2e/jest.config.js' },
    jest: { setupTimeout: 120000 },
  },
  apps: {
    'ios.sim.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/ParentalControl.app',
      build: 'npx expo prebuild --platform ios --no-install && xcodebuild -workspace ios/ParentalControl.xcworkspace -scheme ParentalControl -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.emu.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'node scripts/build-detox-android.js',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: process.env.ANDROID_AVD_NAME || 'Pixel_6' },
    },
  },
  configurations: {
    'ios.sim.debug': { device: 'simulator', app: 'ios.sim.debug' },
    'android.emu.debug': { device: 'emulator', app: 'android.emu.debug' },
  },
};

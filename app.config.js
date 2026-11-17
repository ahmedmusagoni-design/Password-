module.exports = ({ config }) => {
  const bundleId = config.ios?.bundleIdentifier ?? 'com.example.parentalcontrol';
  const appGroup = `group.${bundleId}.screentime`;
  const appleTeamId = process.env.APPLE_TEAM_ID;
  if (process.env.EAS_BUILD && !appleTeamId) {
    throw new Error('APPLE_TEAM_ID is not set for this EAS build.');
  }
  const extension = (name) => ({
    bundleIdentifier: `${bundleId}.${name}`,
    targetName: name,
    entitlements: {
      'com.apple.developer.family-controls': true,
      'com.apple.security.application-groups': [appGroup],
    },
  });
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      ['expo-build-properties', { ios: { deploymentTarget: '16.4' } }],
      ['react-native-device-activity', { appleTeamId, appGroup }],
    ],
    extra: {
      ...config.extra,
      parentApiUrl: process.env.EXPO_PUBLIC_PARENT_API_URL || '',
      eas: {
        ...config.extra?.eas,
        build: { experimental: { ios: { appExtensions: [
          extension('ShieldConfiguration'),
          extension('ShieldAction'),
          extension('ActivityMonitorExtension'),
        ] } } },
      },
    },
  };
};
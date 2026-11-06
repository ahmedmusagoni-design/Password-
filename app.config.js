module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    parentApiUrl: process.env.EXPO_PUBLIC_PARENT_API_URL || '',
  },
});

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Intercepts build pipelines and forces a fallback alias for the browser runtime environment
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'react-native-maps' || moduleName.startsWith('react-native-maps/'))) {
    return {
      type: 'sourceFile',
      // 👇 FIXED: Added 'src' to match your folder structure
      filePath: path.resolve(__dirname, 'src', 'components', 'WebMapFallback.tsx'),
    };
  }
  // Fallback cleanly to standard resolution paths for all other modules/platforms
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

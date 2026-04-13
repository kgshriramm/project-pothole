module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|@expo|expo|react-native-maps|@gorhom|react-native-reanimated|react-native-gesture-handler|react-native-vector-icons|react-native-worklets|react-native-worklets-core)/'
  ],
};

/**
 * @format
 */
import 'react-native-gesture-handler/jestSetup';
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

(globalThis as typeof globalThis & { fetch: jest.Mock }).fetch = jest.fn(async () => ({
  ok: true,
  json: async () => ({
    routes: [
      {
        distance: 1000,
        duration: 300,
        geometry: {
          coordinates: [
            [74.856, 12.9141],
            [74.834, 12.9538],
          ],
        },
        legs: [
          {
            steps: [
              {
                distance: 120,
                name: 'Main Road',
                maneuver: { modifier: 'right' },
              },
            ],
          },
        ],
      },
    ],
  }),
})) as jest.Mock;

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = (props: any) => <View testID="MapView" {...props} />;
  MapView.Marker = (props: any) => <View testID="Marker" {...props} />;
  MapView.Polyline = (props: any) => <View testID="Polyline" {...props} />;
  return {
    __esModule: true,
    default: MapView,
    Marker: MapView.Marker,
    Polyline: MapView.Polyline,
  };
});
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props: any) => <View testID="Icon" {...props} />;
});
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(async () => ({
    coords: {
      latitude: 12.9141,
      longitude: 74.8560,
      speed: 0,
      heading: 0,
    },
  })),
  watchPositionAsync: jest.fn(async (_options: any, callback: (location: any) => void) => {
    callback({
      coords: {
        latitude: 12.9141,
        longitude: 74.8560,
        speed: 0,
        heading: 0,
      },
    });
    return { remove: jest.fn() };
  }),
  Accuracy: { High: 'high' },
}));
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: (props: any) => <View testID="CameraView" {...props} />,
    useCameraPermissions: () => [{ granted: true }, jest.fn()],
  };
});
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props: any) => <View testID="BottomSheet" {...props} />;
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});

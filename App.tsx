import React, { useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Image,
  Switch
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheet from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { darkMapStyle } from './src/styles/mapStyle';

// Mock Data for the Route
const origin = { latitude: 40.7580, longitude: -73.9855 }; // Times Square Area
const currLocation = { latitude: 40.7510, longitude: -73.9900 };
const destLocation = { latitude: 40.7600, longitude: -73.9840 };

const App = () => {
  // Bottom Sheet references and variables
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['35%', '50%'], []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Map View */}
      <MapView
        style={styles.map}
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: currLocation.latitude,
          longitude: currLocation.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.012,
        }}
      >
        {/* Route Line */}
        <Polyline
          coordinates={[currLocation, { latitude: 40.755, longitude: -73.988 }, destLocation]}
          strokeColor="#6B4DFF" // Vivid purple
          strokeWidth={4}
        />

        {/* Current Location Marker */}
        <Marker coordinate={currLocation}>
          <View style={styles.currLocationRing}>
            <View style={styles.currLocationCenter}>
              <Icon name="navigation" size={20} color="#E040FB" style={{ transform: [{ rotate: '45deg' }] }} />
            </View>
          </View>
        </Marker>

        {/* Destination Marker */}
        <Marker coordinate={destLocation}>
          <View style={styles.destLocationRing}>
            <View style={styles.destLocationCenter} />
          </View>
        </Marker>
      </MapView>

      {/* Top Navigation Bar Overlay */}
      <SafeAreaView style={styles.headerContainer} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Let's Ride</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="dots-vertical" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Instructions Card */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionRowMain}>
            <Icon name="arrow-up" size={32} color="#FFF" />
            <View style={styles.instructionTextContainer}>
              <Text style={styles.instructionNextStop}>Velozen Charging Hub</Text>
              <Text style={styles.instructionSub}>toward Times Square, New York</Text>
            </View>
          </View>
          <Text style={styles.distanceMetric}>120 <Text style={styles.distanceUnit}>ft.</Text></Text>

          <View style={styles.secondaryInstructions}>
            <View style={styles.instructionStep}>
              <Icon name="arrow-left-top" size={24} color="#FFF" />
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepDistance}>300 meter</Text>
                <Text style={styles.stepLocation}>Bryant Park, New York</Text>
              </View>
            </View>
            <View style={styles.instructionStep}>
              <Icon name="arrow-right-top" size={24} color="#FFF" />
              <View style={styles.stepTextContainer}>
                <Text style={styles.stepDistance}>550 meter</Text>
                <Text style={styles.stepLocation}>Empire State Building, New York</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardPullIndicator} />
        </View>

        {/* Floating Icons (Pothole eye icon and compass) */}
        <View style={styles.floatingIconsRight}>
          <TouchableOpacity style={[styles.floatingIconBg, { backgroundColor: '#6B4DFF' }]}>
            <Icon name="eye-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.floatingIconBg, { backgroundColor: '#E53935' }]}>
            <Icon name="compass-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Speed Indicator */}
        <View style={styles.speedIndicator}>
          <Icon name="near-me" size={20} color="#FFF" style={{ marginRight: 4, transform: [{ rotate: '45deg' }] }} />
          <Text style={styles.speedNumber}>28</Text>
          <Text style={styles.speedUnit}>mph</Text>
        </View>
      </SafeAreaView>

      {/* Bottom Sheet UI */}
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        handleIndicatorStyle={{ backgroundColor: '#555' }}
        backgroundStyle={styles.bottomSheetBackground}
      >
        <View style={styles.sheetContent}>
          <View style={styles.carDetailsRow}>
            <View>
              <Text style={styles.carTitle}>Volvo EC40</Text>
              <View style={styles.statusRow}>
                <Icon name="battery-charging-80" size={20} color="#4CAF50" />
                <Text style={styles.batteryText}>78% <Text style={styles.timeText}>(1h 3min)</Text></Text>
              </View>
              <View style={styles.statusRow}>
                <Icon name="thermometer" size={20} color="#FFCA28" />
                <Text style={styles.tempText}>22°C</Text>
              </View>
            </View>
            {/* Placeholder for Car Image */}
            <View style={styles.carImagePlaceholder}>
              <Icon name="car-sports" size={60} color="#E0E0E0" />
            </View>
          </View>

          <View style={styles.autoDriveRow}>
            <Text style={styles.autoDriveLabel}>Auto Drive</Text>
            <Switch value={true} trackColor={{ false: '#767577', true: '#6B4DFF' }} thumbColor="#FFF" />
          </View>

          <TouchableOpacity style={styles.preferencesButton}>
            <Icon name="tune" size={24} color="#AAA" />
            <View style={styles.prefTextContainer}>
              <Text style={styles.prefTitle}>Preferences</Text>
              <Text style={styles.prefSub}>Adjust auto drive and driving needs</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.stopButton}>
            <View style={styles.stopIconCircle}>
              <Icon name="chevron-double-right" size={24} color="#E53935" />
            </View>
            <Text style={styles.stopButtonText}>Stop Ride</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContainer: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionCard: {
    backgroundColor: '#222030',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  instructionRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instructionTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  instructionNextStop: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  instructionSub: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 4,
  },
  distanceMetric: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    position: 'absolute',
    top: 20,
    right: 20,
  },
  distanceUnit: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: 'normal',
  },
  secondaryInstructions: {
    marginTop: 20,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  stepTextContainer: {
    marginLeft: 16,
  },
  stepDistance: {
    color: '#AAA',
    fontSize: 12,
  },
  stepLocation: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  cardPullIndicator: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 16,
  },
  floatingIconsRight: {
    position: 'absolute',
    right: 16,
    bottom: '40%',
  },
  floatingIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  speedIndicator: {
    position: 'absolute',
    left: 16,
    bottom: '40%',
    backgroundColor: '#00C853',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
  },
  speedNumber: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  speedUnit: {
    color: '#FFF',
    fontSize: 14,
    marginLeft: 4,
  },
  currLocationRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(224, 64, 251, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currLocationCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E040FB',
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  destLocationRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00E676',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destLocationCenter: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFF',
  },
  bottomSheetBackground: {
    backgroundColor: '#1E1B26',
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  carDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  carTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  batteryText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  timeText: {
    color: '#AAA',
    fontWeight: 'normal',
  },
  tempText: {
    color: '#FFCA28',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  carImagePlaceholder: {
    width: 120,
    height: 80,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  autoDriveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 24,
  },
  autoDriveLabel: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  preferencesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  prefTextContainer: {
    marginLeft: 16,
  },
  prefTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  prefSub: {
    color: '#AAA',
    fontSize: 12,
    marginTop: 2,
  },
  stopButton: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 30,
    position: 'relative',
  },
  stopIconCircle: {
    position: 'absolute',
    left: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;

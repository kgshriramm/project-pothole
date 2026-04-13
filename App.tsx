import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { darkMapStyle } from './src/styles/mapStyle';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';

// Mock Destination Data
const initialDestLocation = { latitude: 12.9538, longitude: 74.8340 };

const getManeuverIcon = (modifier: string) => {
  if (!modifier) return 'arrow-up';
  if (modifier.includes('left')) return 'arrow-left-top';
  if (modifier.includes('right')) return 'arrow-right-top';
  if (modifier.includes('uturn')) return 'arrow-u-left-top';
  return 'arrow-up';
};

const formatDistance = (meters: number) => {
  if (meters > 1000) return (meters / 1000).toFixed(1) + ' km';
  return Math.round(meters) + ' m';
};

const App = () => {
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [potholes, setPotholes] = useState<{id: string, latitude: number, longitude: number, severity: 'low'|'medium'|'high'}[]>([]);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [boundingBoxes, setBoundingBoxes] = useState<any[]>([]);

  const [startText, setStartText] = useState('My Location');
  const [destText, setDestText] = useState('City Center Mall');
  const [destination, setDestination] = useState(initialDestLocation);
  const [sourceLocation, setSourceLocation] = useState<{latitude: number, longitude: number} | null>(null);

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeSearchType, setActiveSearchType] = useState<'source' | 'dest' | null>(null);
  const [routeCoords, setRouteCoords] = useState<{latitude: number, longitude: number}[]>([]);
  const [routeDetails, setRouteDetails] = useState<any>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRoute = async (startCoord: {latitude: number, longitude: number}, endCoord: {latitude: number, longitude: number}) => {
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${startCoord.longitude},${startCoord.latitude};${endCoord.longitude},${endCoord.latitude}?overview=full&geometries=geojson&steps=true`);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map((c: number[]) => ({
          latitude: c[1],
          longitude: c[0]
        }));
        setRouteCoords(coords);

        const steps = route.legs[0]?.steps || [];
        setRouteDetails({
          distanceMs: route.distance, 
          durationS: route.duration, 
          nextStep: steps.length > 0 ? steps[0] : null,
          followingStep: steps.length > 1 ? steps[1] : null,
        });
      }
    } catch (e) {
      console.log('Routing error:', e);
    }
  };

  const handleSearch = async (text: string, type: 'source' | 'dest') => {
    if (type === 'source') setStartText(text);
    if (type === 'dest') setDestText(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.length > 2) {
      setActiveSearchType(type);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const rootLoc = location ? { latitude: location.coords.latitude, longitude: location.coords.longitude } : { latitude: 12.9141, longitude: 74.8560 };
          
          // Using Photon (by Komoot) instead of Nominatim because nominatim bans live type-ahead autocomplete
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&lat=${rootLoc.latitude}&lon=${rootLoc.longitude}&limit=5`);
          
          if (!res.ok) {
            throw new Error("Photon Autocomplete failed");
          }
          
          const data = await res.json();
          
          if (data && data.features && data.features.length > 0) {
            // Map the photon features to our format
            const mappedData = data.features.map((f: any) => ({
              display_name: `${f.properties.name || ''} ${f.properties.street || ''} ${f.properties.city || ''}`.trim() || 'Unknown Place',
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0]
            }));
            
            // Also automatically fit map to show search suggestions
            const coords = mappedData.map((d: any) => ({ latitude: parseFloat(d.lat), longitude: parseFloat(d.lon) }));
            mapRef.current?.fitToCoordinates([...coords, rootLoc], {
              edgePadding: { top: 50, right: 50, bottom: 400, left: 50 },
              animated: true
            });

            setSearchResults(mappedData);
          } else {
            setSearchResults([]);
          }
        } catch (e) {
          console.log('Search Error:', e);
        }
      }, 500); // Debounce typing by half a second
    } else {
      setSearchResults([]);
      setActiveSearchType(null);
    }
  };

  const handleSelectAutocomplete = (item: any) => {
    const coords = { latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) };
    const name = item.display_name.split(',')[0];
    
    let latestSource = sourceLocation || (location ? {latitude: location.coords.latitude, longitude: location.coords.longitude} : { latitude: 12.9141, longitude: 74.8560 });
    let latestDest = destination;

    if (activeSearchType === 'source') {
      setStartText(name);
      setSourceLocation(coords);
      latestSource = coords;
    } else {
      setDestText(name);
      setDestination(coords);
      latestDest = coords;
    }
    
    setSearchResults([]);
    setActiveSearchType(null);

    mapRef.current?.fitToCoordinates([latestSource, latestDest], {
      edgePadding: { top: 100, right: 100, bottom: 400, left: 100 },
      animated: true,
    });
    
    fetchRoute(latestSource, latestDest);
  };
  
  const handleMyLocation = () => {
    setStartText("My Location");
    setSourceLocation(null);
    if (location) {
       const loc = { latitude: location.coords.latitude, longitude: location.coords.longitude };
       fetchRoute(loc, destination);
       mapRef.current?.animateToRegion({
         latitude: loc.latitude,
         longitude: loc.longitude,
         latitudeDelta: 0.015,
         longitudeDelta: 0.012,
       });
    }
  };

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 1,
        },
        (newLocation) => {
          setLocation(newLocation);
        }
      );
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Fetch initial route 
  useEffect(() => {
    fetchRoute({ latitude: 12.9141, longitude: 74.8560 }, initialDestLocation);
  }, []);

  const currLocation = location 
    ? { latitude: location.coords.latitude, longitude: location.coords.longitude } 
    : { latitude: 12.9141, longitude: 74.8560 }; // Default to Mangalore

  const activeSource = sourceLocation || currLocation;

  // YOLO Computer Vision Detection Integration
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isCameraActive && location) {
      interval = setInterval(async () => {
        if (cameraRef.current) {
          try {
            // ** YOLO INTEGRATION ARCHITECTURE **
            // To run the REAL real-time tracking YOLO model:
            // 1. Take a frame image:
            // const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.2 });
            // 2. Send the image to your Python FastAPI / Flask Backend running YOLO:
            // const response = await fetch('http://YOUR_LOCAL_IP:5000/detect', { method: 'POST', body: photo.base64 });
            // const inferences = await response.json();
            
            // --- SIMULATING BACKEND YOLO MOCK FOR VISUALIZATION ---
            if (Math.random() > 0.85) { // 15% chance to spot one in the frame
              const levels = ['low', 'medium', 'high'] as const;
              const severity = levels[Math.floor(Math.random() * levels.length)];
              
              let yoloColor = '#FFB300'; // Amber (low)
              if (severity === 'medium') yoloColor = '#FF5252'; // Light Red (Medium)
              if (severity === 'high') yoloColor = '#D50000'; // Deep Crimson (High)

              const yoloDetection = {
                class: `pothole - ${severity}`,
                confidence: (0.8 + Math.random() * 0.19).toFixed(2), 
                color: yoloColor,
                box: { x: Math.random() * 200 + 50, y: Math.random() * 400 + 100, w: 100 + Math.random()*50, h: 50 + Math.random()*30 }
              };
              
              setBoundingBoxes([yoloDetection]);
              
              // Register exact GPS of accurate structural detection
              const newPothole = {
                id: Date.now().toString(),
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                severity: severity
              };
              setPotholes(prev => [...prev, newPothole]);
              
              // Remove bounding box visual after 1 second
              setTimeout(() => setBoundingBoxes([]), 1500);
            }
          } catch (e) {
             console.log("YOLO Inference Error:", e);
          }
        }
      }, 1000); // Process frame 1x/sec
    } else {
      setBoundingBoxes([]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCameraActive, location]);

  const handleStartNavigation = () => {
    setIsNavigating(true);
    if (!cameraPermission?.granted) {
      requestCameraPermission();
    }
    setIsCameraActive(true); // Auto-start YOLO inference in background/PiP

    if (location) {
       mapRef.current?.animateCamera({
          center: { latitude: location.coords.latitude, longitude: location.coords.longitude },
          pitch: 60, // 3D tilt
          heading: location.coords.heading || 0,
          zoom: 18,
          altitude: 100
       }, { duration: 1500 });
    }
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setIsCameraActive(false);
    mapRef.current?.animateCamera({
       pitch: 0,
       heading: 0,
       zoom: 14,
    });
  };

  // Bottom Sheet references and variables


  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={darkMapStyle}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        initialRegion={{
          latitude: currLocation.latitude,
          longitude: currLocation.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.012,
        }}
      >
        {/* Route Line */}
        <Polyline
          coordinates={routeCoords.length > 0 ? routeCoords : [activeSource, destination]}
          strokeColor="#6B4DFF" // Vivid purple
          strokeWidth={4}
        />

        {/* Custom Source Marker if typed location */}
        {sourceLocation && (
          <Marker coordinate={sourceLocation}>
            <View style={styles.currLocationRing}>
              <View style={styles.currLocationCenter}>
                <Icon name="navigation" size={20} color="#E040FB" style={{ transform: [{ rotate: '45deg' }] }} />
              </View>
            </View>
          </Marker>
        )}

        {/* Detected Potholes Markers */}
        {potholes.map(pothole => {
          let bgColor = '#FFB300';
          let size = 16;
          
          if (pothole.severity === 'medium') {
             bgColor = '#FF5252';
             size = 20;
          } else if (pothole.severity === 'high') {
             bgColor = '#D50000';
             size = 26;
          }

          return (
            <Marker key={pothole.id} coordinate={{ latitude: pothole.latitude, longitude: pothole.longitude }}>
              <View style={[styles.potholeMarker, { backgroundColor: bgColor, width: size * 1.8, height: size * 1.8, borderRadius: size * 0.9 }]}>
                <Icon name={pothole.severity === 'high' ? "alert-octagon" : "alert"} size={size} color="#FFF" />
              </View>
            </Marker>
          );
        })}

        {/* Live Search Suggestion Pins */}
        {activeSearchType && searchResults.map((item, idx) => (
          <Marker 
            key={`search-${idx}`} 
            coordinate={{ latitude: parseFloat(item.lat), longitude: parseFloat(item.lon) }}
            onPress={() => handleSelectAutocomplete(item)}
          >
            <View style={styles.searchPinRing}>
              <Icon name="map-marker-star" size={24} color="#FFCA28" />
            </View>
          </Marker>
        ))}

        {/* Current Location now handled natively by showsUserLocation={true} */}

        {/* Destination Marker */}
        <Marker coordinate={destination}>
          <View style={styles.destLocationRing}>
            <View style={styles.destLocationCenter} />
          </View>
        </Marker>
      </MapView>

      {/* Top Navigation Bar Overlay */}
      <SafeAreaView style={styles.headerContainer} pointerEvents="box-none">
        
        {/* Only show Search form if NOT navigating */}
        {!isNavigating && (
          <View style={styles.searchCard}>
            <View style={styles.searchInputRow}>
              <Icon name="circle-double" size={16} color="#6B4DFF" style={styles.searchIcon} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Choose starting point" 
                placeholderTextColor="#888"
                value={startText}
                onChangeText={(text) => handleSearch(text, 'source')}
              />
              <TouchableOpacity onPress={handleMyLocation}>
                <Icon name="crosshairs-gps" size={20} color="#888" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchDivider} />
            <View style={styles.searchInputRow}>
              <Icon name="map-marker" size={16} color="#FF3D00" style={styles.searchIcon} />
              <TextInput 
                style={styles.searchInput} 
                placeholder="Choose destination" 
                placeholderTextColor="#888"
                value={destText}
                onChangeText={(text) => handleSearch(text, 'dest')}
              />
            </View>

            {searchResults.length > 0 && activeSearchType && (
              <View style={styles.autocompleteContainer}>
                {searchResults.map((res: any, idx: number) => (
                  <TouchableOpacity key={idx} style={styles.autocompleteRow} onPress={() => handleSelectAutocomplete(res)}>
                    <Icon name="map-marker-outline" size={20} color="#888" />
                    <Text style={styles.autocompleteText} numberOfLines={1}>{res.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          </View>
        )}

        {/* Dynamic Navigation Instructions Card */}
        {isNavigating && routeDetails && routeCoords.length > 0 && (
          <View style={styles.instructionCard}>
            <TouchableOpacity style={styles.instructionCloseButton} onPress={handleStopNavigation}>
              <Icon name="close" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.instructionRowMain}>
              <Icon name={getManeuverIcon(routeDetails.nextStep?.maneuver?.modifier || '')} size={42} color="#00E676" />
              <View style={styles.instructionTextContainer}>
                <Text style={styles.instructionNextStop} numberOfLines={1}>
                  {routeDetails.nextStep?.name || 'Proceed on route'}
                </Text>
                <Text style={styles.instructionSub} numberOfLines={1}>toward {destText}</Text>
              </View>
              <View style={styles.metricsContainer}>
                <Text style={styles.distanceMetric}>{formatDistance(routeDetails.nextStep?.distance || 0)}</Text>
                <Text style={styles.timeMetric}>{Math.max(1, Math.round(routeDetails.durationS / 60))} min</Text>
              </View>
            </View>

            {routeDetails.followingStep && routeDetails.followingStep.name && (
              <View style={styles.secondaryInstructions}>
                <View style={styles.instructionStep}>
                  <Icon name={getManeuverIcon(routeDetails.followingStep.maneuver?.modifier || '')} size={20} color="#888" />
                  <View style={styles.stepTextContainer}>
                    <Text style={styles.stepDistance}>Then in {formatDistance(routeDetails.followingStep.distance)}</Text>
                    <Text style={styles.stepLocation}>{routeDetails.followingStep.name || 'continue'}</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.cardPullIndicator} />
          </View>
        )}

        {/* Floating Icons (Pothole eye icon and compass) */}
        <View style={styles.floatingIconsRight}>
          <TouchableOpacity 
            style={[styles.floatingIconBg, styles.purpleBg]}
            onPress={() => {
              if (!cameraPermission?.granted) {
                requestCameraPermission();
              }
              setIsCameraActive(!isCameraActive);
            }}
          >
            <Icon name="eye-outline" size={24} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.floatingIconBg, styles.redBg]}
            onPress={() => {
              if (location) {
                mapRef.current?.animateCamera({
                  center: { latitude: location.coords.latitude, longitude: location.coords.longitude },
                  heading: location.coords.heading || 0,
                  pitch: isNavigating ? 60 : 0,
                  zoom: 18,
                });
              }
            }}
          >
            <Icon name="compass-outline" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Speed Indicator */}
        <View style={styles.speedIndicator}>
          <Icon name="near-me" size={20} color="#FFF" style={[styles.speedIcon, { transform: [{ rotate: '45deg' }] }]} />
          <Text style={styles.speedNumber}>
            {location?.coords.speed ? Math.max(0, Math.round(location.coords.speed * 2.23694)) : 0}
          </Text>
          <Text style={styles.speedUnit}>mph</Text>
        </View>
      </SafeAreaView>


      {/* Bottom Start Panel */}
      {!isNavigating && routeDetails && (
        <View style={styles.bottomStartCard}>
          <View style={styles.bottomStartInfo}>
            <Text style={styles.bottomStartTime}>{Math.max(1, Math.round(routeDetails.durationS / 60))} min</Text>
            <Text style={styles.bottomStartDistance}>({formatDistance(routeDetails.distanceMs)})</Text>
          </View>
          <TouchableOpacity style={styles.startButton} onPress={handleStartNavigation}>
            <Icon name="navigation" size={20} color="#FFF" style={{marginRight: 8}} />
            <Text style={styles.startButtonText}>Start</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Floating Dashcam PiP for YOLO Detection (Replaces Full Screen) */}
      {isNavigating && isCameraActive && cameraPermission?.granted && (
        <View style={styles.floatingCameraWrapper}>
          <CameraView ref={cameraRef} style={styles.floatingCamera} facing="back">
            <View style={styles.pipOverlay}>
              <View style={styles.pipHeader}>
                <Text style={styles.pipText}>YOLO AI</Text>
              </View>
              
              {/* YOLO Bounding Box Overlay for PiP */}
              {boundingBoxes.map((item, idx) => (
                <View key={`yolo-box-${idx}`} style={{
                  position: 'absolute',
                  left: item.box.x * 0.35, // Adjusting box coordinates for PiP scale
                  top: item.box.y * 0.25,
                  width: item.box.w * 0.4,
                  height: item.box.h * 0.4,
                  borderWidth: 2,
                  borderColor: item.color,
                  backgroundColor: `${item.color}33`, // 33 for 20% alpha hex
                  zIndex: 999,
                }} />
              ))}
            </View>
          </CameraView>
        </View>
      )}

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
  searchCard: {
    backgroundColor: '#222030',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    marginBottom: 20,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
  },
  searchDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginLeft: 28,
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
    backgroundColor: '#00C853', // High visibility modern Google Maps green
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  instructionCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  metricsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },
  distanceMetric: {
    color: '#00E676',
    fontSize: 22,
    fontWeight: 'bold',
  },
  timeMetric: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
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
  purpleBg: {
    backgroundColor: '#6B4DFF',
  },
  redBg: {
    backgroundColor: '#E53935',
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
  speedIcon: {
    marginRight: 4,
  },
  bottomStartCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#222030',
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  bottomStartInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bottomStartTime: {
    color: '#00E676',
    fontSize: 28,
    fontWeight: 'bold',
  },
  bottomStartDistance: {
    color: '#AAA',
    fontSize: 16,
    marginLeft: 8,
  },
  startButton: {
    backgroundColor: '#6B4DFF',
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  floatingCameraWrapper: {
    position: 'absolute',
    left: 20,
    bottom: 120,
    width: 130,
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#00E676',
    backgroundColor: '#000',
    elevation: 10,
  },
  floatingCamera: {
    flex: 1,
  },
  pipOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pipHeader: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  pipText: {
    color: '#00E676',
    fontSize: 12,
    fontWeight: 'bold',
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
  bottomSheetHandleIndicator: {
    backgroundColor: '#555',
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
  cameraOverlay: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
  },
  cameraTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  iconButtonPlaceholder: {
    width: 40,
  },
  potholeDetectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  potholeDetectionText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 8
  },
  scanBox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanIcon: {
    opacity: 0.8,
  },
  cameraBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  speedIndicatorCamera: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  speedNumberCamera: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  speedUnitCamera: {
    color: '#FFF',
    fontSize: 18,
    marginLeft: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  recordingDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E53935',
    marginRight: 8,
  },
  recordingText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  potholeMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3D00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#FF3D00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  potholeBadge: {
    backgroundColor: 'rgba(255, 61, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#FF3D00',
  },
  potholeBadgeText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  autocompleteContainer: {
    backgroundColor: '#222030',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginTop: -4, 
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  autocompleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  autocompleteText: {
    color: '#FFF',
    marginLeft: 12,
    flex: 1,
  },
  searchPinRing: {
    backgroundColor: 'rgba(255, 202, 40, 0.2)',
    padding: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFCA28',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;

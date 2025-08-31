import * as Location from 'expo-location';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import MapView, { Callout, Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { auth, db } from '../../lib/firebase';

type UserLocation = {
  id: string;
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
    altitudeAccuracy: number | null;
    heading: number | null;
    speed: number | null;
  };
  timestamp: number;
  name: string;
  color: string;
};

const { width, height } = Dimensions.get('window');

// Default location (Mumbai, India)
const DEFAULT_LATITUDE = 19.0760;
const DEFAULT_LONGITUDE = 72.8777;

// Colors for different users
const USER_COLORS = [
  '#FF5252', // Red
  '#4CAF50', // Green
  '#2196F3', // Blue
  '#FFC107', // Amber
  '#9C27B0', // Purple
  '#00BCD4', // Cyan
  '#FF9800', // Orange
  '#E91E63', // Pink
];

export default function MapScreen() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [otherUsers, setOtherUsers] = useState<UserLocation[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isTracking, setIsTracking] = useState(true);
  const mapRef = useRef<MapView>(null);

  // Save or update current user's location in Firestore
  const updateUserLocation = async (locationData: Location.LocationObject) => {
    if (!auth.currentUser) return;

    const userLocation = {
      coords: {
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
        altitude: locationData.coords.altitude || null,
        accuracy: locationData.coords.accuracy || null,
        altitudeAccuracy: locationData.coords.altitudeAccuracy || null,
        heading: locationData.coords.heading || null,
        speed: locationData.coords.speed || null,
      },
      timestamp: serverTimestamp(),
      name: 'User ' + auth.currentUser.uid.slice(0, 6),
      updatedAt: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid),
        { location: userLocation },
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  };

  // Subscribe to other users' locations
  useEffect(() => {
    if (!auth.currentUser) return;

    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('location', '!=', null)
    );

    // We'll filter out the current user after getting the results

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: UserLocation[] = [];
      let colorIndex = 0;

      snapshot.forEach((doc) => {
        // Skip the current user's document
        if (doc.id === auth.currentUser?.uid) return;

        const userData = doc.data();
        if (userData.location) {
          usersData.push({
            id: doc.id,
            coords: userData.location.coords,
            timestamp: userData.location.timestamp?.toDate().getTime() || Date.now(),
            name: userData.location.name || 'User ' + (colorIndex + 1),
            color: USER_COLORS[colorIndex % USER_COLORS.length]
          });
          colorIndex++;
        }
      });

      setOtherUsers(usersData);
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  // Get user's current location with error handling
  const getLocation = async (): Promise<UserLocation> => {
    try {
      // Request foreground location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access location was denied');
      }

      // Check if location services are enabled
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        throw new Error('Location services are not enabled');
      }

      // Get current position with high accuracy
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log('Got location:', position);

      const userLocation = {
        id: auth.currentUser?.uid || 'unknown',
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude || null,
          accuracy: position.coords.accuracy || null,
          altitudeAccuracy: position.coords.altitudeAccuracy || null,
          heading: position.coords.heading || null,
          speed: position.coords.speed || null,
        },
        timestamp: position.timestamp,
        name: 'You',
        color: '#0000FF' // Blue for current user
      };

      // Save user location to Firestore
      // Update location in Firestore
      if (auth.currentUser) {
        await updateUserLocation(position);
      }

      return userLocation;
    } catch (error) {
      console.error('Error getting location:', error);
      throw error;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let subscription: Location.LocationSubscription | null = null;

    const startWatching = async () => {
      try {
        const currentLocation = await getLocation();
        if (!isMounted) return;

        setLocation(currentLocation);
        setMapReady(true);

        // Set up location updates
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 10,
          },
          (newLocation) => {
            if (!isMounted) return;
            setLocation(prev => {
              // Only update if location has changed significantly
              if (!prev ||
                Math.abs(prev.coords.latitude - newLocation.coords.latitude) > 0.0001 ||
                Math.abs(prev.coords.longitude - newLocation.coords.longitude) > 0.0001) {
                return {
                  ...prev!,
                  coords: {
                    ...newLocation.coords,
                    altitude: newLocation.coords.altitude || null,
                    accuracy: newLocation.coords.accuracy || null,
                    altitudeAccuracy: newLocation.coords.altitudeAccuracy || null,
                    heading: newLocation.coords.heading || null,
                    speed: newLocation.coords.speed || null,
                  },
                  timestamp: newLocation.timestamp
                };
              }
              return prev;
            });
          }
        );
      } catch (error) {
        console.error('Error initializing location:', error);
        setErrorMsg(error instanceof Error ? error.message : 'Failed to get location');

        // Fallback to default location
        if (isMounted) {
          setLocation({
            id: 'default-location',
            coords: {
              latitude: DEFAULT_LATITUDE,
              longitude: DEFAULT_LONGITUDE,
              altitude: null,
              accuracy: 1000,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
            },
            timestamp: Date.now(),
            name: 'Default Location',
            color: '#808080'
          });
          setMapReady(true);
        }
      }
    };

    startWatching();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Calculate region for the map
  const region: Region = location ? {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01 * (width / height),
  } : {
    latitude: DEFAULT_LATITUDE,
    longitude: DEFAULT_LONGITUDE,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01 * (width / height),
  };

  // Count of users
  const totalUsers = 1 + otherUsers.length; // Including current user
  const otherUsersCount = otherUsers.length; // Excluding current user

  if (!mapReady) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading map...</Text>
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.userCountContainer}>
        <Text style={styles.userCountText}>
          👥 {totalUsers} {totalUsers === 1 ? 'person' : 'people'} total
        </Text>
        <Text style={styles.otherUsersCountText}>
          {otherUsersCount} {otherUsersCount === 1 ? 'other person' : 'other people'} nearby
        </Text>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={isTracking}
        onMapReady={() => setMapReady(true)}
        onUserLocationChange={(e) => {
          if (isTracking && e.nativeEvent.coordinate) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            mapRef.current?.animateToRegion({
              latitude,
              longitude,
              latitudeDelta: region.latitudeDelta,
              longitudeDelta: region.longitudeDelta,
            });
          }
        }}
        zoomEnabled={true}
        zoomTapEnabled={true}
        rotateEnabled={true}
        loadingEnabled={true}
        loadingIndicatorColor="#666666"
        loadingBackgroundColor="#eeeeee"
        onMapLoaded={() => console.log('Map loaded successfully')}
      >
        {/* Current user location */}
        {location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="You"
            description="Your current location"
            pinColor={location.color}
          >
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>You</Text>
                <Text>Your current location</Text>
              </View>
            </Callout>
          </Marker>
        )}

        {/* Other users' locations */}
        {otherUsers.map((user) => (
          <Marker
            key={user.id}
            coordinate={{
              latitude: user.coords.latitude,
              longitude: user.coords.longitude,
            }}
            title={user.name}
            pinColor={user.color}
          >
            <Callout>
              <View style={[styles.calloutContainer, { borderLeftColor: user.color }]}>
                <Text style={styles.calloutTitle}>{user.name}</Text>
                <Text>Last updated: {new Date(user.timestamp).toLocaleTimeString()}</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {errorMsg && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  errorText: {
    color: 'white',
    textAlign: 'center',
  },
  userCountContainer: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  userCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  otherUsersCountText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  calloutContainer: {
    width: 200,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#0000FF',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
});

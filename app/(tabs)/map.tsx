import * as Location from 'expo-location';
import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
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
  userData?: any; // Full user data
  isOnline?: boolean; // Whether user is currently online
  lastSeen?: string; // Last seen timestamp
  distance?: number; // Distance from current user
  isFamilyMember?: boolean; // Whether this user is a family member
};

type FamilyMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string;
  aadhaar: string;
  imageUrl?: string;
  distance?: number;
  lastSeen?: string;
};

type NearbyUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  distance: number;
  lastSeen: string;
  isOnline: boolean;
};

type RouteInfo = {
  coordinates: Array<{ latitude: number; longitude: number }>;
  distance: string;
  duration: string;
  isVisible: boolean;
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

// Calculate distance between two coordinates in kilometers
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Check if user is online (location updated in last 2 minutes)
const isUserOnline = (timestamp: any): boolean => {
  if (!timestamp) return false;
  
  let lastUpdate: Date;
  if (timestamp.toDate) {
    lastUpdate = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    lastUpdate = timestamp;
  } else {
    lastUpdate = new Date(timestamp);
  }
  
  const now = new Date();
  const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
  return diffMinutes <= 2; // 2 minutes threshold for more accurate online status
};

export default function MapScreen() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [allUsers, setAllUsers] = useState<UserLocation[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isTracking, setIsTracking] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserLocation | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({
    coordinates: [],
    distance: '',
    duration: '',
    isVisible: false
  });
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
      updatedAt: serverTimestamp(),
      lastSeen: serverTimestamp()
    };

    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid),
        { 
          location: userLocation,
          lastLocation: userLocation, // Also update last known location
          lastSeen: serverTimestamp()
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error updating user location:', error);
    }
  };

  // Fetch user's family members and calculate distances
  const fetchFamilyMembers = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.familyMembers && Array.isArray(userData.familyMembers)) {
          const members: FamilyMember[] = [];
          
          for (const email of userData.familyMembers) {
            // Query for family member by email
            const q = query(collection(db, 'users'), where('email', '==', email));
            const querySnap = await getDocs(q);
            
            querySnap.forEach((doc) => {
              const memberData = doc.data();
              
              // Check if family member has current location OR last known location
              const hasCurrentLocation = memberData.location && memberData.location.coords;
              const hasLastLocation = memberData.lastLocation && memberData.lastLocation.coords;
              const hasAnyLocation = hasCurrentLocation || hasLastLocation;
              
              if (hasAnyLocation && location) {
                // Use current location if available, otherwise use last known location
                const locationToUse = hasCurrentLocation ? memberData.location : memberData.lastLocation;
                const isCurrentlyOnline = hasCurrentLocation && isUserOnline(memberData.location.timestamp);
                
                // Calculate distance from current location
                const distance = calculateDistance(
                  location.coords.latitude,
                  location.coords.longitude,
                  locationToUse.coords.latitude,
                  locationToUse.coords.longitude
                );
                
                members.push({
                  id: doc.id,
                  name: memberData.name || 'Unknown',
                  email: memberData.email,
                  role: memberData.role || 'user',
                  phone: memberData.phone || 'N/A',
                  aadhaar: memberData.aadhaar || 'N/A',
                  imageUrl: memberData.imageUrl,
                  distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
                  lastSeen: memberData.lastSeen?.toDate?.()?.toLocaleString() || 
                           locationToUse.timestamp?.toDate?.()?.toLocaleString() || 'Unknown'
                });
              } else {
                // Family member has no location data at all (completely offline)
                members.push({
                  id: doc.id,
                  name: memberData.name || 'Unknown',
                  email: memberData.email,
                  role: memberData.role || 'user',
                  phone: memberData.phone || 'N/A',
                  aadhaar: memberData.aadhaar || 'N/A',
                  imageUrl: memberData.imageUrl,
                  distance: undefined, // No distance for completely offline members
                  lastSeen: memberData.lastSeen?.toDate?.()?.toLocaleString() || 'Never'
                });
              }
            });
          }
          
          // Sort by distance (closest first), put those without distance at the end
          members.sort((a, b) => {
            if (a.distance === undefined && b.distance === undefined) return 0;
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return (a.distance || 0) - (b.distance || 0);
          });
          
          setFamilyMembers(members);
        }
      }
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  // Fetch all users and their locations (both online and offline)
  const fetchAllUsers = async () => {
    try {
      console.log('Fetching all users from database...');
      const usersRef = collection(db, 'users');
      
      // Get ALL users without any filtering
      const querySnapshot = await getDocs(usersRef);
      console.log('Total users found in database:', querySnapshot.docs.length);
      
      const usersData: UserLocation[] = [];
      let colorIndex = 0;

      // First, get current user's family members to check against
      let currentUserFamilyMembers: string[] = [];
      if (auth.currentUser) {
        try {
          const currentUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (currentUserDoc.exists()) {
            const currentUserData = currentUserDoc.data();
            currentUserFamilyMembers = currentUserData.familyMembers || [];
          }
        } catch (error) {
          console.log('Error getting current user family members:', error);
        }
      }

      for (const doc of querySnapshot.docs) {
        // Skip the current user's document
        if (doc.id === auth.currentUser?.uid) continue;

        const userData = doc.data();
        console.log('Processing user:', doc.id, userData.email, userData.name);
        
        // Check if user has any location data (current location OR last known location)
        const hasCurrentLocation = userData.location && userData.location.coords;
        const hasLastLocation = userData.lastLocation && userData.lastLocation.coords;
        const hasAnyLocation = hasCurrentLocation || hasLastLocation;
        
        // Only add users who have actual location data (either current or last known)
        if (userData.email && hasAnyLocation) {
          // Check if this user is a family member
          const isFamilyMember = currentUserFamilyMembers.includes(userData.email);
          
          // Determine which location to use
          let coords: any;
          let timestamp: any;
          let isOnline: boolean = false; // Default to offline
          
          if (hasCurrentLocation) {
            // User has current location - check if they are online
            coords = userData.location.coords;
            timestamp = userData.location.timestamp;
            isOnline = isUserOnline(timestamp);
          } else if (hasLastLocation) {
            // User only has last known location - they are offline
            coords = userData.lastLocation.coords;
            timestamp = userData.lastLocation.timestamp;
            isOnline = false; // Offline since no current location
          }
          
          // Use special color for family members
          const userColor = isFamilyMember ? '#FF6B35' : USER_COLORS[colorIndex % USER_COLORS.length];
          
          usersData.push({
            id: doc.id,
            coords: coords,
            timestamp: timestamp?.toDate?.()?.getTime() || Date.now(),
            name: userData.name || userData.email.split('@')[0] || 'User ' + (colorIndex + 1),
            color: userColor,
            userData: userData,
            isOnline: isOnline,
            lastSeen: userData.lastSeen?.toDate?.()?.toLocaleString() || 
                     timestamp?.toDate?.()?.toLocaleString() || 'Unknown',
            isFamilyMember: isFamilyMember
          });
          colorIndex++;
        } else if (userData.email) {
          console.log('User has no location data:', userData.email, 'Skipping...');
        }
      }

             const onlineCount = usersData.filter(u => u.isOnline).length;
       const offlineCount = usersData.filter(u => !u.isOnline).length;
       const familyCount = usersData.filter(u => u.isFamilyMember).length;
       
       console.log('=== User Count Summary ===');
       console.log('Total users with location data:', usersData.length);
       console.log('🟢 Online users (live location):', onlineCount);
       console.log('🔴 Offline users (last known):', offlineCount);
       console.log('👨‍👩‍👧‍👦 Family members:', familyCount);
       console.log('========================');
      
      setAllUsers(usersData);
      
      // Calculate nearby users for the selected user
      if (selectedUser && location) {
        calculateNearbyUsers(selectedUser, usersData);
      }
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  // Calculate route from current user to a specific location
  const calculateRoute = async (destinationLat: number, destinationLng: number) => {
    if (!location) return;
    
    try {
      const origin = `${location.coords.latitude},${location.coords.longitude}`;
      const destination = `${destinationLat},${destinationLng}`;
      
      // Using Google Maps Directions API
      const apiKey = 'AIzaSyBIOC5weP0UHUucbi4EwAMAk-ollFzJ5nA'; // Your Google Maps API key
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        // Decode polyline to get coordinates
        const points = decodePolyline(route.overview_polyline.points);
        
        setRouteInfo({
          coordinates: points,
          distance: leg.distance.text,
          duration: leg.duration.text,
          isVisible: true
        });
        
        // Animate map to show the route
        if (mapRef.current && points.length > 0) {
          const bounds = {
            latitude: (location.coords.latitude + destinationLat) / 2,
            longitude: (location.coords.longitude + destinationLng) / 2,
            latitudeDelta: Math.abs(location.coords.latitude - destinationLat) * 1.5,
            longitudeDelta: Math.abs(location.coords.longitude - destinationLng) * 1.5,
          };
          
          mapRef.current.animateToRegion(bounds, 1000);
        }
      }
    } catch (error) {
      console.error('Error calculating route:', error);
      Alert.alert('Error', 'Could not calculate route. Please try again.');
    }
  };

  // Decode Google Maps polyline
  const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
    const poly = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1E5,
        longitude: lng / 1E5
      });
    }
    return poly;
  };

  // Calculate nearby users for a specific user
  const calculateNearbyUsers = (targetUser: UserLocation, allUsers: UserLocation[]) => {
    if (!targetUser.coords) return;

    const nearby: NearbyUser[] = [];
    
    allUsers.forEach(user => {
      if (user.id !== targetUser.id && user.coords) {
        const distance = calculateDistance(
          targetUser.coords.latitude,
          targetUser.coords.longitude,
          user.coords.latitude,
          user.coords.longitude
        );
        
        nearby.push({
          id: user.id,
          name: user.name,
          email: user.userData?.email || 'Unknown',
          role: user.userData?.role || 'user',
          distance: Math.round(distance * 100) / 100,
          lastSeen: user.lastSeen || 'Unknown',
          isOnline: user.isOnline || false
        });
      }
    });

    // Sort by distance (closest first) and limit to top 10
    nearby.sort((a, b) => a.distance - b.distance);
    setNearbyUsers(nearby.slice(0, 10));
  };

  // Subscribe to real-time location updates
  useEffect(() => {
    if (!auth.currentUser) return;

    const usersRef = collection(db, 'users');
    
    // Listen to all users for location updates (both current and last known)
    const unsubscribe = onSnapshot(usersRef, async (snapshot) => {
      // Update real-time locations for online users
      const updatedUsers = [...allUsers];
      
      for (const change of snapshot.docChanges()) {
        if (change.doc.id === auth.currentUser?.uid) continue;
        
        const userData = change.doc.data();
        const hasCurrentLocation = userData.location && userData.location.coords;
        const hasLastLocation = userData.lastLocation && userData.lastLocation.coords;
        
        if (hasCurrentLocation || hasLastLocation) {
          const existingUserIndex = updatedUsers.findIndex(u => u.id === change.doc.id);
          
          if (existingUserIndex >= 0) {
            // Update existing user
            if (hasCurrentLocation) {
              // User has current location - check if they are online
              const isCurrentlyOnline = isUserOnline(userData.location.timestamp);
              updatedUsers[existingUserIndex] = {
                ...updatedUsers[existingUserIndex],
                coords: userData.location.coords,
                timestamp: userData.location.timestamp?.toDate().getTime() || Date.now(),
                isOnline: isCurrentlyOnline,
                lastSeen: isCurrentlyOnline ? 'Now' : userData.location.timestamp?.toDate().toLocaleString() || 'Unknown'
              };
            } else if (hasLastLocation) {
              // User is offline with last known location
              updatedUsers[existingUserIndex] = {
                ...updatedUsers[existingUserIndex],
                coords: userData.lastLocation.coords,
                timestamp: userData.lastLocation.timestamp?.toDate().getTime() || Date.now(),
                isOnline: false,
                lastSeen: userData.lastLocation.timestamp?.toDate().toLocaleString() || 'Unknown'
              };
            }
          }
        }
      }
      
      setAllUsers(updatedUsers);
      
      // Recalculate nearby users if modal is open
      if (selectedUser) {
        calculateNearbyUsers(selectedUser, updatedUsers);
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser?.uid, allUsers, selectedUser]);

  // Initial fetch of all users
  useEffect(() => {
    if (auth.currentUser) {
      fetchAllUsers();
    }
  }, [auth.currentUser]);

  // Periodically check online status (every 30 seconds)
  useEffect(() => {
    if (!allUsers.length) return;
    
    const interval = setInterval(() => {
      const updatedUsers = allUsers.map(user => {
        if (user.timestamp) {
          const isCurrentlyOnline = isUserOnline(user.timestamp);
          return {
            ...user,
            isOnline: isCurrentlyOnline,
            lastSeen: isCurrentlyOnline ? 'Now' : new Date(user.timestamp).toLocaleString()
          };
        }
        return user;
      });
      
      setAllUsers(updatedUsers);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [allUsers.length]);

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
        color: '#0000FF', // Blue for current user
        isOnline: true,
        lastSeen: 'Now'
      };

      // Save user location to Firestore
      if (auth.currentUser) {
        await updateUserLocation(position);
        // Fetch family members after updating location
        await fetchFamilyMembers(auth.currentUser.uid);
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
            color: '#808080',
            isOnline: false,
            lastSeen: 'Unknown'
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

  // Handle marker press
  const handleMarkerPress = (user: UserLocation) => {
    setSelectedUser(user);
    setShowUserModal(true);
    
    // Calculate nearby users for this user
    calculateNearbyUsers(user, allUsers);
    
    // If this is the current user, fetch family members
    if (user.name === 'You' && auth.currentUser) {
      fetchFamilyMembers(auth.currentUser.uid);
    }
    
    // If this is a family member, show route option
    if (user.isFamilyMember && location) {
      // Don't automatically show route, let user choose from popup
      console.log('Family member marker pressed:', user.name);
    }
  };

  // Clear route
  const clearRoute = () => {
    setRouteInfo({
      coordinates: [],
      distance: '',
      duration: '',
      isVisible: false
    });
  };

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

  // Get accurate user counts
  const getAccurateUserCounts = () => {
    const totalWithLocation = 1 + allUsers.length; // Including current user
    const onlineWithLiveLocation = allUsers.filter(user => user.isOnline).length;
    const offlineWithLastLocation = allUsers.filter(user => !user.isOnline).length;
    const familyMembersOnMap = allUsers.filter(user => user.isFamilyMember).length;
    
    return {
      total: totalWithLocation,
      online: onlineWithLiveLocation,
      offline: offlineWithLastLocation,
      familyOnMap: familyMembersOnMap
    };
  };

  const userCounts = getAccurateUserCounts();

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
           👥 {userCounts.total} {userCounts.total === 1 ? 'person' : 'people'} total
         </Text>
         <Text style={styles.onlineUsersText}>
           🟢 {userCounts.online} online | 🔴 {userCounts.offline} offline
         </Text>
         <Text style={styles.locationStatusText}>
           📍 {allUsers.filter(u => u.isOnline).length} with live location | 📍 {allUsers.filter(u => !u.isOnline).length} with last known location
         </Text>
         {familyMembers.length > 0 && (
           <Text style={styles.familyCountText}>
             👨‍👩‍👧‍👦 {familyMembers.length} family members nearby
           </Text>
         )}
         {allUsers.filter(u => u.isFamilyMember).length > 0 && (
           <Text style={styles.familyMapText}>
             🗺️ {allUsers.filter(u => u.isFamilyMember).length} family members on map
           </Text>
         )}
         
         {/* Route Information */}
         {routeInfo.isVisible && (
           <View style={styles.routeInfoContainer}>
             <Text style={styles.routeInfoTitle}>🗺️ Route to Family Member</Text>
             <Text style={styles.routeInfoText}>
               Distance: {routeInfo.distance} | Duration: {routeInfo.duration}
             </Text>
             <TouchableOpacity style={styles.clearRouteButton} onPress={clearRoute}>
               <Text style={styles.clearRouteButtonText}>✕ Clear Route</Text>
             </TouchableOpacity>
           </View>
         )}
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
            onPress={() => handleMarkerPress(location)}
          />
        )}

                 {/* All other users' locations */}
         {allUsers.map((user) => (
           <Marker
             key={user.id}
             coordinate={{
               latitude: user.coords.latitude,
               longitude: user.coords.longitude,
             }}
             title={user.name}
             description={
               user.isFamilyMember ? 
                 `👨‍👩‍👧‍👦 Family Member (${user.isOnline ? 'Live' : 'Last Known'})` : 
                 `${user.isOnline ? '🟢 Live Location' : '🔴 Last Known Location'}`
             }
             pinColor={
               user.isFamilyMember ? '#FF6B35' : // Orange for family members
               (user.isOnline ? user.color : '#808080') // Original color or gray for offline
             }
             onPress={() => handleMarkerPress(user)}
           />
         ))}

         {/* Route Polyline */}
         {routeInfo.isVisible && routeInfo.coordinates.length > 0 && (
           <Polyline
             coordinates={routeInfo.coordinates}
             strokeColor="#FF6B35"
             strokeWidth={4}
             lineDashPattern={[1]}
           />
         )}
       </MapView>

      {/* User Details Modal */}
      <Modal
        visible={showUserModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedUser?.name === 'You' ? 'Your Profile' : 'User Profile'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowUserModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedUser && (
                <>
                  {/* User Basic Info */}
                  <View style={styles.userInfoSection}>
                    <View style={styles.userAvatar}>
                      {selectedUser.userData?.imageUrl ? (
                        <Image 
                          source={{ uri: selectedUser.userData.imageUrl }} 
                          style={styles.avatarImage} 
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.userName}>{selectedUser.name}</Text>
                    {selectedUser.userData?.role && (
                      <Text style={styles.userRole}>{selectedUser.userData.role}</Text>
                    )}
                                         <View style={styles.onlineStatus}>
                       <View style={[styles.statusDot, { backgroundColor: selectedUser.isOnline ? '#4CAF50' : '#F44336' }]} />
                       <Text style={[styles.statusText, { color: selectedUser.isOnline ? '#4CAF50' : '#F44336' }]}>
                         {selectedUser.isOnline ? '🟢 Live Location' : '🔴 Last Known Location'}
                       </Text>
                     </View>
                  </View>

                  {/* Location Info */}
                  <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>📍 Location Information</Text>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Latitude:</Text>
                      <Text style={styles.infoValue}>{selectedUser.coords.latitude.toFixed(6)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Longitude:</Text>
                      <Text style={styles.infoValue}>{selectedUser.coords.longitude.toFixed(6)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Last Updated:</Text>
                      <Text style={styles.infoValue}>
                        {new Date(selectedUser.timestamp).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Last Seen:</Text>
                      <Text style={styles.infoValue}>{selectedUser.lastSeen}</Text>
                    </View>
                    {selectedUser.coords.accuracy && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Accuracy:</Text>
                        <Text style={styles.infoValue}>{Math.round(selectedUser.coords.accuracy)}m</Text>
                      </View>
                    )}
                  </View>

                  {/* User Details */}
                  {selectedUser.userData && (
                    <View style={styles.infoSection}>
                      <Text style={styles.sectionTitle}>👤 User Details</Text>
                      {selectedUser.userData.email && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Email:</Text>
                          <Text style={styles.infoValue}>{selectedUser.userData.email}</Text>
                        </View>
                      )}
                      {selectedUser.userData.phone && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Phone:</Text>
                          <Text style={styles.infoValue}>{selectedUser.userData.phone}</Text>
                        </View>
                      )}
                      {selectedUser.userData.aadhaar && (
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>Aadhaar:</Text>
                          <Text style={styles.infoValue}>{selectedUser.userData.aadhaar}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  
                  {/* Route Button for Family Members */}
                  {selectedUser.isFamilyMember && location && (
                    <View style={styles.infoSection}>
                      <TouchableOpacity
                        style={styles.routeButton}
                        onPress={() => {
                          console.log('Calculating route to family member from modal:', selectedUser.name);
                          calculateRoute(
                            selectedUser.coords.latitude,
                            selectedUser.coords.longitude
                          );
                          setShowUserModal(false); // Close modal to show route
                        }}
                      >
                        <Text style={styles.routeButtonText}>🗺️ Show Route to {selectedUser.name}</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Nearby Users Section */}
                  {nearbyUsers.length > 0 && (
                    <View style={styles.infoSection}>
                      <Text style={styles.sectionTitle}>👥 Nearby Users</Text>
                      {nearbyUsers.map((nearbyUser, index) => (
                        <View key={nearbyUser.id} style={styles.nearbyUserCard}>
                          <View style={styles.nearbyUserHeader}>
                            <View style={styles.nearbyUserInfo}>
                              <Text style={styles.nearbyUserName}>{nearbyUser.name}</Text>
                              <Text style={styles.nearbyUserEmail}>{nearbyUser.email}</Text>
                              <Text style={styles.nearbyUserRole}>{nearbyUser.role}</Text>
                            </View>
                            <View style={styles.distanceContainer}>
                              <Text style={styles.distanceText}>{nearbyUser.distance} km</Text>
                              <Text style={styles.distanceLabel}>away</Text>
                            </View>
                          </View>
                          <View style={styles.nearbyUserDetails}>
                                                       <View style={styles.onlineStatus}>
                             <View style={[styles.statusDot, { backgroundColor: nearbyUser.isOnline ? '#4CAF50' : '#F44336' }]} />
                             <Text style={[styles.statusText, { color: nearbyUser.isOnline ? '#4CAF50' : '#F44336' }]}>
                               {nearbyUser.isOnline ? '🟢 Live' : '🔴 Last Known'}
                             </Text>
                           </View>
                            <Text style={styles.lastSeenText}>Last seen: {nearbyUser.lastSeen}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Family Members Section */}
                  {selectedUser.name === 'You' && familyMembers.length > 0 && (
                    <View style={styles.infoSection}>
                      <Text style={styles.sectionTitle}>👨‍👩‍👧‍👦 Family Members</Text>
                      {familyMembers.map((member, index) => (
                        <View key={member.id} style={styles.familyMemberCard}>
                          <View style={styles.familyMemberHeader}>
                            <View style={styles.familyMemberAvatar}>
                              {member.imageUrl ? (
                                <Image source={{ uri: member.imageUrl }} style={styles.familyAvatarImage} />
                              ) : (
                                <Text style={styles.familyAvatarText}>
                                  {member.name.charAt(0).toUpperCase()}
                                </Text>
                              )}
                            </View>
                            <View style={styles.familyMemberInfo}>
                              <Text style={styles.familyMemberName}>{member.name}</Text>
                              <Text style={styles.familyMemberRole}>{member.role}</Text>
                            </View>
                            <View style={styles.distanceContainer}>
                              {member.distance ? (
                                <>
                                  <Text style={styles.distanceText}>{member.distance} km</Text>
                                  <Text style={styles.distanceLabel}>away</Text>
                                </>
                              ) : (
                                <Text style={styles.offlineText}>Offline</Text>
                              )}
                            </View>
                          </View>
                                                     <View style={styles.familyMemberDetails}>
                             <Text style={styles.familyMemberEmail}>{member.email}</Text>
                             <Text style={styles.familyMemberPhone}>📱 {member.phone}</Text>
                             <Text style={styles.lastSeenText}>
                               {member.distance ? 'Last seen: ' : 'Last active: '}
                               {member.lastSeen}
                             </Text>
                             
                                                           {/* Navigation Button */}
                              {member.distance && (
                                <TouchableOpacity
                                  style={styles.navigateButton}
                                  onPress={() => {
                                    // Find the family member's location from allUsers
                                    const familyMemberUser = allUsers.find(u => u.userData?.email === member.email);
                                    if (familyMemberUser) {
                                      console.log('Calculating route to family member:', member.name);
                                      calculateRoute(
                                        familyMemberUser.coords.latitude,
                                        familyMemberUser.coords.longitude
                                      );
                                      setShowUserModal(false); // Close modal to show route
                                    } else {
                                      Alert.alert('Error', 'Could not find family member location on map');
                                    }
                                  }}
                                >
                                  <Text style={styles.navigateButtonText}>🗺️ Navigate to {member.name}</Text>
                                </TouchableOpacity>
                              )}
                           </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    zIndex: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 200,
  },
  userCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  onlineUsersText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  locationStatusText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 4,
  },
  familyCountText: {
    fontSize: 14,
    color: '#FF8C00',
    textAlign: 'center',
    fontWeight: '600',
  },
  familyMapText: {
    fontSize: 14,
    color: '#FF6B35',
    textAlign: 'center',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: '#666',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  onlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  nearbyUserCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  nearbyUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nearbyUserInfo: {
    flex: 1,
  },
  nearbyUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  nearbyUserEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  nearbyUserRole: {
    fontSize: 12,
    color: '#888',
  },
  distanceContainer: {
    alignItems: 'center',
  },
  distanceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#28a745',
  },
  distanceLabel: {
    fontSize: 12,
    color: '#666',
  },
  nearbyUserDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  familyMemberCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  familyMemberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  familyMemberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  familyAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  familyAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  familyMemberInfo: {
    flex: 1,
  },
  familyMemberName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  familyMemberRole: {
    fontSize: 14,
    color: '#666',
  },
  familyMemberDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 12,
  },
  familyMemberEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  familyMemberPhone: {
    fontSize: 14,
    color: '#007bff',
    marginBottom: 4,
  },
  lastSeenText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  offlineText: {
    fontSize: 14,
    color: '#FF0000', // Red for offline
    fontWeight: 'bold',
  },
  navigateButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  navigateButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeInfoContainer: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    zIndex: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    minWidth: 250,
    alignItems: 'center',
  },
  routeInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  routeInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  clearRouteButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  clearRouteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 8,
  },
  routeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

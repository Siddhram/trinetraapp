import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { auth } from '../../lib/firebase';
import FirebaseService from '../../lib/firebaseService';
import hospitalService, { Hospital } from '../../lib/hospitalService';
import NotificationService from '../../lib/notificationService';

export default function MedicalScreen() {
  const params = useLocalSearchParams();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'hospital' | 'clinic'>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  // Route functionality state
  const [routePoints, setRoutePoints] = useState<{latitude: number, longitude: number}[]>([]);
  const [showRoute, setShowRoute] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  
  // Ambulance route state
  const [ambulanceRoutePoints, setAmbulanceRoutePoints] = useState<{latitude: number, longitude: number}[]>([]);
  const [showAmbulanceRoute, setShowAmbulanceRoute] = useState(false);
  const [ambulanceRequest, setAmbulanceRequest] = useState<{
    id: string;
    patientName: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [ambulanceRouteProcessed, setAmbulanceRouteProcessed] = useState(false);

  useEffect(() => {
    initializeLocation();
  }, []);

  // Handle ambulance route parameters
  useEffect(() => {
    if (params.showAmbulanceRoute === 'true' && params.patientLat && params.patientLng && location && !ambulanceRouteProcessed) {
      const patientLat = parseFloat(params.patientLat as string);
      const patientLng = parseFloat(params.patientLng as string);
      
      setAmbulanceRequest({
        id: params.requestId as string,
        patientName: params.patientName as string,
        latitude: patientLat,
        longitude: patientLng
      });
      
        calculateAmbulanceRoute(patientLat, patientLng);
      setActiveTab('map'); // Switch to map view
      setAmbulanceRouteProcessed(true); // Mark as processed
      }
  }, [params.showAmbulanceRoute, params.patientLat, params.patientLng, params.requestId, params.patientName, location]);

  const initializeLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
      await fetchNearbyHospitals(currentLocation.coords.latitude, currentLocation.coords.longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Error getting location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyHospitals = async (latitude: number, longitude: number) => {
    try {
      // Fetch all types of medical facilities (hospitals, clinics, pharmacies)
      const allMedicalFacilities = await hospitalService.fetchAllMedicalFacilities({
        latitude,
        longitude,
        radius: 15,
        limit: 50
      });
      setHospitals(allMedicalFacilities);
      console.log(`Fetched ${allMedicalFacilities.length} medical facilities:`, {
        hospitals: allMedicalFacilities.filter(h => h.type === 'hospital').length,
        clinics: allMedicalFacilities.filter(h => h.type === 'clinic').length
      });
    } catch (error) {
      console.error('Error fetching medical facilities:', error);
      setErrorMsg('Error fetching nearby medical facilities. Please try again.');
    }
  };

  const onRefresh = async () => {
    if (location) {
      setRefreshing(true);
      await fetchNearbyHospitals(location.coords.latitude, location.coords.longitude);
      setRefreshing(false);
    }
  };

  const handleHospitalPress = (hospital: Hospital) => {
    // For now, just show basic info in the list
    // The hospital details are already visible in the list view
    console.log('Hospital pressed:', hospital.name);
  };

  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  const handleFilterChange = (filter: 'all' | 'hospital' | 'clinic') => {
    setSelectedFilter(filter);
    setShowFilters(false); // Close filters when a filter is selected
  };

  const getFilterColor = (filter: 'all' | 'hospital' | 'clinic') => {
    switch (filter) {
      case 'all': return '#FF6B6B';
      case 'hospital': return '#FF6B6B';
      case 'clinic': return '#4ECDC4';
      default: return '#95A5A6';
    }
  };

  const getFilterCount = (filter: 'all' | 'hospital' | 'clinic') => {
    if (filter === 'all') {
      return hospitals.length;
    }
    return hospitals.filter(h => h.type === filter).length;
  };

  const filteredHospitals = hospitals.filter(hospital => {
    const matchesSearch = hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         hospital.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || hospital.type === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const handleCall = (phoneNumber: string) => {
    if (phoneNumber && phoneNumber !== 'Phone not available') {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleDirections = (latitude: number, longitude: number) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const getMarkerIcon = (type: Hospital['type']) => {
    switch (type) {
      case 'hospital': return 'medical';
      case 'clinic': return 'medical-outline';
      default: return 'location';
    }
  };

  // Route calculation function
  const calculateRoute = async (hospital: Hospital) => {
    if (!location) return;
    
    try {
      // For now, we'll create a simple straight-line route
      // In a real app, you'd use Google Directions API or similar
      const startPoint = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };

      const endPoint = {
        latitude: hospital.latitude,
        longitude: hospital.longitude
      };

      // Create intermediate points for a more realistic route
      const intermediatePoints = [
        {
          latitude: startPoint.latitude + (endPoint.latitude - startPoint.latitude) * 0.3,
          longitude: startPoint.longitude + (endPoint.longitude - startPoint.longitude) * 0.3
        },
        {
          latitude: startPoint.latitude + (endPoint.latitude - startPoint.latitude) * 0.7,
          longitude: startPoint.longitude + (endPoint.longitude - startPoint.longitude) * 0.7
        }
      ];

      const route = [startPoint, ...intermediatePoints, endPoint];
      setRoutePoints(route);
      setShowRoute(true);
      setSelectedHospital(hospital);
      setActiveTab('map'); // Automatically switch to map view

      // Calculate distance and estimated time
      const distance = Math.sqrt(
        Math.pow(endPoint.latitude - startPoint.latitude, 2) + 
        Math.pow(endPoint.longitude - startPoint.longitude, 2)
      ) * 111; // Convert to km (roughly)
      
      const estimatedTime = Math.round(distance * 2); // Rough estimate: 2 minutes per km

      // Store route data in Firebase for medical admin tracking
      try {
        // Get current authenticated user data
        const currentUser = auth.currentUser;
        if (currentUser) {
          console.log('Current authenticated user:', currentUser.uid, currentUser.email);
          
          const userData = await FirebaseService.getCurrentUserData(currentUser.uid);
          console.log('Fetched user data from Firestore:', userData);
          
          if (userData) {
            const routeData = {
              userId: currentUser.uid,
              userName: userData.name || 'Unknown User',
              userPhone: userData.phone || 'N/A',
              userEmail: userData.email || currentUser.email || 'N/A',
              userAadhaar: userData.aadhaar || 'N/A',
              userRole: userData.role || 'user',
              userRelationship: userData.relationship || 'User',
              userCreatedAt: userData.createdAt || new Date(),
              userLastSeen: userData.lastSeen || new Date(),
              userIsActive: userData.isActive || true,
              userFamilyMembers: userData.familyMembers || [],
              hospitalId: hospital.id,
              hospitalName: hospital.name,
              hospitalType: hospital.type,
              startLatitude: startPoint.latitude,
              startLongitude: startPoint.longitude,
              endLatitude: endPoint.latitude,
              endLongitude: endPoint.longitude,
              routePoints: route,
              distance: distance,
              estimatedTime: estimatedTime
            };

            console.log('Creating route with full user details:', routeData);
            await FirebaseService.createUserRoute(routeData);
            console.log('✅ Route data with full user details stored successfully in Firebase');

            // Send notification that user is traveling to hospital
            try {
              await NotificationService.sendUserTravelingNotification({
                type: 'user_traveling',
                userName: userData.name || 'Current User',
                hospitalName: hospital.name,
                timestamp: new Date().toISOString(),
                priority: 'medium'
              });
              console.log('✅ User traveling notification sent successfully');
            } catch (notificationError) {
              console.error('❌ Error sending user traveling notification:', notificationError);
              // Don't fail the main operation if notification fails
            }
          } else {
            console.warn('⚠️ User data not found in Firestore, storing route with basic info');
            // Fallback with basic user info
            const routeData = {
              userId: currentUser.uid,
              userName: currentUser.displayName || 'Current User',
              userPhone: 'N/A',
              userEmail: currentUser.email || 'N/A',
              userAadhaar: 'N/A',
              userRole: 'user',
              userRelationship: 'User',
              userCreatedAt: new Date(),
              userLastSeen: new Date(),
              userIsActive: true,
              userFamilyMembers: [],
              hospitalId: hospital.id,
              hospitalName: hospital.name,
              hospitalType: hospital.type,
              startLatitude: startPoint.latitude,
              startLongitude: startPoint.longitude,
              endLatitude: endPoint.latitude,
              endLongitude: endPoint.longitude,
              routePoints: route,
              distance: distance,
              estimatedTime: estimatedTime
            };

            console.log('Creating route with basic user info:', routeData);
            await FirebaseService.createUserRoute(routeData);
            console.log('✅ Route data with basic user info stored successfully in Firebase');

            // Send notification that user is traveling to hospital
            try {
              await NotificationService.sendUserTravelingNotification({
                type: 'user_traveling',
                userName: currentUser.displayName || 'Current User',
                hospitalName: hospital.name,
                timestamp: new Date().toISOString(),
                priority: 'medium'
              });
              console.log('✅ User traveling notification sent successfully');
            } catch (notificationError) {
              console.error('❌ Error sending user traveling notification:', notificationError);
              // Don't fail the main operation if notification fails
            }
          }
        } else {
          console.warn('⚠️ No authenticated user found, cannot store route data');
        }
      } catch (firebaseError) {
        console.error('❌ Error storing route data in Firebase:', firebaseError);
        // Don't fail the route calculation if Firebase storage fails
      }

      console.log('Route calculated from user to hospital:', hospital.name);
    } catch (error) {
      console.error('Error calculating route:', error);
    }
  };

  const clearRoute = () => {
    setRoutePoints([]);
    setShowRoute(false);
    setSelectedHospital(null);
  };

  // Ambulance route calculation function
  const calculateAmbulanceRoute = async (patientLat: number, patientLng: number) => {
    if (!location) return;
    
    try {
      // Find the nearest hospital to the patient
      const nearestHospital = hospitals.reduce((nearest, hospital) => {
        const distanceToPatient = Math.sqrt(
          Math.pow(hospital.latitude - patientLat, 2) + 
          Math.pow(hospital.longitude - patientLng, 2)
        );
        const distanceToNearest = Math.sqrt(
          Math.pow(nearest.latitude - patientLat, 2) + 
          Math.pow(nearest.longitude - patientLng, 2)
        );
        return distanceToPatient < distanceToNearest ? hospital : nearest;
      });

      // Create route from hospital to patient - more direct path
      const startPoint = {
        latitude: nearestHospital.latitude,
        longitude: nearestHospital.longitude
      };

      const endPoint = {
        latitude: patientLat,
        longitude: patientLng
      };

      // Calculate distance for route complexity
      const distance = Math.sqrt(
        Math.pow(endPoint.latitude - startPoint.latitude, 2) + 
        Math.pow(endPoint.longitude - startPoint.longitude, 2)
      );

      // Create more intermediate points for a more realistic and direct route
      const numPoints = Math.max(5, Math.floor(distance * 1000 / 50)); // More points for better route visualization
      const intermediatePoints = [];
      
      for (let i = 1; i < numPoints; i++) {
        const ratio = i / numPoints;
        // Add slight curve to make it look more like a real road path
        const curveOffset = Math.sin(ratio * Math.PI) * 0.0005; // Smaller curve for more direct path
        
        intermediatePoints.push({
          latitude: startPoint.latitude + (endPoint.latitude - startPoint.latitude) * ratio + curveOffset,
          longitude: startPoint.longitude + (endPoint.longitude - startPoint.longitude) * ratio + curveOffset
        });
      }

      const route = [startPoint, ...intermediatePoints, endPoint];
      setAmbulanceRoutePoints(route);
      setShowAmbulanceRoute(true);

      console.log('Ambulance route calculated from hospital to patient:', nearestHospital.name);
      console.log('Route points:', route.length, 'Distance:', distance);
    } catch (error) {
      console.error('Error calculating ambulance route:', error);
    }
  };

  const clearAmbulanceRoute = () => {
    console.log('Clearing ambulance route...');
    console.log('Before clear - showAmbulanceRoute:', showAmbulanceRoute);
    console.log('Before clear - ambulanceRoutePoints length:', ambulanceRoutePoints.length);
    setAmbulanceRoutePoints([]);
    setShowAmbulanceRoute(false);
    setAmbulanceRequest(null);
    // Don't reset ambulanceRouteProcessed to prevent useEffect from re-triggering
    console.log('Ambulance route cleared successfully');
  };

  const renderHospitalItem = ({ item }: { item: Hospital }) => (
    <TouchableOpacity style={styles.hospitalItem}>
      <View style={styles.hospitalHeader}>
        <View style={styles.hospitalInfo}>
          <Text style={styles.hospitalName}>{item.name}</Text>
          <Text style={styles.hospitalType}>{item.type}</Text>
        </View>
        <View style={styles.hospitalDistance}>
          <Text style={styles.distanceText}>{item.distance.toFixed(1)} km</Text>
        </View>
      </View>
      
      <Text style={styles.hospitalAddress}>{item.address}</Text>
      
      {item.phone && item.phone !== 'Phone not available' && (
        <Text style={styles.hospitalPhone}>📞 {item.phone}</Text>
      )}
      
      {item.rating > 0 && (
        <Text style={styles.hospitalRating}>⭐ {item.rating}</Text>
      )}
      
      <View style={styles.actionButtons}>
        {item.phone && item.phone !== 'Phone not available' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={() => handleCall(item.phone)}
          >
            <Ionicons name="call" size={16} color="white" />
            <Text style={styles.buttonText}>Call</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.directionsButton]}
          onPress={() => handleDirections(item.latitude, item.longitude)}
        >
          <Ionicons name="navigate" size={16} color="white" />
          <Text style={styles.buttonText}>Directions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.routeButton]}
          onPress={() => calculateRoute(item)}
        >
          <Ionicons name="map" size={16} color="white" />
          <Text style={styles.buttonText}>Show Route</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading medical facilities...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeLocation}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Medical Services</Text>
            <Text style={styles.headerSubtitle}>Find nearby hospitals and medical facilities</Text>
          </View>
          <TouchableOpacity
            style={styles.ambulanceButton}
            onPress={() => router.push('/(tabs)/my-requests')}
          >
            <Ionicons name="medical" size={20} color="white" />
            <Text style={styles.ambulanceButtonText}>My Requests</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <Ionicons name="map" size={20} color={activeTab === 'map' ? '#FF6B6B' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>Map View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => setActiveTab('list')}
        >
          <Ionicons name="list" size={20} color={activeTab === 'list' ? '#FF6B6B' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>List View</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'map' ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: location?.coords.latitude || 0,
              longitude: location?.coords.longitude || 0,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {/* User location marker */}
            {location && (
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                title="Your Location"
                description="You are here"
              >
                <View style={styles.userLocationMarker}>
                  <Ionicons name="person-circle" size={30} color="#007AFF" />
                </View>
              </Marker>
            )}

            {/* Hospital markers */}
            {hospitals.map((hospital) => (
              <Marker
                key={hospital.id}
                coordinate={{
                  latitude: hospital.latitude,
                  longitude: hospital.longitude,
                }}
                title={hospital.name}
                description={`${hospital.type} - ${hospital.distance}km away`}
                onPress={() => handleHospitalPress(hospital)}
              >
                <View style={[
                  styles.hospitalMarker,
                  { backgroundColor: hospital.type === 'hospital' ? '#FF6B6B' : '#4ECDC4' }
                ]}>
                  <Ionicons 
                    name={getMarkerIcon(hospital.type)} 
                    size={20} 
                    color="white" 
                  />
                </View>
              </Marker>
            ))}

            {/* User to Hospital Route */}
            {showRoute && routePoints.length > 0 && (
              <Polyline
                coordinates={routePoints}
                strokeColor="#007AFF"
                strokeWidth={4}
                lineDashPattern={[5, 5]}
              />
            )}

            {/* Ambulance Route */}
            {showAmbulanceRoute && ambulanceRoutePoints.length > 0 && (
              <Polyline
                coordinates={ambulanceRoutePoints}
                strokeColor="#28a745" // Green color
                strokeWidth={5}
                lineDashPattern={[10, 5]}
              />
            )}

            {/* Patient Location Marker */}
            {ambulanceRequest && (
              <Marker
                coordinate={{ latitude: ambulanceRequest.latitude, longitude: ambulanceRequest.longitude }}
                title="Patient Location"
                description={`Emergency: ${ambulanceRequest.patientName}`}
              >
                <View style={styles.patientLocationMarker}>
                  <Ionicons name="medical" size={20} color="#dc3545" />
                </View>
              </Marker>
            )}
          </MapView>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.legendText}>Hospitals</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4ECDC4' }]} />
              <Text style={styles.legendText}>Medical Clinics</Text>
            </View>
            {showRoute && (
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
                <Text style={styles.legendText}>Route to {selectedHospital?.name}</Text>
              </View>
            )}
            {showAmbulanceRoute && (
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#28a745' }]} />
                <Text style={styles.legendText}>Ambulance Route to {ambulanceRequest?.patientName}</Text>
              </View>
            )}
          </View>

          {/* Clear Route Button */}
          {showRoute && (
            <TouchableOpacity
              style={styles.clearRouteButton}
              onPress={clearRoute}
            >
              <Ionicons name="close-circle" size={20} color="white" />
              <Text style={styles.clearRouteButtonText}>Clear Route</Text>
            </TouchableOpacity>
          )}
          
          {/* Clear Ambulance Route Button */}
          {showAmbulanceRoute && (
            <TouchableOpacity
              style={styles.clearAmbulanceRouteButton}
              onPress={clearAmbulanceRoute}
            >
              <Ionicons name="close-circle" size={20} color="white" />
              <Text style={styles.clearRouteButtonText}>Clear Ambulance Route</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.listViewContainer}>
          {/* Search and Filter Section */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput style={styles.searchInput} placeholder="Search hospitals..." value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            <TouchableOpacity style={styles.filterToggleButton} onPress={toggleFilters}>
              <Ionicons name="filter" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>

          {/* Filter Section */}
          {showFilters && (
            <View style={styles.filterContainer}>
              <Text style={styles.filterTitle}>Filter by Type</Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedFilter === 'all' && styles.filterButtonActive,
                    { borderColor: getFilterColor('all') }
                  ]}
                  onPress={() => handleFilterChange('all')}
                >
                  <Ionicons
                    name="grid"
                    size={16}
                    color={selectedFilter === 'all' ? 'white' : getFilterColor('all')}
                  />
                  <Text style={[
                    styles.filterButtonText,
                    selectedFilter === 'all' && styles.filterButtonTextActive
                  ]}>
                    All ({getFilterCount('all')})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedFilter === 'hospital' && styles.filterButtonActive,
                    { borderColor: getFilterColor('hospital') }
                  ]}
                  onPress={() => handleFilterChange('hospital')}
                >
                  <Ionicons
                    name="medical"
                    size={16}
                    color={selectedFilter === 'hospital' ? 'white' : getFilterColor('hospital')}
                  />
                  <Text style={[
                    styles.filterButtonText,
                    selectedFilter === 'hospital' && styles.filterButtonTextActive
                  ]}>
                    Hospitals ({getFilterCount('hospital')})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    selectedFilter === 'clinic' && styles.filterButtonActive,
                    { borderColor: getFilterColor('clinic') }
                  ]}
                  onPress={() => handleFilterChange('clinic')}
                >
                  <Ionicons
                    name="medical-outline"
                    size={16}
                    color={selectedFilter === 'clinic' ? 'white' : getFilterColor('clinic')}
                  />
                  <Text style={[
                    styles.filterButtonText,
                    selectedFilter === 'clinic' && styles.filterButtonTextActive
                  ]}>
                    Clinics ({getFilterCount('clinic')})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <FlatList
            data={filteredHospitals}
            renderItem={renderHospitalItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#FF6B6B']}
                tintColor="#FF6B6B"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="medical-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No medical facilities found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/user-ambulance-request')}
      >
        <Ionicons name="medical" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  listViewContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FF6B6B',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  ambulanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  ambulanceButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#FF6B6B',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
  },
  clearRouteButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dc3545',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  clearAmbulanceRouteButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  clearRouteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  userLocationMarker: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  hospitalMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  patientLocationMarker: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 8,
    borderWidth: 3,
    borderColor: '#dc3545',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterToggleButton: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
  },
  filterContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 8,
  },
  filterButtonActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  hospitalItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  hospitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  hospitalType: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  hospitalDistance: {
    alignItems: 'flex-end',
  },
  distanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  hospitalAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  hospitalPhone: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 4,
  },
  hospitalRating: {
    fontSize: 14,
    color: '#FFD700',
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  callButton: {
    backgroundColor: '#28a745',
  },
  directionsButton: {
    backgroundColor: '#007AFF',
  },
  routeButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

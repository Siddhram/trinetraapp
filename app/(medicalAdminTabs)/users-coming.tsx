import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import FirebaseService, { UserRoute } from '../../lib/firebaseService';

const getStatusColor = (status: UserRoute['status']) => {
  switch (status) {
    case 'active': return '#28a745';
    case 'completed': return '#6c757d';
    case 'cancelled': return '#dc3545';
    default: return '#6c757d';
  }
};

const getStatusIcon = (status: UserRoute['status']) => {
  switch (status) {
    case 'active': return 'navigate';
    case 'completed': return 'checkmark-circle';
    case 'cancelled': return 'close-circle';
    default: return 'help-circle';
  }
};

const getStatusText = (status: UserRoute['status']) => {
  switch (status) {
    case 'active': return 'En Route';
    case 'completed': return 'Arrived';
    case 'cancelled': return 'Cancelled';
    default: return 'Unknown';
  }
};

const getHospitalTypeIcon = (type: UserRoute['hospitalType']) => {
  switch (type) {
    case 'hospital': return 'medical';
    case 'clinic': return 'medical-outline';
    case 'medical': return 'medical';
    default: return 'location';
  }
};

const getHospitalTypeColor = (type: UserRoute['hospitalType']) => {
  switch (type) {
    case 'hospital': return '#FF6B6B';
    case 'clinic': return '#4ECDC4';
    case 'medical': return '#FF6B6B';
    default: return '#95A5A6';
  }
};

export default function UsersComingScreen() {
  const [routes, setRoutes] = useState<UserRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    loadRoutes();
    const unsubscribe = FirebaseService.subscribeToUserRoutes(setRoutes);
    return unsubscribe;
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const data = await FirebaseService.getUserRoutes();
      setRoutes(data);
    } catch (error) {
      console.error('Error loading user routes:', error);
      Alert.alert('Error', 'Failed to load user routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutes();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (routeId: string, newStatus: UserRoute['status']) => {
    try {
      await FirebaseService.updateUserRouteStatus(routeId, newStatus);
      Alert.alert('Success', `Route status updated to ${getStatusText(newStatus)}`);
    } catch (error) {
      console.error('Error updating route status:', error);
      Alert.alert('Error', 'Failed to update route status. Please try again.');
    }
  };

  const handleShowRoute = (route: UserRoute) => {
    // Navigate to a map view showing the route
    // This could be implemented to show the route on a map
    Alert.alert(
      'Route Details',
      `From: ${route.startLatitude.toFixed(4)}, ${route.startLongitude.toFixed(4)}\n` +
      `To: ${route.endLatitude.toFixed(4)}, ${route.endLongitude.toFixed(4)}\n` +
      `Distance: ${route.distance.toFixed(1)} km\n` +
      `ETA: ${route.estimatedTime} minutes`
    );
  };

  const filteredRoutes = selectedFilter === 'all' 
    ? routes 
    : routes.filter(route => route.status === selectedFilter);

  const renderRouteItem = ({ item }: { item: UserRoute }) => (
    <View style={styles.routeItem}>
             {/* Header with user info and status */}
       <View style={styles.routeHeader}>
         <View style={styles.userInfo}>
           <Text style={styles.userName}>{item.userName}</Text>
           <Text style={styles.userContact}>{item.userPhone} • {item.userEmail}</Text>
           <Text style={styles.userDetails}>
             Aadhaar: {item.userAadhaar} • Role: {item.userRole} • {item.userRelationship}
           </Text>
           <Text style={styles.userDetails}>
             Status: {item.userIsActive ? 'Active' : 'Inactive'} • Family Members: {item.userFamilyMembers?.length || 0}
           </Text>
         </View>
         <View style={[
           styles.statusBadge,
           { backgroundColor: getStatusColor(item.status) }
         ]}>
           <Ionicons 
             name={getStatusIcon(item.status)} 
             size={16} 
             color="white" 
           />
           <Text style={styles.statusText}>
             {getStatusText(item.status)}
           </Text>
         </View>
       </View>

      {/* Hospital Information */}
      <View style={styles.hospitalInfo}>
        <View style={styles.hospitalHeader}>
          <View style={[
            styles.hospitalTypeBadge,
            { backgroundColor: getHospitalTypeColor(item.hospitalType) }
          ]}>
            <Ionicons 
              name={getHospitalTypeIcon(item.hospitalType)} 
              size={16} 
              color="white" 
            />
            <Text style={styles.hospitalTypeText}>
              {item.hospitalType.charAt(0).toUpperCase() + item.hospitalType.slice(1)}
            </Text>
          </View>
          <Text style={styles.hospitalName}>{item.hospitalName}</Text>
        </View>
      </View>

             {/* Route Details */}
       <View style={styles.routeDetails}>
         <View style={styles.routePoint}>
           <Ionicons name="location" size={16} color="#28a745" />
           <Text style={styles.routePointText}>
             Start: {item.startLatitude.toFixed(4)}, {item.startLongitude.toFixed(4)}
           </Text>
         </View>
         <View style={styles.routePoint}>
           <Ionicons name="location" size={16} color="#dc3545" />
           <Text style={styles.routePointText}>
             Destination: {item.endLatitude.toFixed(4)}, {item.endLongitude.toFixed(4)}
           </Text>
         </View>
         <View style={styles.routePoint}>
           <Ionicons name="map-outline" size={16} color="#007AFF" />
           <Text style={styles.routePointText}>
             Route Points: {item.routePoints.length} waypoints
           </Text>
         </View>
       </View>

             {/* Distance and Time */}
       <View style={styles.metricsContainer}>
         <View style={styles.metric}>
           <Ionicons name="map" size={16} color="#007AFF" />
           <Text style={styles.metricText}>
             {item.distance.toFixed(1)} km
           </Text>
         </View>
         <View style={styles.metric}>
           <Ionicons name="time" size={16} color="#FF6B6B" />
           <Text style={styles.metricText}>
             {item.estimatedTime} min
           </Text>
         </View>
         <View style={styles.metric}>
           <Ionicons name="calendar" size={16} color="#6c757d" />
           <Text style={styles.metricText}>
             {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Today'}
           </Text>
         </View>
       </View>

       {/* User Registration Info */}
       <View style={styles.userRegistrationInfo}>
         <View style={styles.registrationItem}>
           <Ionicons name="person-add" size={14} color="#666" />
           <Text style={styles.registrationText}>
             Registered: {item.userCreatedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
           </Text>
         </View>
         <View style={styles.registrationItem}>
           <Ionicons name="time" size={14} color="#666" />
           <Text style={styles.registrationText}>
             Last Seen: {item.userLastSeen?.toDate?.()?.toLocaleDateString() || 'Unknown'}
           </Text>
         </View>
       </View>

       {/* Family Members Info */}
       {item.userFamilyMembers && item.userFamilyMembers.length > 0 && (
         <View style={styles.familyMembersInfo}>
           <Ionicons name="people" size={16} color="#007AFF" />
           <Text style={styles.familyMembersText}>
             Family Members: {item.userFamilyMembers.length} connected
           </Text>
         </View>
       )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewRouteButton]}
          onPress={() => handleShowRoute(item)}
        >
          <Ionicons name="map" size={16} color="white" />
          <Text style={styles.actionButtonText}>View Route</Text>
        </TouchableOpacity>

        {item.status === 'active' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleUpdateStatus(item.id!, 'completed')}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.actionButtonText}>Mark Arrived</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleUpdateStatus(item.id!, 'cancelled')}
            >
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {item.status === 'completed' && (
          <View style={styles.completedInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#28a745" />
            <Text style={styles.completedText}>
              Arrived at {item.completedAt?.toDate?.()?.toLocaleTimeString() || 'recently'}
            </Text>
          </View>
        )}

        {item.status === 'cancelled' && (
          <View style={styles.cancelledInfo}>
            <Ionicons name="close-circle" size={16} color="#dc3545" />
            <Text style={styles.cancelledText}>
              Cancelled at {item.cancelledAt?.toDate?.()?.toLocaleTimeString() || 'recently'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Users Coming to Hospitals</Text>
          <Text style={styles.headerSubtitle}>Track user routes and arrivals</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading user routes...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users Coming to Hospitals</Text>
        <Text style={styles.headerSubtitle}>Track user routes and arrivals</Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'all' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === 'all' && styles.filterButtonTextActive
            ]}>
              All ({routes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'active' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('active')}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === 'active' && styles.filterButtonTextActive
            ]}>
              En Route ({routes.filter(r => r.status === 'active').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'completed' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('completed')}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === 'completed' && styles.filterButtonTextActive
            ]}>
              Arrived ({routes.filter(r => r.status === 'completed').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'cancelled' && styles.filterButtonActive
            ]}
            onPress={() => setSelectedFilter('cancelled')}
          >
            <Text style={[
              styles.filterButtonText,
              selectedFilter === 'cancelled' && styles.filterButtonTextActive
            ]}>
              Cancelled ({routes.filter(r => r.status === 'cancelled').length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Routes List */}
      <FlatList
        data={filteredRoutes}
        renderItem={renderRouteItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
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
            <Ionicons name="navigate-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No user routes found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter === 'all' 
                ? 'Users will appear here when they request routes to hospitals'
                : `No ${selectedFilter} routes found`
              }
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#FF6B6B',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
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
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  routeItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userContact: {
    fontSize: 14,
    color: '#666',
  },
  userDetails: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  hospitalInfo: {
    marginBottom: 16,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hospitalTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  hospitalTypeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  routeDetails: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  routePointText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  metric: {
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  userRegistrationInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  registrationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  registrationText: {
    fontSize: 12,
    color: '#666',
  },
  familyMembersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    gap: 8,
  },
  familyMembersText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  viewRouteButton: {
    backgroundColor: '#007AFF',
  },
  completeButton: {
    backgroundColor: '#28a745',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  completedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#d4edda',
    borderRadius: 8,
  },
  completedText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '500',
  },
  cancelledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8d7da',
    borderRadius: 8,
  },
  cancelledText: {
    fontSize: 14,
    color: '#721c24',
    fontWeight: '500',
  },
});

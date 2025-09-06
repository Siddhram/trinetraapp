import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import FirebaseService, { AmbulanceRequest } from '../../lib/firebaseService';
import NotificationService from '../../lib/notificationService';

const getStatusColor = (status: AmbulanceRequest['status']) => {
  switch (status) {
    case 'pending': return '#ffc107';
    case 'accepted': return '#28a745';
    case 'completed': return '#6c757d';
    case 'cancelled': return '#dc3545';
    default: return '#6c757d';
  }
};

const getStatusIcon = (status: AmbulanceRequest['status']) => {
  switch (status) {
    case 'pending': return 'time';
    case 'accepted': return 'checkmark-circle';
    case 'completed': return 'checkmark-done-circle';
    case 'cancelled': return 'close-circle';
    default: return 'help-circle';
  }
};

const getStatusMessage = (status: AmbulanceRequest['status']) => {
  switch (status) {
    case 'pending': return 'Your request is being processed. Please wait for a medical admin to accept it.';
    case 'accepted': return 'Your request has been accepted! An ambulance is on the way.';
    case 'completed': return 'Your request has been completed. Thank you for using our service.';
    case 'cancelled': return 'Your request has been cancelled.';
    default: return 'Unknown status';
  }
};

export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadRequests();
    const unsubscribe = FirebaseService.subscribeToAmbulanceRequests(setRequests);
    return unsubscribe;
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await FirebaseService.getAmbulanceRequests();
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  const handleShowRoute = async (request: AmbulanceRequest) => {
    if (request.status === 'accepted' && request.latitude && request.longitude) {
      // Send notification that ambulance is arriving
      try {
        await NotificationService.sendAmbulanceArrivingNotification({
          type: 'ambulance_arriving',
          userName: request.patientName,
          hospitalName: request.hospitalName || 'Medical Facility',
          timestamp: new Date().toISOString(),
          priority: 'high'
        });
        console.log('✅ Ambulance arriving notification sent successfully');
      } catch (notificationError) {
        console.error('❌ Error sending ambulance arriving notification:', notificationError);
        // Don't fail the main operation if notification fails
      }

      // Navigate to the user's medical tab with route parameters
      router.push({
        pathname: '/(tabs)/medical',
        params: {
          showAmbulanceRoute: 'true',
          requestId: request.id,
          patientLat: request.latitude?.toString(),
          patientLng: request.longitude?.toString(),
          patientName: request.patientName
        }
      });
    }
  };

  const renderRequestItem = ({ item }: { item: AmbulanceRequest }) => (
    <View style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{item.patientName}</Text>
          <Text style={styles.patientPhone}>{item.patientPhone}</Text>
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
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.statusMessage}>
        <Ionicons name="information-circle" size={16} color="#007AFF" />
        <Text style={styles.statusMessageText}>
          {getStatusMessage(item.status)}
        </Text>
      </View>

      <View style={styles.emergencyInfo}>
        <View style={styles.emergencyType}>
          <Ionicons name="medical" size={16} color="#dc3545" />
          <Text style={styles.emergencyTypeText}>{item.emergencyType}</Text>
        </View>
        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}
      </View>

      <View style={styles.locationInfo}>
        <Ionicons name="location" size={16} color="#666" />
        <Text style={styles.locationText}>
          {item.patientAddress || `${item.latitude ? item.latitude.toFixed(4) : '0.0000'}, ${item.longitude ? item.longitude.toFixed(4) : '0.0000'}`}
        </Text>
      </View>

      {item.status === 'accepted' && item.hospitalName && (
        <View style={styles.hospitalInfo}>
          <Ionicons name="business" size={16} color="#28a745" />
          <Text style={styles.hospitalText}>
            Accepted by: {item.hospitalName}
          </Text>
          {item.estimatedTime && (
            <Text style={styles.timeText}>
              ETA: {item.estimatedTime} minutes
            </Text>
          )}
          {item.distance && (
            <Text style={styles.distanceText}>
              Distance: {item.distance ? item.distance.toFixed(1) : '0.0'} km
            </Text>
          )}
        </View>
      )}

      <View style={styles.actionButtons}>
        {item.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.routeButton]}
            onPress={() => handleShowRoute(item)}
          >
            <Ionicons name="map" size={16} color="white" />
            <Text style={styles.actionButtonText}>Show Ambulance Route</Text>
          </TouchableOpacity>
        )}

        <View style={styles.timestamp}>
          <Ionicons name="time" size={14} color="#999" />
          <Text style={styles.timestampText}>
            {item.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>My Requests</Text>
            <Text style={styles.headerSubtitle}>Track your emergency requests</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="medical" size={18} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
          <Text style={styles.loadingText}>Loading your requests...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Requests</Text>
          <Text style={styles.headerSubtitle}>Track your emergency requests</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="medical" size={18} color="#FFFFFF" />
        </View>
      </View>

      {/* Request New Ambulance Button */}
      <View style={styles.newRequestContainer}>
        <TouchableOpacity
          style={styles.newRequestButton}
          onPress={() => router.push('/user-ambulance-request')}
        >
          <Ionicons name="add" size={18} color="white" />
          <Text style={styles.newRequestButtonText}>Request New Ambulance</Text>
        </TouchableOpacity>
      </View>

      {/* Ambulance Requests List */}
      <FlatList
        data={requests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id || Math.random().toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF8C00']}
            tintColor="#FF8C00"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="medical-outline" size={64} color="#FF8C00" />
            <Text style={styles.emptyText}>No ambulance requests found</Text>
            <Text style={styles.emptySubtext}>
              Tap the button above to request an ambulance
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FF8C00',
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
    zIndex: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 1,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  headerIcon: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  newRequestContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newRequestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8C00',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newRequestButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
    color: '#666666',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#000000',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  requestItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientInfo: {
    flex: 1,
    marginRight: 10,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  patientPhone: {
    fontSize: 14,
    color: '#666666',
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
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    fontWeight: '500',
  },
  emergencyInfo: {
    marginBottom: 12,
  },
  emergencyType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  emergencyTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666666',
  },
  hospitalInfo: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  hospitalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
    marginLeft: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 24,
    marginTop: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#666666',
    marginLeft: 24,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  routeButton: {
    backgroundColor: '#FF8C00',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  timestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
  },
});

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
import FirebaseService, { AmbulanceRequest } from '../../lib/firebaseService';

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

export default function MedicalAdminAmbulanceRequests() {
  const [requests, setRequests] = useState<AmbulanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'completed'>('all');

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

  const handleAcceptRequest = async (request: AmbulanceRequest) => {
    if (!request.id) return;

    Alert.alert(
      'Accept Request',
      `Accept ambulance request for ${request.patientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              // Calculate distance and estimated time (simplified)
              const distance = 5.2; // This would be calculated from actual coordinates
              const estimatedTime = Math.round(distance * 2 + Math.random() * 10); // 2 min/km + random
              
              await FirebaseService.acceptAmbulanceRequest(
                request.id!,
                'hospital_001', // This would come from actual hospital data
                'City General Hospital',
                estimatedTime,
                distance
              );
              
              Alert.alert('Success', 'Request accepted successfully!');
            } catch (error) {
              console.error('Error accepting request:', error);
              Alert.alert('Error', 'Failed to accept request. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleCompleteRequest = async (request: AmbulanceRequest) => {
    if (!request.id) return;

    Alert.alert(
      'Complete Request',
      `Mark request for ${request.patientName} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await FirebaseService.completeAmbulanceRequest(request.id!);
              Alert.alert('Success', 'Request marked as completed!');
            } catch (error) {
              console.error('Error completing request:', error);
              Alert.alert('Error', 'Failed to complete request. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleCancelRequest = async (request: AmbulanceRequest) => {
    if (!request.id) return;

    Alert.alert(
      'Cancel Request',
      `Cancel ambulance request for ${request.patientName}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await FirebaseService.cancelAmbulanceRequest(request.id!);
              Alert.alert('Success', 'Request cancelled successfully!');
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request. Please try again.');
            }
          }
        }
      ]
    );
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

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
        {item.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAcceptRequest(item)}
          >
            <Ionicons name="checkmark" size={16} color="white" />
            <Text style={styles.actionButtonText}>Accept</Text>
          </TouchableOpacity>
        )}

        {item.status === 'accepted' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.completeButton]}
            onPress={() => handleCompleteRequest(item)}
          >
            <Ionicons name="checkmark-done" size={16} color="white" />
            <Text style={styles.actionButtonText}>Complete</Text>
          </TouchableOpacity>
        )}

        {item.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => handleCancelRequest(item)}
          >
            <Ionicons name="close" size={16} color="white" />
            <Text style={styles.actionButtonText}>Cancel</Text>
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
          <Text style={styles.headerTitle}>Ambulance Requests</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading ambulance requests...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ambulance Requests</Text>
        <Text style={styles.headerSubtitle}>Manage emergency ambulance requests</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'pending', 'accepted', 'completed'] as const).map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[
                styles.filterButton,
                filter === filterType && styles.filterButtonActive
              ]}
              onPress={() => setFilter(filterType)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === filterType && styles.filterButtonTextActive
              ]}>
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                {filterType !== 'all' && ` (${requests.filter(r => r.status === filterType).length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Ambulance Requests List */}
      <FlatList
        data={filteredRequests}
        renderItem={renderRequestItem}
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
            <Ionicons name="medical-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No ambulance requests found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' ? 'New requests will appear here when submitted' : `No ${filter} requests found`}
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterScroll: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#f8f9fa',
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
  requestItem: {
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
    color: '#333',
    marginBottom: 4,
  },
  patientPhone: {
    fontSize: 14,
    color: '#666',
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
    color: '#dc3545',
  },
  description: {
    fontSize: 14,
    color: '#666',
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
    color: '#666',
  },
  hospitalInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  hospitalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28a745',
    marginLeft: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 24,
    marginTop: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#666',
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
  acceptButton: {
    backgroundColor: '#28a745',
  },
  completeButton: {
    backgroundColor: '#6c757d',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
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

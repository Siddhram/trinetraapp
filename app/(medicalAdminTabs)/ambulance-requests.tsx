import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import FirebaseService, { AmbulanceRequest } from '../../lib/firebaseService';

const { width } = Dimensions.get('window');

const getStatusColor = (status: AmbulanceRequest['status']) => {
  switch (status) {
    case 'pending': return '#FFA500';
    case 'accepted': return '#20B2AA';
    case 'completed': return '#32CD32';
    case 'cancelled': return '#E74C3C';
    default: return '#7F8C8D';
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
    <View style={styles.requestCard}>
      {/* Patient Header */}
      <View style={styles.patientHeader}>
        <View style={styles.patientAvatar}>
          <Text style={styles.patientInitial}>
            {item.patientName?.charAt(0)?.toUpperCase() || 'P'}
          </Text>
        </View>
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
            size={14} 
            color="white" 
          />
          <Text style={styles.statusText}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Emergency Details */}
      <View style={styles.emergencySection}>
        <View style={styles.emergencyHeader}>
          <Ionicons name="medical" size={20} color="#E74C3C" />
          <Text style={styles.emergencyTypeText}>{item.emergencyType}</Text>
        </View>
        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}
      </View>

      {/* Location Info */}
      <View style={styles.locationSection}>
        <Ionicons name="location" size={16} color="#20B2AA" />
        <Text style={styles.locationText}>
          {item.patientAddress || `${item.latitude ? item.latitude.toFixed(4) : '0.0000'}, ${item.longitude ? item.longitude.toFixed(4) : '0.0000'}`}
        </Text>
      </View>

      {/* Hospital Info (if accepted) */}
      {item.status === 'accepted' && item.hospitalName && (
        <View style={styles.hospitalSection}>
          <View style={styles.hospitalHeader}>
            <Ionicons name="business" size={16} color="#20B2AA" />
            <Text style={styles.hospitalLabel}>Assigned Hospital</Text>
          </View>
          <Text style={styles.hospitalName}>{item.hospitalName}</Text>
          <View style={styles.hospitalDetails}>
            {item.estimatedTime && (
              <View style={styles.detailItem}>
                <Ionicons name="time" size={14} color="#7F8C8D" />
                <Text style={styles.detailText}>ETA: {item.estimatedTime} min</Text>
              </View>
            )}
            {item.distance && (
              <View style={styles.detailItem}>
                <Ionicons name="navigate" size={14} color="#7F8C8D" />
                <Text style={styles.detailText}>{item.distance.toFixed(1)} km</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionSection}>
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
        </View>
        
        <View style={styles.timestamp}>
          <Ionicons name="time" size={12} color="#7F8C8D" />
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
          <ActivityIndicator size="large" color="#20B2AA" />
          <Text style={styles.loadingText}>Loading ambulance requests...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Ambulance Requests</Text>
            <Text style={styles.headerSubtitle}>Emergency Response Management</Text>
          </View>
          <View style={styles.statusIndicator}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>LIVE</Text>
          </View>
        </View>
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
            colors={['#20B2AA']}
            tintColor="#20B2AA"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="medical-outline" size={48} color="#BDC3C7" />
            </View>
            <Text style={styles.emptyText}>No ambulance requests found</Text>
            <Text style={styles.emptySubtext}>
              {filter === 'all' ? 'New emergency requests will appear here' : `No ${filter} requests found`}
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
    backgroundColor: '#F0F8FF',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#20B2AA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#20B2AA',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterScroll: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#F0F8FF',
    borderWidth: 1,
    borderColor: '#E8F4FD',
  },
  filterButtonActive: {
    backgroundColor: '#20B2AA',
    borderColor: '#20B2AA',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7F8C8D',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    color: '#7F8C8D',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 20,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#20B2AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  patientInitial: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 2,
  },
  patientPhone: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  emergencySection: {
    marginBottom: 16,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emergencyTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E74C3C',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#7F8C8D',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#2C3E50',
    marginLeft: 8,
    flex: 1,
  },
  hospitalSection: {
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hospitalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20B2AA',
    marginLeft: 8,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
  },
  hospitalDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 4,
  },
  actionSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 6,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  acceptButton: {
    backgroundColor: '#20B2AA',
  },
  completeButton: {
    backgroundColor: '#32CD32',
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timestamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
});

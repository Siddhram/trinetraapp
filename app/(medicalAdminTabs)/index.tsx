import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FirebaseService, { AmbulanceRequest } from '../../lib/firebaseService';

export default function MedicalAdminDashboard() {
  const [ambulanceRequests, setAmbulanceRequests] = useState<AmbulanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    acceptedRequests: 0,
    completedRequests: 0
  });

  useEffect(() => {
    loadData();
    const unsubscribe = FirebaseService.subscribeToAmbulanceRequests(setAmbulanceRequests);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (ambulanceRequests.length > 0) {
      const newStats = {
        totalRequests: ambulanceRequests.length,
        pendingRequests: ambulanceRequests.filter(r => r.status === 'pending').length,
        acceptedRequests: ambulanceRequests.filter(r => r.status === 'accepted').length,
        completedRequests: ambulanceRequests.filter(r => r.status === 'completed').length
      };
      setStats(newStats);
    }
  }, [ambulanceRequests]);

  const loadData = async () => {
    try {
      setLoading(true);
      const requests = await FirebaseService.getAmbulanceRequests();
      setAmbulanceRequests(requests);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medical Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>Manage ambulance requests and hospital operations</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#FF6B6B' }]}>
              <Ionicons name="medical" size={24} color="white" />
              <Text style={styles.statNumber}>{stats.totalRequests}</Text>
              <Text style={styles.statLabel}>Total Requests</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#ffc107' }]}>
              <Ionicons name="time" size={24} color="white" />
              <Text style={styles.statNumber}>{stats.pendingRequests}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#28a745' }]}>
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text style={styles.statNumber}>{stats.acceptedRequests}</Text>
              <Text style={styles.statLabel}>Accepted</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#6c757d' }]}>
              <Ionicons name="checkmark-done-circle" size={24} color="white" />
              <Text style={styles.statNumber}>{stats.completedRequests}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="medical" size={32} color="#FF6B6B" />
              <Text style={styles.quickActionText}>Ambulance Requests</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="people" size={32} color="#28a745" />
              <Text style={styles.quickActionText}>Users Coming</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Requests */}
        <View style={styles.recentRequestsContainer}>
          <Text style={styles.sectionTitle}>Recent Ambulance Requests</Text>
          {ambulanceRequests.slice(0, 3).map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <Text style={styles.patientName}>{request.patientName}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(request.status) }
                ]}>
                  <Text style={styles.statusText}>
                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={styles.emergencyType}>{request.emergencyType}</Text>
              <Text style={styles.requestTime}>
                {request.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
              </Text>
            </View>
          ))}
          {ambulanceRequests.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No ambulance requests yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStatusColor = (status: AmbulanceRequest['status']) => {
  switch (status) {
    case 'pending': return '#ffc107';
    case 'accepted': return '#28a745';
    case 'completed': return '#6c757d';
    case 'cancelled': return '#dc3545';
    default: return '#6c757d';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  header: {
    backgroundColor: '#FF6B6B',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
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
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  quickActionsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  recentRequestsContainer: {
    marginBottom: 30,
  },
  requestCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  emergencyType: {
    fontSize: 14,
    color: '#dc3545',
    fontWeight: '600',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
});


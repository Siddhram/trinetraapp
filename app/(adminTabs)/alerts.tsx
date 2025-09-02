import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { AlertData, AlertStorage } from '../../lib/alertStorage';



export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const router = useRouter();

  // Load alerts from storage
  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const storedAlerts = await AlertStorage.getAllAlerts();
      setAlerts(storedAlerts);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      await AlertStorage.markAlertAsRead(alertId);
      setAlerts(prevAlerts =>
        prevAlerts.map(alert =>
          alert.id === alertId ? { ...alert, isRead: true } : alert
        )
      );
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await AlertStorage.markAllAlertsAsRead();
      setAlerts(prevAlerts =>
        prevAlerts.map(alert => ({ ...alert, isRead: true }))
      );
    } catch (error) {
      console.error('Failed to mark all alerts as read:', error);
    }
  };

  const clearAlert = async (alertId: string) => {
    Alert.alert(
      'Clear Alert',
      'Are you sure you want to clear this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AlertStorage.deleteAlert(alertId);
              setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
              if (selectedAlert?.id === alertId) {
                setShowModal(false);
                setSelectedAlert(null);
              }
            } catch (error) {
              console.error('Failed to clear alert:', error);
            }
          }
        }
      ]
    );
  };

  const clearAllAlerts = async () => {
    Alert.alert(
      'Clear All Alerts',
      'Are you sure you want to clear all alerts?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AlertStorage.clearAllAlerts();
              setAlerts([]);
              setShowModal(false);
              setSelectedAlert(null);
            } catch (error) {
              console.error('Failed to clear all alerts:', error);
            }
          }
        }
      ]
    );
  };

  const openAlertDetails = async (alert: AlertData) => {
    setSelectedAlert(alert);
    setShowModal(true);
    if (!alert.isRead) {
      await markAsRead(alert.id);
    }
  };

  const refreshAlerts = async () => {
    await loadAlerts();
  };

  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'low': return styles.priorityLow;
      case 'medium': return styles.priorityMedium;
      case 'high': return styles.priorityHigh;
      case 'critical': return styles.priorityCritical;
      default: return styles.priorityMedium;
    }
  };

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'active': return styles.statusActive;
      case 'resolved': return styles.statusResolved;
      case 'escalated': return styles.statusEscalated;
      default: return styles.statusActive;
    }
  };

  const getCrowdLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#F44336';
      case 'very_high': return '#9C27B0';
      default: return '#2196F3';
    }
  };

  const getCrowdLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low': return 'checkmark-circle';
      case 'medium': return 'warning';
      case 'high': return 'alert-circle';
      case 'very_high': return 'close-circle';
      default: return 'information-circle';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const unreadCount = alerts.filter(alert => !alert.isRead).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFA500" />
        </TouchableOpacity>
      <Text style={styles.title}>Alerts</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={refreshAlerts}>
            <Ionicons name="refresh" size={20} color="#FFA500" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={markAllAsRead}>
            <Ionicons name="checkmark-done" size={20} color="#FFA500" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={clearAllAlerts}>
            <Ionicons name="trash" size={20} color="#FFA500" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowFilters(!showFilters)}>
            <Ionicons name="filter" size={20} color="#FFA500" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/notificationSettings')}>
            <Ionicons name="settings" size={20} color="#FFA500" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{alerts.length}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{unreadCount}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {alerts.filter(a => a.priority === 'critical').length}
          </Text>
          <Text style={styles.statLabel}>Critical</Text>
        </View>
      </View>

      {showFilters && (
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filter Alerts</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Priority:</Text>
              <View style={styles.filterButtons}>
                {['all', 'low', 'medium', 'high', 'critical'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.filterButton,
                      filterPriority === priority && styles.filterButtonActive
                    ]}
                    onPress={() => setFilterPriority(priority)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      filterPriority === priority && styles.filterButtonTextActive
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Status:</Text>
              <View style={styles.filterButtons}>
                {['all', 'active', 'resolved', 'escalated'].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterButton,
                      filterStatus === status && styles.filterButtonActive
                    ]}
                    onPress={() => setFilterStatus(status)}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      filterStatus === status && styles.filterButtonTextActive
                    ]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>
      )}

      <ScrollView style={styles.alertsContainer}>
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No alerts yet</Text>
            <Text style={styles.emptySubtext}>Alerts will appear here when crowd analysis is performed</Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[styles.alertCard, !alert.isRead && styles.unreadAlert]}
              onPress={() => openAlertDetails(alert)}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertTypeContainer}>
                  <Ionicons 
                    name={getCrowdLevelIcon(alert.data.crowd_level)} 
                    size={24} 
                    color={getCrowdLevelColor(alert.data.crowd_level)} 
                  />
                  <Text style={styles.alertType}>Crowd Analysis</Text>
                  <View style={[styles.priorityBadge, getPriorityStyle(alert.priority)]}>
                    <Text style={styles.priorityText}>{alert.priority?.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.statusBadge, getStatusStyle(alert.status)]}>
                    <Text style={styles.statusText}>{alert.status?.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.alertActions}>
                  {!alert.isRead && (
                    <TouchableOpacity onPress={() => markAsRead(alert.id)}>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#FFA500" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => clearAlert(alert.id)}>
                    <Ionicons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.alertContent}>
                <View style={styles.crowdLevelRow}>
                  <Text style={styles.crowdLevelLabel}>Crowd Level:</Text>
                  <Text style={[styles.crowdLevelValue, { color: getCrowdLevelColor(alert.data.crowd_level) }]}>
                    {alert.data.crowd_level.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.peopleCount}>
                  Estimated People: {alert.data.estimated_people}
                </Text>
                <Text style={styles.riskLevel}>
                  Risk: {alert.data.harm_likelihood}
                </Text>
              </View>

              <View style={styles.alertFooter}>
                <Text style={styles.timestamp}>{formatTimestamp(alert.timestamp)}</Text>
                {!alert.isRead && <View style={styles.unreadDot} />}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Alert Details Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Alert Details</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedAlert && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailTitle}>Crowd Assessment</Text>
                  
                  <View style={styles.crowdLevelCard}>
                    <View style={styles.crowdLevelHeader}>
                      <Ionicons 
                        name={getCrowdLevelIcon(selectedAlert.data.crowd_level)} 
                        size={32} 
                        color={getCrowdLevelColor(selectedAlert.data.crowd_level)} 
                      />
                      <Text style={[styles.crowdLevelText, { color: getCrowdLevelColor(selectedAlert.data.crowd_level) }]}>
                        {selectedAlert.data.crowd_level.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.estimatedPeople}>
                      Estimated People: {selectedAlert.data.estimated_people}
                    </Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>Safety Recommendations</Text>
                    
                    <View style={styles.recommendationRow}>
                      <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
                      <Text style={styles.recommendationText}>
                        Police Required: {selectedAlert.data.police_required ? 'Yes' : 'No'}
                        {selectedAlert.data.police_required && ` (${selectedAlert.data.police_count} personnel)`}
                      </Text>
                    </View>

                    <View style={styles.recommendationRow}>
                      <Ionicons name="medical" size={20} color="#2196F3" />
                      <Text style={styles.recommendationText}>
                        Medical Required: {selectedAlert.data.medical_required ? 'Yes' : 'No'}
                        {selectedAlert.data.medical_required && ` (${selectedAlert.data.medical_staff_count} staff)`}
                      </Text>
                    </View>

                    <View style={styles.recommendationRow}>
                      <Ionicons 
                        name={selectedAlert.data.chokepoints_detected ? "warning" : "checkmark-circle"} 
                        size={20} 
                        color={selectedAlert.data.chokepoints_detected ? "#FF9800" : "#4CAF50"} 
                      />
                      <Text style={styles.recommendationText}>
                        Chokepoints: {selectedAlert.data.chokepoints_detected ? 'Detected' : 'None'}
                      </Text>
                    </View>

                    <View style={styles.recommendationRow}>
                      <Ionicons 
                        name={selectedAlert.data.emergency_access_clear ? "checkmark-circle" : "close-circle"} 
                        size={20} 
                        color={selectedAlert.data.emergency_access_clear ? "#4CAF50" : "#F44336"} 
                      />
                      <Text style={styles.recommendationText}>
                        Emergency Access: {selectedAlert.data.emergency_access_clear ? 'Clear' : 'Blocked'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>Activities Observed</Text>
                    <View style={styles.activitiesContainer}>
                                      {selectedAlert.data.activities.map((activity: string, index: number) => (
                  <View key={index} style={styles.activityTag}>
                    <Text style={styles.activityText}>{activity}</Text>
                  </View>
                ))}
                    </View>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>Risk Assessment</Text>
                    <Text style={styles.riskText}>
                      Harm Likelihood: {selectedAlert.data.harm_likelihood}
                    </Text>
                    {selectedAlert.data.notes && (
                      <Text style={styles.notesText}>
                        Notes: {selectedAlert.data.notes}
                      </Text>
                    )}
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailTitle}>Alert Information</Text>
                    <Text style={styles.infoText}>
                      Type: {selectedAlert.type.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.infoText}>
                      Time: {new Date(selectedAlert.timestamp).toLocaleString()}
                    </Text>
                    <Text style={styles.infoText}>
                      Status: {selectedAlert.isRead ? 'Read' : 'Unread'}
                    </Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.clearButton]} 
                onPress={() => selectedAlert && clearAlert(selectedAlert.id)}
              >
                <Text style={styles.clearButtonText}>Clear Alert</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFA500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFA500',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  alertsContainer: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
  alertCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  alertTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 10,
  },
  alertContent: {
    marginBottom: 10,
  },
  crowdLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  crowdLevelLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
  },
  crowdLevelValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  peopleCount: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  riskLevel: {
    fontSize: 14,
    color: '#666',
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFA500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    gap: 20,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  crowdLevelCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  crowdLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  crowdLevelText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  estimatedPeople: {
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
  },
  detailCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  recommendationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  activitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  activityTag: {
    backgroundColor: '#FFA500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activityText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  riskText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#FFA500',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  clearButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  filterSection: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  filterRow: {
    gap: 15,
  },
  filterItem: {
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#FFA500',
    borderColor: '#FFA500',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  priorityLow: {
    backgroundColor: '#4CAF50',
  },
  priorityMedium: {
    backgroundColor: '#FF9800',
  },
  priorityHigh: {
    backgroundColor: '#F44336',
  },
  priorityCritical: {
    backgroundColor: '#9C27B0',
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusActive: {
    backgroundColor: '#2196F3',
  },
  statusResolved: {
    backgroundColor: '#4CAF50',
  },
  statusEscalated: {
    backgroundColor: '#FF9800',
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

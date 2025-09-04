import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../lib/firebase';
import NotificationService from '../../lib/notificationService';

const { width } = Dimensions.get('window');

type FamilyNotification = {
  id: string;
  familyMemberId: string;
  familyMemberName: string;
  familyMemberEmail: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
  };
  distance: number;
  message: string;
  isRead: boolean;
};

export default function TabTwoScreen() {
  const [familyNotifications, setFamilyNotifications] = useState<FamilyNotification[]>([]);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (auth.currentUser) {
      fetchUserNotifications();
      
      // Set up real-time listener for notifications
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.notifications && Array.isArray(data.notifications)) {
            // Sort notifications by timestamp (recent first)
            const sortedNotifications = data.notifications.sort((a: FamilyNotification, b: FamilyNotification) => 
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            setFamilyNotifications(sortedNotifications);
          }
        }
      });
      
      // Setup notification listeners for this tab
      const notificationListeners = NotificationService.setupNotificationListeners();
      
      return () => {
        unsubscribe();
        NotificationService.removeNotificationListeners(notificationListeners);
      };
    }
  }, [auth.currentUser]);

  const fetchUserNotifications = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        
        if (data.notifications && Array.isArray(data.notifications)) {
          // Sort notifications by timestamp (recent first)
          const sortedNotifications = data.notifications.sort((a: FamilyNotification, b: FamilyNotification) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setFamilyNotifications(sortedNotifications);
        }
      }
    } catch (error) {
      console.error('Error fetching user notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      const updatedNotifications = familyNotifications.map(notification => 
        notification.id === notificationId 
          ? { ...notification, isRead: true }
          : notification
      );
      
      await updateDoc(userRef, { notifications: updatedNotifications });
      setFamilyNotifications(updatedNotifications);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const clearNotification = async (notificationId: string) => {
    try {
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      const updatedNotifications = familyNotifications.filter(notification => 
        notification.id !== notificationId
      );
      
      await updateDoc(userRef, { notifications: updatedNotifications });
      setFamilyNotifications(updatedNotifications);
      console.log(`🗑️ Cleared notification: ${notificationId}`);
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      
      // Clear all notifications from Firestore collection
      await updateDoc(userRef, { notifications: [] });
      
      // Clear local state
      setFamilyNotifications([]);
      
      // Also clear any distance alerts that might exist in the user's data
      // This ensures complete cleanup of all alert-related data
      await updateDoc(userRef, { 
        notifications: [],
        distanceAlerts: [] // Clear distance alerts if they exist
      });
      
      console.log('🗑️ Cleared ALL notifications and distance alerts from Firestore collection');
      
      // Show success message
      Alert.alert(
        'Success', 
        'All notifications and alerts have been completely cleared from the database!',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      Alert.alert(
        'Error', 
        'Failed to clear notifications. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const renderNotification = ({ item }: { item: FamilyNotification }) => (
    <View style={[styles.notificationCard, item.isRead && styles.notificationCardRead]}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationTitleContainer}>
          <View style={styles.familyIconContainer}>
            <Text style={styles.familyIcon}>👥</Text>
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.notificationTitle}>Family Alert</Text>
            {!item.isRead && <View style={styles.unreadIndicator} />}
          </View>
        </View>
        <Text style={styles.notificationTime}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      
      <Text style={styles.notificationMessage}>{item.message}</Text>
      
      <View style={styles.notificationDetails}>
        <View style={styles.notificationDetailRow}>
          <View style={styles.detailIconContainer}>
            <Text style={styles.detailIcon}>📍</Text>
          </View>
          <Text style={styles.notificationDetailText}>
            Distance: <Text style={styles.notificationDetailValue}>{item.distance.toFixed(2)} km</Text>
          </Text>
        </View>
        <View style={styles.notificationDetailRow}>
          <View style={styles.detailIconContainer}>
            <Text style={styles.detailIcon}>🌍</Text>
          </View>
          <Text style={styles.notificationDetailText}>
            Location: <Text style={styles.notificationDetailValue}>
              {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
            </Text>
          </Text>
        </View>
      </View>
      
      <View style={styles.notificationActions}>
        {!item.isRead && (
          <TouchableOpacity 
            style={styles.markReadButton}
            onPress={() => markNotificationAsRead(item.id)}
          >
            <Text style={styles.markReadButtonText}>Mark Read</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={() => clearNotification(item.id)}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Family Alerts</Text>
          <Text style={styles.headerSubtitle}>Stay connected with your family</Text>
        </View>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🔔</Text>
        </View>
      </View>

      {/* Notification Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>📊</Text>
          </View>
          <Text style={styles.statNumber}>{familyNotifications.length}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>🔴</Text>
          </View>
          <Text style={styles.statNumber}>
            {familyNotifications.filter(n => !n.isRead).length}
          </Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Text style={styles.statIcon}>📍</Text>
          </View>
          <Text style={styles.statNumber}>
            {familyNotifications.filter(n => n.distance >= 1).length}
          </Text>
          <Text style={styles.statLabel}>Far Away</Text>
        </View>
      </View>

      {/* Notifications List */}
      {familyNotifications.length > 0 ? (
        <FlatList
          data={familyNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          style={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notificationsContent}
        />
      ) : (
        <View style={styles.noNotificationsContainer}>
          <View style={styles.noNotificationsIcon}>
            <Text style={styles.noNotificationsIconText}>📱</Text>
          </View>
          <Text style={styles.noNotificationsText}>No Family Alerts Yet</Text>
          <Text style={styles.noNotificationsSubtext}>
            You'll receive notifications here when family members are far away (500m+)
          </Text>
          <View style={styles.noNotificationsInfo}>
            <Text style={styles.noNotificationsInfoText}>
              Tip: Make sure location sharing is enabled for all family members
            </Text>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      {familyNotifications.length > 0 && (
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => {
              const unreadCount = familyNotifications.filter(n => !n.isRead).length;
              if (unreadCount > 0) {
                Alert.alert(
                  'Mark All as Read',
                  `Mark ${unreadCount} unread notifications as read?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Mark All Read', 
                      style: 'default',
                      onPress: () => {
                        familyNotifications.forEach(notification => {
                          if (!notification.isRead) {
                            markNotificationAsRead(notification.id);
                          }
                        });
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('All Read', 'All notifications are already marked as read!');
              }
            }}
          >
            <Text style={styles.quickActionButtonText}>Mark All Read</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => {
              Alert.alert(
                'Clear All Notifications',
                'Are you sure you want to clear all notifications? This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Clear All', 
                    style: 'destructive',
                    onPress: clearAllNotifications
                  }
                ]
              );
            }}
          >
            <Text style={styles.quickActionButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  
  // Header
  header: {
    backgroundColor: '#FF8C00',
    paddingTop: 30,
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
  headerIconText: {
    fontSize: 14,
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 2,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#FFF3E0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 14,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '600',
  },
  
  // Notifications List
  notificationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationsContent: {
    paddingBottom: 20,
  },
  
  // No Notifications
  noNotificationsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  noNotificationsIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#FFE0B2',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  noNotificationsIconText: {
    fontSize: 40,
  },
  noNotificationsText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  noNotificationsSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  noNotificationsInfo: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  noNotificationsInfoText: {
    fontSize: 14,
    color: '#E65100',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Notification Cards
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  notificationCardRead: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    opacity: 0.9,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  notificationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  familyIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: '#FFF3E0',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  familyIcon: {
    fontSize: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    backgroundColor: '#FF8C00',
    borderRadius: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 22,
    fontWeight: '500',
  },
  notificationDetails: {
    marginBottom: 20,
  },
  notificationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailIcon: {
    fontSize: 14,
  },
  notificationDetailText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  notificationDetailValue: {
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  markReadButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  markReadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FF8C00',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../lib/firebase';

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
      
      return () => unsubscribe();
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
    } catch (error) {
      console.error('Error clearing notification:', error);
    }
  };

  const renderNotification = ({ item }: { item: FamilyNotification }) => (
    <View style={[styles.notificationCard, item.isRead && styles.notificationCardRead]}>
      <View style={styles.notificationHeader}>
        <View style={styles.notificationTitleContainer}>
          <Text style={styles.notificationTitle}>👨‍👩‍👧‍👦 Family Alert</Text>
          {!item.isRead && <View style={styles.unreadIndicator} />}
        </View>
        <Text style={styles.notificationTime}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
      
      <Text style={styles.notificationMessage}>{item.message}</Text>
      
      <View style={styles.notificationDetails}>
        <View style={styles.notificationDetailRow}>
          <Text style={styles.notificationDetailIcon}>📍</Text>
          <Text style={styles.notificationDetailText}>
            Distance: <Text style={styles.notificationDetailValue}>{item.distance.toFixed(2)} km</Text>
          </Text>
        </View>
        <View style={styles.notificationDetailRow}>
          <Text style={styles.notificationDetailIcon}>🌍</Text>
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
            <Text style={styles.markReadButtonText}>✓ Mark Read</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={() => clearNotification(item.id)}
        >
          <Text style={styles.clearButtonText}>🗑️ Clear</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>👨‍👩‍👧‍👦 Family Alerts</Text>
          <Text style={styles.headerSubtitle}>Stay connected with your family</Text>
        </View>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🔔</Text>
        </View>
      </View>

      {/* Notification Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{familyNotifications.length}</Text>
          <Text style={styles.statLabel}>Total Alerts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {familyNotifications.filter(n => !n.isRead).length}
          </Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statCard}>
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
              💡 Tip: Make sure location sharing is enabled for all family members
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
            <Text style={styles.quickActionButtonText}>✓ Mark All Read</Text>
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
                    onPress: () => {
                      familyNotifications.forEach(notification => {
                        clearNotification(notification.id);
                      });
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.quickActionButtonText}>🗑️ Clear All</Text>
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
    backgroundColor: '#f8f9fa',
  },
  
  // Header
  header: {
    backgroundColor: '#FF8C00',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  headerIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 28,
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFE0B2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  notificationCardRead: {
    borderColor: '#E0E0E0',
    backgroundColor: '#fafafa',
    opacity: 0.8,
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
    gap: 8,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  notificationDetails: {
    marginBottom: 16,
  },
  notificationDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notificationDetailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
    textAlign: 'center',
  },
  notificationDetailText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  notificationDetailValue: {
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  markReadButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  markReadButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // Quick Actions
  quickActionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: '#FF8C00',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

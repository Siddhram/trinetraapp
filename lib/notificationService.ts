import { Platform } from 'react-native';

// Try to import expo-notifications, but handle if it fails
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  
  // Configure notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.warn('expo-notifications not available:', error);
}

export interface NotificationData {
  familyMemberName: string;
  familyMemberId: string;
  distance: number;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Register for push notifications and get token
  public async registerForPushNotifications(): Promise<string | null> {
    let token = null;

    if (!Notifications) {
      console.warn('Notifications not available');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('family-alerts', {
        name: 'Family Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        description: 'Notifications for family member distance alerts',
      });
    }

    // Request permissions for notifications
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get permission for push notifications!');
      return null;
    }
    
    try {
      // For local notifications, we don't need the Expo push token
      console.log('Notification permissions granted - using local notifications');
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }

    return token;
  }

  // Send local notification for family alert
  public async sendFamilyAlertNotification(data: NotificationData): Promise<void> {
    if (!Notifications) {
      console.warn('Notifications not available - cannot send family alert');
      return;
    }
    
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 Family Alert',
          body: `${data.familyMemberName} is ${data.distance.toFixed(2)} km away from you!`,
          data: {
            familyMemberId: data.familyMemberId,
            familyMemberName: data.familyMemberName,
            distance: data.distance,
            location: data.location,
            timestamp: data.timestamp,
            type: 'family-alert',
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });

      console.log('Family alert notification sent with ID:', notificationId);
    } catch (error) {
      console.error('Error sending family alert notification:', error);
    }
  }

  // Send notification when family member comes back nearby
  public async sendFamilyNearbyNotification(familyMemberName: string): Promise<void> {
    if (!Notifications) {
      console.warn('Notifications not available - cannot send nearby notification');
      return;
    }
    
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Family Member Nearby',
          body: `${familyMemberName} is now close to you again!`,
          data: {
            familyMemberName,
            type: 'family-nearby',
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null,
      });

      console.log('Family nearby notification sent with ID:', notificationId);
    } catch (error) {
      console.error('Error sending family nearby notification:', error);
    }
  }

  // Get current push token
  public getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  // Clear all notifications
  public async clearAllNotifications(): Promise<void> {
    if (!Notifications) {
      console.warn('Notifications not available - cannot clear notifications');
      return;
    }
    
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  // Set up notification listeners
  public setupNotificationListeners(): {
    notificationListener: any;
    responseListener: any;
  } {
    const notificationListener = Notifications?.addNotificationReceivedListener((notification: any) => {
      console.log('Notification received:', notification);
      // Handle notification received while app is open
    });

    const responseListener = Notifications?.addNotificationResponseReceivedListener((response: any) => {
      console.log('Notification response:', response);
      // Handle user tapping on notification
      const data = response.notification.request.content.data;
      
      if (data.type === 'family-alert') {
        // Navigate to map or specific family member
        console.log('User tapped on family alert notification for:', data.familyMemberName);
      }
    });

    return { notificationListener, responseListener };
  }

  // Remove notification listeners
  public removeNotificationListeners(listeners: { notificationListener: any; responseListener: any }): void {
    if (!Notifications) {
      console.warn('Notifications not available - cannot remove listeners');
      return;
    }
    
    if (listeners.notificationListener) {
      Notifications.removeNotificationSubscription(listeners.notificationListener);
    }
    if (listeners.responseListener) {
      Notifications.removeNotificationSubscription(listeners.responseListener);
    }
  }
}

export default NotificationService.getInstance();

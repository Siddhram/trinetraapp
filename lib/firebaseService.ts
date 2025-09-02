import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { db } from './firebase';
import NotificationService from './notificationService';

export interface AmbulanceRequest {
  id?: string;
  patientName: string;
  patientPhone: string;
  patientAddress: string;
  emergencyType: string;
  description: string;
  latitude: number;
  longitude: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  hospitalId?: string;
  hospitalName?: string;
  ambulanceId?: string;
  ambulanceName?: string;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  completedAt?: Timestamp;
  estimatedTime?: number; // in minutes
  distance?: number; // in km
}

export interface AmbulanceCount {
  total: number;
  available: number;
  busy: number;
  offline: number;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
}

export interface UserRoute {
  id?: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  userAadhaar: string;
  userRole: string;
  userRelationship: string;
  userCreatedAt: Date | any;
  userLastSeen: Date | any;
  userIsActive: boolean;
  userFamilyMembers: string[];
  hospitalId: string;
  hospitalName: string;
  hospitalType: 'hospital' | 'medical' | 'clinic';
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  routePoints: RoutePoint[];
  distance: number;
  estimatedTime: number;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date | any;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
}

export class FirebaseService {
  // Get ambulance count
  static async getAmbulanceCount(): Promise<AmbulanceCount> {
    try {
      // This would typically come from a real ambulance tracking system
      // For now, returning mock data
      return {
        total: 25,
        available: 18,
        busy: 5,
        offline: 2
      };
    } catch (error) {
      console.error('Error getting ambulance count:', error);
      return {
        total: 0,
        available: 0,
        busy: 0,
        offline: 0
      };
    }
  }

  // Create new ambulance request
  static async createAmbulanceRequest(request: Omit<AmbulanceRequest, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'ambulanceRequests'), {
        ...request,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating ambulance request:', error);
      throw error;
    }
  }

  // Get all ambulance requests
  static async getAmbulanceRequests(): Promise<AmbulanceRequest[]> {
    try {
      const q = query(
        collection(db, 'ambulanceRequests'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AmbulanceRequest[];
    } catch (error) {
      console.error('Error getting ambulance requests:', error);
      return [];
    }
  }

  // Get ambulance requests by status
  static async getAmbulanceRequestsByStatus(status: AmbulanceRequest['status']): Promise<AmbulanceRequest[]> {
    try {
      const q = query(
        collection(db, 'ambulanceRequests'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AmbulanceRequest[];
    } catch (error) {
      console.error('Error getting ambulance requests by status:', error);
      return [];
    }
  }

  // Accept ambulance request
  static async acceptAmbulanceRequest(
    requestId: string, 
    hospitalId: string, 
    hospitalName: string,
    estimatedTime: number,
    distance: number
  ): Promise<void> {
    try {
      const requestRef = doc(db, 'ambulanceRequests', requestId);
      await updateDoc(requestRef, {
        status: 'accepted',
        hospitalId,
        hospitalName,
        acceptedAt: serverTimestamp(),
        estimatedTime,
        distance
      });

      // Send notification that ambulance request was accepted
      try {
        // Get the ambulance request to get patient details
        const requestDoc = await getDoc(requestRef);
        if (requestDoc.exists()) {
          const requestData = requestDoc.data() as AmbulanceRequest;
          
          await NotificationService.sendAmbulanceAcceptedNotification({
            type: 'ambulance_accepted',
            patientName: requestData.patientName,
            hospitalName: hospitalName,
            timestamp: new Date().toISOString(),
            priority: 'high'
          });
          
          console.log('✅ Ambulance acceptance notification sent successfully');
        }
      } catch (notificationError) {
        console.error('❌ Error sending ambulance acceptance notification:', notificationError);
        // Don't fail the main operation if notification fails
      }
    } catch (error) {
      console.error('Error accepting ambulance request:', error);
      throw error;
    }
  }

  // Complete ambulance request
  static async completeAmbulanceRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, 'ambulanceRequests', requestId);
      await updateDoc(requestRef, {
        status: 'completed',
        completedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error completing ambulance request:', error);
      throw error;
    }
  }

  // Cancel ambulance request
  static async cancelAmbulanceRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, 'ambulanceRequests', requestId);
      await updateDoc(requestRef, {
        status: 'cancelled'
      });
    } catch (error) {
      console.error('Error cancelling ambulance request:', error);
      throw error;
    }
  }

  // Listen to ambulance requests in real-time
  static subscribeToAmbulanceRequests(callback: (requests: AmbulanceRequest[]) => void) {
    const q = query(
      collection(db, 'ambulanceRequests'),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AmbulanceRequest[];
      callback(requests);
    });
  }

  // Calculate route between two points (simplified - would use Google Directions API in production)
  static calculateRoute(
    startLat: number, 
    startLng: number, 
    endLat: number, 
    endLng: number
  ): RoutePoint[] {
    // Simple straight line route - in production, use Google Directions API
    return [
      { latitude: startLat, longitude: startLng },
      { latitude: endLat, longitude: endLng }
    ];
  }

  // Create user route to hospital
  static async createUserRoute(route: Omit<UserRoute, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'userRoutes'), {
        ...route,
        status: 'active',
        createdAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating user route:', error);
      throw error;
    }
  }

  // Get all user routes
  static async getUserRoutes(): Promise<UserRoute[]> {
    try {
      const q = query(
        collection(db, 'userRoutes'),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRoute[];
    } catch (error) {
      console.error('Error getting user routes:', error);
      return [];
    }
  }

  // Get user routes by status
  static async getUserRoutesByStatus(status: UserRoute['status']): Promise<UserRoute[]> {
    try {
      const q = query(
        collection(db, 'userRoutes'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRoute[];
    } catch (error) {
      console.error('Error getting user routes by status:', error);
      return [];
    }
  }

  // Update user route status
  static async updateUserRouteStatus(routeId: string, status: UserRoute['status']): Promise<void> {
    try {
      const routeRef = doc(db, 'userRoutes', routeId);
      const updateData: any = { status };
      
      if (status === 'completed') {
        updateData.completedAt = serverTimestamp();
      } else if (status === 'cancelled') {
        updateData.cancelledAt = serverTimestamp();
      }
      
      await updateDoc(routeRef, updateData);
    } catch (error) {
      console.error('Error updating user route status:', error);
      throw error;
    }
  }

  // Listen to user routes in real-time
  static subscribeToUserRoutes(callback: (routes: UserRoute[]) => void) {
    const q = query(
      collection(db, 'userRoutes'),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const routes = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRoute[];
      callback(routes);
    });
  }

  // Get current user data from Firestore
  static async getCurrentUserData(userId: string) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting current user data:', error);
      return null;
    }
  }
}

export default FirebaseService;

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../lib/firebase';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('Just for you');
  const [searchQuery, setSearchQuery] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };


  const [onlineFamilyCount, setOnlineFamilyCount] = useState(0);

  useEffect(() => {
    fetchOnlineFamilyCount();
  }, []);

  const fetchOnlineFamilyCount = async () => {
    try {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const familyMembers = userData.familyMembers || [];
          // Count family members who are currently online (you can add online status logic here)
          setOnlineFamilyCount(familyMembers.length);
        }
      }
    } catch (error) {
      console.error('Error fetching family count:', error);
    }
  };

  const userServices = [
    { 
      id: 1, 
      name: 'Family Tracking', 
      description: 'Track family members', 
      image: '👨‍👩‍👧‍👦', 
      time: '24/7', 
      route: '/(tabs)/map',
      color: '#4CAF50'
    },
    { 
      id: 2, 
      name: 'Emergency Help', 
      description: 'Get immediate help', 
      image: '🚨', 
      time: '24/7', 
      route: '/(tabs)/medical',
      color: '#F44336'
    },
    { 
      id: 3, 
      name: 'Ambulance Request', 
      description: 'Request ambulance', 
      image: '🚑', 
      time: '24/7', 
      route: '/user-ambulance-request',
      color: '#FF9800'
    },
    { 
      id: 4, 
      name: 'Online Family', 
      description: `${onlineFamilyCount} members online`, 
      image: '👥', 
      time: 'Live', 
      route: '/(tabs)/explore',
      color: '#2196F3'
    },
    { 
      id: 5, 
      name: 'Family Alerts', 
      description: 'Family notifications', 
      image: '🔔', 
      time: 'Live', 
      route: '/(tabs)/explore',
      color: '#9C27B0'
    },
    { 
      id: 6, 
      name: 'Missing Person', 
      description: 'Find lost people', 
      image: '🔍', 
      time: 'Live', 
      route: '/(tabs)/missing-person',
      color: '#FF5722'
    },
    { 
      id: 7, 
      name: 'Trinetra', 
      description: 'AI assistance', 
      image: '🤖', 
      time: '24/7', 
      route: '/(tabs)/trinetra-webview',
      color: '#795548'
    },
    { 
      id: 8, 
      name: 'Emergency Offline', 
      description: '24/7 Emergency Service', 
      image: '🚨', 
      time: 'Live', 
      route: '/emergency-offline-service',
      color: '#E91E63'
    },
    { 
      id: 9, 
      name: 'Profile', 
      description: 'Manage your account', 
      image: '👤', 
      time: 'Settings', 
      route: '/profile',
      color: '#607D8B'
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header Section - Keep existing */}
      <View style={styles.header}>
        <View style={styles.locationSection}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText}>Sangam, Prayagraj</Text>
        </View>
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Greeting Section */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingLeft}>
            <View style={styles.profileImage}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.greetingText}>
              <Text style={styles.greetingName}>Hey, Devotee</Text>
              <Text style={styles.greetingTime}>{getGreeting()}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#999999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.filterButton}>
              <Ionicons name="options-outline" size={20} color="#999999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Promotional Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>Hurry Up! Get 20% off</Text>
            <Text style={styles.promoSubtitle}>Sacred Services Everyday</Text>
            <Text style={styles.promoBrand}>Mahakumbh 2025</Text>
            <TouchableOpacity style={styles.shopNowButton}>
              <Text style={styles.shopNowText}>Explore Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.promoImage}>
            <Text style={styles.promoEmoji}>ॐ
            </Text>
          </View>
        </View>


        {/* User Services Grid */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Services</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.servicesGrid}>
            {userServices.map((service) => (
              <TouchableOpacity 
                key={service.id} 
                style={styles.serviceCard}
                onPress={() => router.push(service.route as any)}
              >
                <View style={[styles.serviceIconContainer, { backgroundColor: service.color + '20' }]}>
                  <Text style={styles.serviceIcon}>{service.image}</Text>
                </View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
                <View style={styles.serviceFooter}>
                  <Text style={[styles.serviceTime, { color: service.color }]}>{service.time}</Text>
                  <Ionicons name="arrow-forward" size={16} color={service.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  // Keep existing header styles
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  locationSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  profileButton: {
    position: 'absolute',
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileIcon: {
    fontSize: 15,
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  // New greeting section
  greetingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginRight: 0,
  },
  greetingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  greetingText: {
    flex: 1,
  },
  greetingName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  greetingTime: {
    fontSize: 14,
    color: '#666666',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },
  // Search section
  searchSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#000000',
  },
  filterButton: {
    marginLeft: 12,
  },
  // Promotional banner
  promoBanner: {
    backgroundColor: '#FF8C00',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#FF8C00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  promoBrand: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  shopNowButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  shopNowText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  promoImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  promoEmoji: {
    color: '#FFFFFF',
    fontSize: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF8C00',
    fontWeight: '600',
  },
  // Services section
  servicesSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  serviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  serviceIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 4,
    textAlign: 'center',
  },
  serviceDescription: {
    fontSize: 12,
    color: '#7F8C8D',
    marginBottom: 12,
    textAlign: 'center',
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceTime: {
    fontSize: 12,
    fontWeight: '600',
  },
});
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header Section */}
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
        {/* Welcome Banner */}
        <View style={styles.welcomeBanner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>🕉️ Mahakumbh 2025</Text>
            <Text style={styles.bannerSubtitle}>Welcome to the Sacred Gathering</Text>
            <Text style={styles.bannerDescription}>Experience the divine at the world's largest spiritual event</Text>
          </View>
        </View>

        {/* Category Navigation */}
        <View style={styles.categorySection}>
          <Text style={styles.sectionTitle}>Sacred Services</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <View style={styles.categoryContainer}>
              <TouchableOpacity style={styles.categoryItem}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryEmoji}>🏛️</Text>
                </View>
                <Text style={styles.categoryText}>Ghats</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.categoryItem}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryEmoji}>🍽️</Text>
                </View>
                <Text style={styles.categoryText}>Food</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.categoryItem}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryEmoji}>🏥</Text>
                </View>
                <Text style={styles.categoryText}>Medical</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.categoryItem}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryEmoji}>🔍</Text>
                </View>
                <Text style={styles.categoryText}>Lost & Found</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.categoryItem}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryEmoji}>🚌</Text>
                </View>
                <Text style={styles.categoryText}>Transport</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.categoryItem}>
                <View style={styles.categoryIcon}>
                  <Text style={styles.categoryEmoji}>🏨</Text>
                </View>
                <Text style={styles.categoryText}>Accommodation</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Promotional Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoContent}>
            <Text style={styles.promoTitle}>🌟 Sacred Rituals Today</Text>
            <Text style={styles.promoSubtitle}>Join the morning aarti at 6:00 AM</Text>
            <Text style={styles.promoDescription}>Experience the divine sunrise ceremony at Sangam Ghat</Text>
          </View>
          <View style={styles.promoIcon}>
            <Text style={styles.promoEmoji}>🌅</Text>
          </View>
        </View>

        {/* Featured Events */}
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Sacred Events</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.eventScroll}>
            <View style={styles.eventContainer}>
              <TouchableOpacity style={styles.eventCard}>
                <View style={styles.eventImage}>
                  <Text style={styles.eventEmoji}>🕉️</Text>
                </View>
                <Text style={styles.eventPrice}>Free</Text>
                <Text style={styles.eventName}>Morning Aarti</Text>
                <Text style={styles.eventTime}>6:00 AM - 7:00 AM</Text>
                <TouchableOpacity style={styles.addButton}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.eventCard}>
                <View style={styles.eventImage}>
                  <Text style={styles.eventEmoji}>🙏</Text>
                </View>
                <Text style={styles.eventPrice}>Free</Text>
                <Text style={styles.eventName}>Sacred Bathing</Text>
                <Text style={styles.eventTime}>7:00 AM - 9:00 AM</Text>
                <TouchableOpacity style={styles.addButton}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.eventCard}>
                <View style={styles.eventImage}>
                  <Text style={styles.eventEmoji}>🕯️</Text>
                </View>
                <Text style={styles.eventPrice}>Free</Text>
                <Text style={styles.eventName}>Evening Puja</Text>
                <Text style={styles.eventTime}>6:00 PM - 7:00 PM</Text>
                <TouchableOpacity style={styles.addButton}>
                  <Text style={styles.addButtonText}>+</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Nearby Services */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Services</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceScroll}>
            <View style={styles.serviceContainer}>
              <TouchableOpacity style={styles.serviceCard}>
                <View style={styles.serviceLogo}>
                  <Text style={styles.serviceEmoji}>🏥</Text>
                </View>
                <Text style={styles.serviceName}>Medical Aid Center</Text>
                <Text style={styles.serviceDistance}>0.2 km away</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.serviceCard}>
                <View style={styles.serviceLogo}>
                  <Text style={styles.serviceEmoji}>🍽️</Text>
                </View>
                <Text style={styles.serviceName}>Langar Hall</Text>
                <Text style={styles.serviceDistance}>0.1 km away</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.serviceCard}>
                <View style={styles.serviceLogo}>
                  <Text style={styles.serviceEmoji}>🚌</Text>
                </View>
                <Text style={styles.serviceName}>Shuttle Service</Text>
                <Text style={styles.serviceDistance}>0.3 km away</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard}>
              <Text style={styles.quickActionEmoji}>🚨</Text>
              <Text style={styles.quickActionText}>Emergency</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionCard}>
              <Text style={styles.quickActionEmoji}>🔍</Text>
              <Text style={styles.quickActionText}>Find Person</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionCard}>
              <Text style={styles.quickActionEmoji}>📍</Text>
              <Text style={styles.quickActionText}>My Location</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionCard}>
              <Text style={styles.quickActionEmoji}>📞</Text>
              <Text style={styles.quickActionText}>Help Center</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
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
  dropdownIcon: {
    fontSize: 12,
    color: '#000000',
    marginLeft: 8,
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
  welcomeBanner: {
    backgroundColor: '#FF8C00',
    margin: 20,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#FF8C00',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  categorySection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  categoryScroll: {
    paddingLeft: 20,
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
  promoBanner: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  promoContent: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 14,
    color: '#FF8C00',
    fontWeight: '600',
    marginBottom: 4,
  },
  promoDescription: {
    fontSize: 12,
    color: '#666666',
  },
  promoIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  promoEmoji: {
    fontSize: 24,
  },
  featuredSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF8C00',
    fontWeight: '600',
  },
  eventScroll: {
    paddingLeft: 20,
  },
  eventContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  eventCard: {
    width: 160,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventImage: {
    width: '100%',
    height: 80,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventEmoji: {
    fontSize: 32,
  },
  eventPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginBottom: 4,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  servicesSection: {
    marginBottom: 24,
  },
  serviceScroll: {
    paddingLeft: 20,
  },
  serviceContainer: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  serviceCard: {
    width: 140,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceEmoji: {
    fontSize: 24,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 4,
  },
  serviceDistance: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  quickActionsSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

export default function CCTVScreen() {
  const router = useRouter();

  const cctvFeatures = [
    {
      id: 1,
      title: 'Crowd Detection',
      description: 'Monitor crowd density and detect overcrowding',
      icon: 'people',
      color: '#4CAF50',
      route: '/crowdDetection'
    },
    {
      id: 2,
      title: 'Face Detection Analysis',
      description: 'Advanced facial recognition and analysis',
      icon: 'person',
      color: '#2196F3',
      route: '/faceDetectionAnalysis'
    },
    {
      id: 3,
      title: 'Future Crowd Alert',
      description: 'Predictive crowd management system',
      icon: 'trending-up',
      color: '#9C27B0',
      route: '/futureCrowdAlert'
    },
    {
      id: 4,
      title: 'Anomaly Detection',
      description: 'Detect unusual behavior and suspicious activities',
      icon: 'warning',
      color: '#FF5722',
      route: '/unusual-detection'
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <View style={styles.cctvIconContainer}>
                <Ionicons name="videocam" size={32} color="#FF8C00" />
              </View>
              <View style={styles.titleTextContainer}>
                <Text style={styles.title}>CCTV Monitoring</Text>
                <Text style={styles.subtitle}>Surveillance & Security Center</Text>
              </View>
            </View>
            <View style={styles.statusIndicator}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>LIVE</Text>
            </View>
          </View>
        </View>

        {/* System Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewCard}>
              <View style={styles.overviewIcon}>
                <Ionicons name="eye" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.overviewValue}>24/7</Text>
              <Text style={styles.overviewLabel}>Monitoring</Text>
            </View>
            <View style={styles.overviewCard}>
              <View style={styles.overviewIcon}>
                <Ionicons name="shield-checkmark" size={24} color="#2196F3" />
              </View>
              <Text style={styles.overviewValue}>100%</Text>
              <Text style={styles.overviewLabel}>Coverage</Text>
            </View>
            <View style={styles.overviewCard}>
              <View style={styles.overviewIcon}>
                <Ionicons name="flash" size={24} color="#FF9800" />
              </View>
              <Text style={styles.overviewValue}>Real-time</Text>
              <Text style={styles.overviewLabel}>Alerts</Text>
            </View>
          </View>
        </View>

        {/* CCTV Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Surveillance Features</Text>
          <View style={styles.featuresGrid}>
            {cctvFeatures.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                style={styles.featureCard}
                onPress={() => router.push(feature.route)}
              >
                <View style={[styles.featureIcon, { backgroundColor: feature.color }]}>
                  <Ionicons name={feature.icon as any} size={28} color="#FFFFFF" />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </View>
                <View style={styles.featureArrow}>
                  <Ionicons name="chevron-forward" size={20} color="#666666" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="play" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>Start Recording</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="pause" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>Pause System</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="settings" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>System Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionCard}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="download" size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.quickActionText}>Export Data</Text>
            </TouchableOpacity>
          </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cctvIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  overviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 16,
    color: '#666666',
  },
  featureArrow: {
    marginLeft: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF8C00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
});

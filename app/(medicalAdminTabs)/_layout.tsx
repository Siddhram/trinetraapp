import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import TabBarBackground from '../../components/ui/TabBarBackground';

export default function MedicalAdminTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B6B',
        headerShown: false,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="ambulance-requests" options={{ title: 'Ambulance Requests' }} />
      <Tabs.Screen name="users-coming" options={{ title: 'Users Coming' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}



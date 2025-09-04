import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import TabBarBackground from '../../components/ui/TabBarBackground';
export default function AdminTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFA500',
        headerShown: false,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: { position: 'absolute' },
          default: {},
        }),
      }}>
      <Tabs.Screen name="index" options={{ title: 'CCTV' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts' }} />
      <Tabs.Screen name="missing" options={{ title: 'Missing' }} />
      <Tabs.Screen name="unusual-detection" options={{ title: 'Unusual' }} />
      <Tabs.Screen name="disaster" options={{ title: 'Disaster' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { Logo } from '@/components/ui/Logo';
import { color } from '@/theme/tokens';

const colors = color.light;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Fraunces_700Bold' },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium', fontSize: 12 },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: () => <Logo compact />,
          headerTitleAlign: 'left',
          tabBarIcon: ({ color: tint, size }) => <Ionicons name="home-outline" color={tint} size={size} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color: tint, size }) => <Ionicons name="search-outline" color={tint} size={size} />,
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ color: tint, size }) => <Ionicons name="school-outline" color={tint} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color: tint, size }) => <Ionicons name="gift-outline" color={tint} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color: tint, size }) => <Ionicons name="person-outline" color={tint} size={size} />,
        }}
      />
    </Tabs>
  );
}

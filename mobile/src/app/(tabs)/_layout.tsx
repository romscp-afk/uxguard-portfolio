import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/providers/AuthProvider';
import { color, radius, type } from '@/theme/tokens';

const colors = color.light;

function HeaderSignIn() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign in"
      onPress={() => router.push('/(auth)/login')}
      style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}
      hitSlop={8}>
      <Text style={styles.signInLabel}>Sign in</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { session } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: 'Fraunces_700Bold' },
        headerStyle: { backgroundColor: colors.surface },
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
          headerRight: session ? undefined : () => <HeaderSignIn />,
          headerRightContainerStyle: { paddingRight: 12 },
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

const styles = StyleSheet.create({
  signIn: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInLabel: { ...type.label, color: '#ffffff' },
  pressed: { opacity: 0.85 },
});

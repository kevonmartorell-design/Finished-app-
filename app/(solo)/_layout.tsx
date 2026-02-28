import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Tabs, router, usePathname } from 'expo-router';

// Simple icon component using text symbols (Agent 7 replaces with proper icons)
function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '⌂',
    calendar: '📅',
    users: '👥',
    dollar: '$',
    grid: '⋮⋮⋮',
  };
  return (
    <Text style={{ fontSize: 20, color: focused ? '#6000FF' : '#888' }}>
      {icons[name] || '•'}
    </Text>
  );
}

function SidebarNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Home', path: '/(solo)/', icon: '⌂' },
    { label: 'Bookings', path: '/(solo)/bookings/', icon: '📅' },
    { label: 'Clients', path: '/(solo)/clients/', icon: '👥' },
    { label: 'Finance', path: '/(solo)/finance/', icon: '$' },
    { label: 'Contracts', path: '/(solo)/contracts/', icon: '📄' },
    { label: 'AI Scheduler', path: '/(solo)/ai-scheduler', icon: '🤖' },
    { label: 'Messages', path: '/(shared)/messages/', icon: '💬' },
    { label: 'Notifications', path: '/(shared)/notifications', icon: '🔔' },
    { label: 'Settings', path: '/(shared)/settings/', icon: '⚙' },
  ];

  return (
    <View style={{ width: 240, backgroundColor: '#141420', borderRightWidth: 1, borderRightColor: '#2A2A3A', paddingTop: 20 }}>
      <Text style={{ color: '#FFFFFF', fontFamily: 'Orbitron', fontSize: 20, paddingHorizontal: 20, paddingBottom: 30 }}>
        AEGIS
      </Text>
      {navItems.map((item) => {
        const isActive = pathname === item.path || pathname.startsWith(item.path.replace(/\/$/, ''));
        return (
          <TouchableOpacity
            key={item.path}
            onPress={() => router.push(item.path as never)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
              backgroundColor: isActive ? 'rgba(96, 0, 255, 0.15)' : 'transparent',
              borderLeftWidth: isActive ? 3 : 0,
              borderLeftColor: '#6000FF',
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 12 }}>{item.icon}</Text>
            <Text style={{ color: isActive ? '#FFFFFF' : '#888', fontFamily: 'Roboto', fontSize: 14 }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MoreMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const menuItems = [
    { label: 'Contracts', path: '/(solo)/contracts/' },
    { label: 'AI Scheduler', path: '/(solo)/ai-scheduler' },
    { label: 'Messages', path: '/(shared)/messages/' },
    { label: 'Notifications', path: '/(shared)/notifications' },
    { label: 'Settings', path: '/(shared)/settings/' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose}>
        <Pressable
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1A1A2E', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={{ width: 40, height: 4, backgroundColor: '#444', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
          <ScrollView>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.path}
                onPress={() => {
                  onClose();
                  router.push(item.path as never);
                }}
                style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#2A2A3A' }}
              >
                <Text style={{ color: '#FFFFFF', fontFamily: 'Roboto', fontSize: 16 }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function SoloLayout() {
  const { width } = useWindowDimensions();
  const isWideScreen = width >= 768;
  const [moreVisible, setMoreVisible] = useState(false);

  // Web/tablet: sidebar layout
  if (isWideScreen) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: '#0D0D0D' }}>
        <SidebarNav />
        <View style={{ flex: 1 }}>
          <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
            <Tabs.Screen name="index" />
            <Tabs.Screen name="bookings" />
            <Tabs.Screen name="clients" />
            <Tabs.Screen name="finance" />
            <Tabs.Screen name="contracts" />
            <Tabs.Screen name="stripe-connect" />
            <Tabs.Screen name="ai-scheduler" />
          </Tabs>
        </View>
      </View>
    );
  }

  // Mobile: bottom tab bar
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#141420',
            borderTopColor: '#2A2A3A',
            height: Platform.OS === 'ios' ? 85 : 65,
            paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          },
          tabBarActiveTintColor: '#6000FF',
          tabBarInactiveTintColor: '#888',
          tabBarLabelStyle: { fontFamily: 'Roboto', fontSize: 10 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="bookings"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: 'Clients',
            tabBarIcon: ({ focused }) => <TabIcon name="users" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="finance"
          options={{
            title: 'Finance',
            tabBarIcon: ({ focused }) => <TabIcon name="dollar" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="contracts"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="stripe-connect"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="ai-scheduler"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ focused }) => <TabIcon name="grid" focused={focused} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setMoreVisible(true);
            },
          }}
        />
      </Tabs>
      <MoreMenu visible={moreVisible} onClose={() => setMoreVisible(false)} />
    </>
  );
}

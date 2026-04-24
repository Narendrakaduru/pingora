import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme';

// Screens
import LoginScreen    from '../screens/LoginScreen';
import SignupScreen   from '../screens/SignupScreen';
import ChatsScreen    from '../screens/ChatsScreen';
import ChatRoomScreen from '../screens/ChatRoomScreen';
import GroupsScreen   from '../screens/GroupsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ProfileScreen  from '../screens/ProfileScreen';
import UsersScreen    from '../screens/UsersScreen';
import IncomingCallOverlay from '../components/IncomingCallOverlay';
import CallModal from '../components/CallModal';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surfaceLowest,
          borderTopColor: COLORS.surfaceHigh,
          borderTopWidth: 1,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8,
          elevation: 0, // Remove Android shadow
          shadowOpacity: 0, // Remove iOS shadow
        },
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor:   COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginTop: 4 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Chats:    focused ? 'chatbubbles'    : 'chatbubbles-outline',
            Groups:   focused ? 'people'         : 'people-outline',
            Calendar: focused ? 'calendar'       : 'calendar-outline',
            Profile:  focused ? 'person-circle'  : 'person-circle-outline',
          };
          
          return (
            <View style={{
              width: 52,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: focused ? COLORS.primaryLight : 'transparent'
            }}>
              <Ionicons name={icons[route.name]} size={20} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Chats"    component={ChatsScreen}    />
      <Tab.Screen name="Groups"   component={GroupsScreen}    />
      <Tab.Screen name="Calendar" component={CalendarScreen}  />
      <Tab.Screen name="Profile"  component={ProfileScreen}   />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading, incomingCall, setIncomingCall, activeCall, setActiveCall, wsRef } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main"     component={MainTabs}      />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen name="Users"    component={UsersScreen}    />
          </>
        ) : (
          <>
            <Stack.Screen name="Login"  component={LoginScreen}  />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
      {incomingCall && !activeCall && (
         <IncomingCallOverlay 
            call={incomingCall} 
            onAccept={() => { 
               if (wsRef.current?.readyState === WebSocket.OPEN) {
                 wsRef.current.send(JSON.stringify({
                   type: 'call_response',
                   target: incomingCall.from,
                   accepted: true,
                   call_id: incomingCall.call_id,
                   call_type: incomingCall.type
                 }));
               }
               setActiveCall({ ...incomingCall, target: incomingCall.from, isCaller: false }); 
               setIncomingCall(null); 
            }} 
            onReject={() => {
               if (wsRef.current?.readyState === WebSocket.OPEN) {
                 wsRef.current.send(JSON.stringify({
                   type: 'call_response',
                   target: incomingCall.from,
                   accepted: false,
                   call_id: incomingCall.call_id
                 }));
               }
               setIncomingCall(null);
            }} 
         />
      )}
      {activeCall && (
         <CallModal call={activeCall} onHangup={() => setActiveCall(null)} wsRef={wsRef} />
      )}
    </NavigationContainer>
  );
}

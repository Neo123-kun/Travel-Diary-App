import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from './src/context/Themecontext';
import { DiaryProvider } from './src/context/Diarycontext';
import HomeScreen from './src/screens/Homescreen';
import AddEntryScreen from './src/screens/Addentryscreen';

export type RootStackParamList = {
  Home: undefined;
  AddEntry: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DiaryProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="AddEntry" component={AddEntryScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </DiaryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
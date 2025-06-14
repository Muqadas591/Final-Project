import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function RootLayout() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient 
        colors={['#D8E8E4', '#E1D6F2']} 
        style={{ flex: 1 }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

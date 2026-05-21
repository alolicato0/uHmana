import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme';

export default function Index() {
  const { isLoaded, isSignedIn, hasPickedMode } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(t);
  }, []);

  if (showSplash || !isLoaded) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('../assets/images/logo-full.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  if (!hasPickedMode) return <Redirect href="/welcome" />;
  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: 260,
    height: 160,
  },
});

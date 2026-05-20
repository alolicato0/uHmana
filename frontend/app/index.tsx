import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { Logo } from '../src/components/Logo';
import { colors } from '../src/theme';

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(t);
  }, []);

  if (showSplash || !isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <Logo size={96} />
        <Text style={{ marginTop: 24, color: colors.muted, textAlign: 'center' }}>
          La tua salute. La loro salute.{'\n'}Sempre insieme.
        </Text>
      </View>
    );
  }

  return <Redirect href={isSignedIn ? '/(tabs)/home' : '/welcome'} />;
}

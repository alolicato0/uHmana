import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  size?: number;
  showWordmark?: boolean;
}

export function Logo({ size = 80, showWordmark = true }: Props) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Ionicons name="heart" size={size} color={colors.primary} />
      {showWordmark && (
        <Text
          style={{
            marginTop: 12,
            fontSize: size * 0.45,
            fontWeight: '800',
            color: colors.ink,
          }}
        >
          u<Text style={{ color: colors.primary }}>H</Text>mana
        </Text>
      )}
    </View>
  );
}

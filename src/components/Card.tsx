import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { colors, radii } from '../theme';

interface Props extends ViewProps {
  onPress?: () => void;
  padded?: boolean;
}

export function Card({ style, onPress, padded = true, children, ...rest }: Props) {
  const content = (
    <View
      style={[styles.card, padded && styles.padded, style]}
      {...rest}
    >
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
        {content}
      </Pressable>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: {
    padding: 14,
  },
});

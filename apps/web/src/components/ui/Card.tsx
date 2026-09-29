import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useFanixTheme } from '../../theme/FanixThemeProvider';

type CardVariant = 'default' | 'elevated' | 'interactive';

export function Card({ children, style, variant = 'default' }: { children: React.ReactNode; style?: ViewStyle; variant?: CardVariant }) {
  const { theme } = useFanixTheme();
  return <View style={[styles.card, { backgroundColor: variant === 'elevated' ? theme.colors.surfaceElevated : theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.sidebarBackground }, variant === 'interactive' && styles.interactive, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
  },
  interactive: { shadowOpacity: 0.09, elevation: 2 },
});

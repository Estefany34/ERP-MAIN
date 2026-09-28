import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import fanixTheme from '../../theme/fanixTheme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: fanixTheme.colors.surface,
    borderRadius: fanixTheme.radius.lg,
    borderWidth: 1,
    borderColor: fanixTheme.colors.border,
    shadowColor: '#0B2345',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
});

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

type FanixLogoProps = {
  compact?: boolean;
  size?: 'default' | 'login';
  variant?: 'default' | 'inverse';
};

export function FanixLogo({ compact = false, size = 'default', variant = 'inverse' }: FanixLogoProps) {
  return (
    <View style={styles.wrap}>
      <Image
        source={variant === 'inverse' ? require('./Group 1 inverse.png') : require('./Group 1.png')}
        resizeMode="contain"
        accessibilityLabel="Fanix Global"
        style={compact ? styles.compact : size === 'login' ? styles.login : styles.full}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  compact: { width: 170, height: 48 },
  login: { width: 300, height: 104 },
  full: { width: 420, height: 180 },
});

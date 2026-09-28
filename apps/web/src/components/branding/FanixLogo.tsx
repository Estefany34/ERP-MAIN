import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export function FanixLogo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.wrap}>
      <Image
        source={require('./Group 1.png')}
        resizeMode="contain"
        style={compact ? styles.compact : styles.full}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  compact: { width: 170, height: 48 },
  full: { width: 420, height: 180 },
});

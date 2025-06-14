import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

export default function ProgressBar({ progress }) {
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 10,
    backgroundColor: '#E8D6B8', // Sand golden for the background
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 20,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#F4A896', // Warm peach for the progress
    borderRadius: 5,
  },
});

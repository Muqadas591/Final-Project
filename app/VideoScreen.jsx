import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview'; // For 360° video
import { Gyroscope } from 'expo-sensors';

const { width, height } = Dimensions.get('window');

const VRVideoScreen = () => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let subscription;
    const startGyroscope = async () => {
      try {
        subscription = await Gyroscope.addListener(({ x, y }) => {
          setRotation({ x: x * 30, y: y * 30 }); // Adjust sensitivity
        });
      } catch (error) {
        console.error("Gyroscope error:", error);
      }
    };

    startGyroscope();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  const youtubeVideoId = "mBWj443FNGs"; // Extracted from YouTube link

  return (
    <View style={styles.container}>
      <WebView
        source={{
          uri: `https://www.youtube.com/embed/${youtubeVideoId}?enablejsapi=1&controls=1&autoplay=1&vr=1`
        }}
        style={styles.video}
        allowsFullscreenVideo
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  video: { width, height }
});

export default VRVideoScreen;
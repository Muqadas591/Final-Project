import React from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import YoutubePlayer from 'react-native-youtube-iframe';

const { width, height } = Dimensions.get('window');

const extractYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const VideoScreen = () => {
  const { videoUrl } = useLocalSearchParams();
  const videoId = extractYouTubeId(videoUrl);

  return (
    <View style={styles.container}>
      {videoId ? (
        <YoutubePlayer
          height={height}
          width={width}
          play={true}
          videoId={videoId}
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoPlaceholderText}>Video not available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  videoPlaceholder: { flex: 1, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  videoPlaceholderText: { color: '#FFF', fontSize: 18 },
});

export default VideoScreen;
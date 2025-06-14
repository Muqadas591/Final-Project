import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  BackHandler,
  PanResponder,
  Switch,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { auth, db } from '../firebase/init';
import { Feather } from '@expo/vector-icons';
import YouTube from 'react-youtube';
import YoutubePlayer from 'react-native-youtube-iframe';
import * as Sensors from 'expo-sensors';

// Validate Firestore
if (!db || !auth) {
  console.error('Firebase not initialized properly');
}

const { width, height } = Dimensions.get('window');

const FALLBACK_YOUTUBE_URLS = [
  'https://www.youtube.com/watch?v=b4AkjHqDDK8',
  'https://www.youtube.com/watch?v=eNUpTV9BGacQ',
  'https://www.youtube.com/watch?v=k6T5t181BRU',
];

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {this.state.error?.message}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              this.setState({ hasError: false, error: null });
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const extractYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const TherapyScreen = () => {
  const { environmentId, therapy = 'Therapy', mentalHealthIssue = 'Unknown', sessionId = `session_${Date.now()}` } = useLocalSearchParams();
  console.log("Received environmentId:", environmentId); 
  const isWeb = Platform.OS === 'web';
  const videoRef = useRef(null);
  const [youtubePlayer, setYoutubePlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [environment, setEnvironment] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60);
  const [showControls, setShowControls] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isGyroscopeEnabled, setIsGyroEnabled] = useState(!isWeb);
  const [isGyroscopeAvailable, setIsGyroscopeAvailable] = useState(!isWeb);
  const [gyroscopeSubscription, setGyroscopeSubscription] = useState(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isFallbackVideo, setIsFallbackVideo] = useState(false);

  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const instructionsOpacity = useRef(new Animated.Value(1)).current;

  const throttle = (func, limit) => {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  };

  useEffect(() => {
    if (isWeb) return;
    const setupGyro = async () => {
      try {
        const available = await Sensors.Gyroscope.isAvailableAsync();
        if (available) {
          Sensors.Gyroscope.setUpdateInterval(100);
          if (isGyroscopeEnabled) {
            const subscription = Sensors.Gyroscope.addListener(
              throttle((data) => {
                if (!isGyroscopeEnabled) return;
                const sensitivity = 2;
                setPanX((prev) => prev - data.y * sensitivity);
                setPanY((prev) => prev + data.x * sensitivity);
              }, 100)
            );
            setGyroscopeSubscription(subscription);
          }
        } else {
          setError('Gyroscope not available');
          setIsGyroscopeAvailable(false);
          setIsGyroEnabled(false);
        }
      } catch (err) {
        console.error('Gyroscope setup failed:', err);
        setError('Gyroscope initialization error');
      }
    };
    setupGyro();
    return () => gyroscopeSubscription?.remove();
  }, [isGyroscopeEnabled, isWeb]);

  const toggleGyroscope = useCallback(() => {
    if (!isGyroscopeAvailable) return;
    if (isGyroscopeEnabled) {
      gyroscopeSubscription?.remove();
      setGyroscopeSubscription(null);
    } else {
      const subscription = Sensors.Gyroscope.addListener(
        throttle((data) => {
          const sensitivity = 2;
          setPanX((prev) => prev - data.y * sensitivity);
          setPanY((prev) => prev + data.x * sensitivity);
        }, 100)
      );
      setGyroscopeSubscription(subscription);
    }
    setIsGyroEnabled(!isGyroscopeEnabled);
  }, [isGyroscopeEnabled, gyroscopeSubscription, isGyroscopeAvailable]);

  const handleVideoError = (e) => {
    console.error('YouTube error:', e);
    
    if (e.data === 150) {
      console.log('Video embedding not allowed, switching to fallback video...');
      // Try next fallback video
      const nextIndex = (currentVideoIndex + 1) % FALLBACK_YOUTUBE_URLS.length;
      setCurrentVideoIndex(nextIndex);
      setVideoUrl(FALLBACK_YOUTUBE_URLS[nextIndex]);
      setIsFallbackVideo(true);
      setError('Video not available. Loading alternative video...');
    } else {
      setError('Failed to load YouTube video');
    }
  };

  const fetchEnvironment = async () => {
    try {
      console.log('Received environmentId:', environmentId);
      if (!environmentId) {
        throw new Error('No environmentId provided');
      }

      const envDoc = await db.collection('environments').doc(environmentId).get();
      if (!envDoc.exists) {
        console.warn(`Environment not found: ${environmentId}`);
        throw new Error(`Environment "${environmentId}" not found in Firestore`);
      }
      const envData = envDoc.data();
      console.log('Fetched environment:', envData);
      setEnvironment({
        ...envData,
        duration: parseInt(envData.duration || '20') * 60,
      });
      setTimeRemaining(parseInt(envData.duration || '20') * 60);
      const videoId = extractYouTubeId(envData.videoUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }
      setVideoUrl(envData.videoUrl);
      setIsFallbackVideo(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(`Failed to load environment: ${err.message}. Using default video.`);
      setVideoUrl(FALLBACK_YOUTUBE_URLS[0]);
      setIsFallbackVideo(true);
      setEnvironment({
        title: 'Fallback Therapy',
        duration: '20',
        description: 'A default therapy environment.',
        benefits: ['Promotes relaxation'],
      });
      Alert.alert('Warning', `Environment "${environmentId}" not found. Using a default video.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironment();
  }, [environmentId]);

  useEffect(() => {
    if (isWeb && videoUrl) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, [isWeb, videoUrl]);

  const togglePlayPause = async () => {
    try {
      if (isPlaying) {
        setShowPauseModal(true);
        setIsPlaying(false);
        if (isWeb && youtubePlayer) {
          youtubePlayer.pauseVideo();
        } else if (!isWeb && videoRef.current && typeof videoRef.current.pauseAsync === 'function') {
          await videoRef.current.pauseAsync();
        }
      } else {
        setShowPauseModal(false);
        setIsPlaying(true);
        if (isWeb && youtubePlayer) {
          youtubePlayer.playVideo();
        } else if (!isWeb && videoRef.current && typeof videoRef.current.playAsync === 'function') {
          await videoRef.current.playAsync();
        }
      }
    } catch (err) {
      console.error('Play/pause error:', err);
      setError(`Video control error: ${err.message}`);
    }
  };

  const handleEndSession = () => {
    setShowEndModal(true);
    setIsPlaying(false);
  };

  const handleSessionComplete = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');
      await db.collection('sessions').add({
        userId,
        sessionId,
        mentalHealthIssue,
        therapy,
        environmentId: environmentId || FALLBACK_ENVIRONMENT_ID,
        completedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      router.replace({
        pathname: '/FeedbackScreen',
        params: { environmentId: environmentId || FALLBACK_ENVIRONMENT_ID, sessionId },
      });
    } catch (err) {
      Alert.alert('Error', `Failed to save session: ${err.message}`);
      setError(`Failed to save session: ${err.message}`);
    }
  };

  const handleContinueSession = () => {
    setShowPauseModal(false);
    setShowEndModal(false);
    setIsPlaying(true);
    if (isWeb && youtubePlayer) {
      youtubePlayer.playVideo();
    } else if (!isWeb && videoRef.current && typeof videoRef.current.playAsync === 'function') {
      videoRef.current.playAsync();
    }
  };

  const handleExitSession = async () => {
    try {
      const user = auth.currentUser;
      if (!user || !user.uid) {
        throw new Error('User not authenticated');
      }

      const payload = {
        userId: user.uid,
        sessionId,
        mentalHealthIssue,
        therapy,
        environmentId: environmentId || FALLBACK_ENVIRONMENT_ID,
        status: 'exited',
        exitedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };

      console.log('Saving exit session:', payload);
      await db.collection('sessions').add(payload);

      router.replace({
        pathname: '/FeedbackScreen',
        params: { environmentId: environmentId || FALLBACK_ENVIRONMENT_ID, sessionId },
      });
    } catch (err) {
      Alert.alert('Error', `Failed to save session exit: ${err.message}`);
      console.error('Exit session error:', err);
      setError(`Failed to save session exit: ${err.message}`);
    }
  };

  const pinchGestureHandler = useRef();
  const pinchHandler = {
    onGestureEvent: Animated.event(
      [{ nativeEvent: { scale: new Animated.Value(1) } }],
      {
        useNativeDriver: true,
        listener: (event) => {
          setScale(Math.max(1, Math.min(event.nativeEvent.scale, 3)));
        },
      }
    ),
    onHandlerStateChange: (event) => {
      if (event.nativeEvent.oldState === State.ACTIVE) {
        setScale(Math.max(1, Math.min(event.nativeEvent.scale, 3)));
      }
    },
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isGyroscopeEnabled,
      onPanResponderGrant: () => {
        setShowControls(true);
        Animated.timing(controlsOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isGyroscopeEnabled) {
          setPanX((prev) => prev + gestureState.dx / 10);
          setPanY((prev) => prev + gestureState.dy / 10);
        }
      },
      onPanResponderRelease: () => {
        setTimeout(() => {
          Animated.timing(controlsOpacity, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }).start(() => setShowControls(false));
        }, 3000);
      },
    })
  ).current;

  useEffect(() => {
    const backAction = () => {
      if (isPlaying) {
        setShowEndModal(true);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && environment) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isPlaying, environment]);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(instructionsOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => setShowInstructions(false));
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6A8CAF" />
        <Text style={styles.loadingText}>Loading therapy session...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setError('');
            setIsLoading(true);
            fetchEnvironment();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar hidden />
        <PinchGestureHandler ref={pinchGestureHandler} {...pinchHandler}>
          <Animated.View
            style={[styles.videoContainer, { transform: [{ scale }, { translateX: panX }, { translateY: panY }] }]}
            {...panResponder.panHandlers}
          >
            {videoUrl ? (
              isWeb ? (
                <YouTube
                  videoId={extractYouTubeId(videoUrl)}
                  opts={{
                    width: '100%',
                    height: '100%',
                    playerVars: { 
                      autoplay: isPlaying ? 1 : 0, 
                      controls: 0, 
                      loop: 1,
                      modestbranding: 1,
                      rel: 0,
                      showinfo: 0,
                      origin: window.location.origin
                    },
                  }}
                  onReady={(event) => {
                    setYoutubePlayer(event.target);
                    setIsVideoLoaded(true);
                    console.log('YouTube video loaded:', videoUrl);
                    if (isFallbackVideo) {
                      setError(''); // Clear error message when fallback video loads successfully
                    }
                  }}
                  onError={handleVideoError}
                  onStateChange={(event) => {
                    if (event.data === 1) { // Playing
                      setIsPlaying(true);
                    } else if (event.data === 2) { // Paused
                      setIsPlaying(false);
                    }
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <YoutubePlayer
                  ref={videoRef}
                  height={height}
                  width={width}
                  play={isPlaying}
                  videoId={extractYouTubeId(videoUrl)}
                  onReady={() => {
                    setIsVideoLoaded(true);
                    console.log('YouTube video loaded:', videoUrl);
                    if (isFallbackVideo) {
                      setError(''); // Clear error message when fallback video loads successfully
                    }
                  }}
                  onError={handleVideoError}
                  onChangeState={(event) => {
                    if (event === 'playing') setIsPlaying(true);
                    if (event === 'paused' || event === 'ended') setIsPlaying(false);
                  }}
                />
              )
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={styles.videoPlaceholderText}>Video not available</Text>
              </View>
            )}
          </Animated.View>
        </PinchGestureHandler>

        {showInstructions && (
          <Animated.View style={[styles.instructionsContainer, { opacity: instructionsOpacity }]}>
            <View style={styles.instructionsCard}>
              <Text style={styles.title}>Instructions</Text>
              <View style={styles.instructionsTitle}>
                <Text style={styles.headerText}>How to Navigate</Text>
              </View>
              {isGyroscopeAvailable && (
                <View style={styles.instructionItem}>
                  <Feather name="smartphone" size={24} color="#6A8CAF" />
                  <Text style={styles.instructionText}>Move device to look around</Text>
                </View>
              )}
              <View style={styles.instructionItem}>
                <Feather name="move" size={24} color="#6A8CAF" />
                <Text style={styles.instructionText}>Or drag to look around</Text>
              </View>
              <View style={styles.instructionItem}>
                <Feather name="zoom-in" size={24} color="#6A8CAF" />
                <Text style={styles.instructionText}>Pinch to zoom in/out</Text>
              </View>
              <TouchableOpacity
                style={styles.gotItButton}
                onPress={() => {
                  Animated.timing(instructionsOpacity, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                  }).start(() => setShowInstructions(false));
                }}
              >
                <Text style={styles.gotItButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        <Animated.View style={[styles.controlsContainer, { opacity: controlsOpacity }]} pointerEvents={showControls ? 'auto' : 'none'}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.closeButton} onPress={handleEndSession}>
              <Feather name="x" size={24} color="#FFFFFF" />
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionInfoText}>{environment?.title || 'Therapy Session'}</Text>
            </View>
            <View style={styles.timerContainer}>
              <Feather name="clock" size={18} color="#FFFFFF" />
              <Text style={styles.timerText}>{`${Math.floor(timeRemaining / 60)}:${(timeRemaining % 60).toString().padStart(2, '0')}`}</Text>
            </View>
          </View>
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.controlButton} onPress={togglePlayPause}>
              <Feather name={isPlaying ? 'pause' : 'play'} size={28} color="#FFFFFF" />
              <Text style={styles.controlButtonText}>{isPlaying ? 'Pause' : 'Play'}</Text>
            </TouchableOpacity>
            {isGyroscopeAvailable && (
              <View style={styles.gyroscopeToggle}>
                <Feather name="smartphone" size={20} color="#FFFFFF" />
                <Text style={styles.gyroscopeText}>Gyroscope</Text>
                <Switch
                  value={isGyroscopeEnabled}
                  onValueChange={toggleGyroscope}
                  trackColor={{ false: '#767577', true: '#81b0ff' }}
                  thumbColor={isGyroscopeEnabled ? '#f5dd4b' : '#f4f3f4'}
                />
              </View>
            )}
          </View>
        </Animated.View>

        <Modal visible={showPauseModal} transparent style={styles.animation} mode="fade" onRequestClose={handleContinueSession}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Session Paused</Text>
              <Text style={styles.modalText}>Take a moment to breathe. Continue when ready.</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleContinueSession}>
                <Feather name="play" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleExitSession}>
                <Text style={styles.secondaryButtonText}>Exit Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showEndModal} transparent style={styles.animation} mode="fade" onRequestClose={handleContinueSession}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.titleText}>End Session?</Text>
              <Text style={styles.modalText}>Are you sure you want to end your therapy session?</Text>
              <TouchableOpacity style={styles.primaryButton} onPress={handleContinueSession}>
                <Feather name="play" style={styles.iconSize} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Continue Session</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, styles.endButton]} onPress={handleExitSession}>
                <Feather name="x-circle" style={styles.iconSize} color="#FF6B6B" />
                <Text style={styles.endButtonText}>End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  videoContainer: { flex: 1, width, height },
  videoPlaceholder: { flex: 1, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  videoPlaceholderText: { color: '#FFF', fontSize: 18 },
  instructionsContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 10 },
  instructionsCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 16, width: '80%', maxWidth: 350, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  instructionsTitle: { width: '100%', marginBottom: 16 },
  headerText: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center' },
  instructionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, width: '100%' },
  instructionText: { marginLeft: 12, fontSize: 14, color: '#333', flex: 1 },
  gotItButton: { backgroundColor: '#6A8CAF', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20, marginTop: 8 },
  gotItButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  controlsContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', zIndex: 2 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, backgroundColor: 'rgba(0,0,0,0.5)' },
  closeButton: { flexDirection: 'row', alignItems: 'center', paddingRight: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8 },
  closeButtonText: { color: '#FFF', fontSize: 16, marginLeft: 8 },
  sessionInfo: { flex: 1, alignItems: 'center' },
  sessionInfoText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  timerContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  timerText: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  bottomBar: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, backgroundColor: 'rgba(0,0,0,0.5)', gap: 20 },
  controlButton: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  controlButtonText: { color: '#FFF', fontSize: 12, marginTop: 4 },
  gyroscopeToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(106,140,175,0.2)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 4 },
  gyroscopeText: { color: '#FFF', fontSize: 12, marginLeft: 4, marginRight: 6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, width: '80%', maxWidth: 350, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  modalText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  primaryButton: { backgroundColor: '#6A8CAF', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, width: '100%', marginBottom: 10 },
  primaryButtonText: { color: '#FFF', fontSize: 16, marginLeft: 8 },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, width: '100%' },
  secondaryButtonText: { color: '#6A8CAF', fontSize: 16, marginLeft: 10 },
  endButton: { borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 12 },
  endButtonText: { color: '#FF6B6B', fontSize: 16, fontWeight: '500', marginLeft: 10 },
  loadingText: { fontSize: 16, color: '#FFF', textAlign: 'center', marginTop: 10 },
  errorText: { fontSize: 16, color: '#FF6B6B', textAlign: 'center', marginBottom: 20 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  retryButton: { backgroundColor: '#6A8CAF', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, marginTop: 10 },
  retryButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  backButton: { marginTop: 10, backgroundColor: '#E0E0E0', borderRadius: 12, padding: 10 },
  backButtonText: { color: '#333', fontSize: 16, textAlign: 'center' },
});

export default TherapyScreen;
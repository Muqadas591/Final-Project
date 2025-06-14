import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Alert,
  Modal,
  BackHandler,
  PanResponder,
  Switch,
} from 'react-native';
import { Video, Audio } from 'expo-av';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import axios from 'axios';
import { auth, db } from '../firebase/firebaseConfig';
import { API_URL } from 'react-native-dotenv';
import * as Sensors from 'expo-sensors';

const { width, height } = Dimensions.get('window');

const TherapySessionScreen = () => {
  const params = useLocalSearchParams();
  const environmentId = params.environment || 'forest';
  const therapy = params.therapy || 'Therapy';
  const mentalHealthIssue = params.mentalHealthIssue || 'Unknown';
  const sessionId = params.sessionId || `session_${Date.now()}`;

  // Refs
  const videoRef = useRef(null);
  const guidanceSound = useRef(new Audio.Sound());
  const ambientSound = useRef(new Audio.Sound());
  const timerRef = useRef(null);

  // State
  const [environment, setEnvironment] = useState(null);
  const [mediaUrls, setMediaUrls] = useState({
    videoUrl: null,
    guidanceAudioUrl: null,
    ambientAudioUrl: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60);
  const [showControls, setShowControls] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  
  // Gyroscope state
  const [gyroscopeData, setGyroscopeData] = useState({ x: 0, y: 0, z: 0 });
  const [isGyroscopeEnabled, setIsGyroscopeEnabled] = useState(true);
  const [gyroscopeSubscription, setGyroscopeSubscription] = useState(null);

  // Animated values
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const instructionsOpacity = useRef(new Animated.Value(1)).current;

  // Initialize and manage gyroscope
  useEffect(() => {
    let subscription = null;

    const setupGyroscope = async () => {
      const isAvailable = await Sensors.Gyroscope.isAvailableAsync();
      
      if (isAvailable) {
        // Set update interval (in ms)
        Sensors.Gyroscope.setUpdateInterval(100);
        
        // Start subscription if enabled
        if (isGyroscopeEnabled) {
          subscription = Sensors.Gyroscope.addListener(gyroscopeData => {
            if (!isGyroscopeEnabled) return;
            
            // Apply gyroscope data to pan values
            // Adjust sensitivity as needed
            const sensitivity = 2;
            setPanX(prevPanX => prevPanX - gyroscopeData.y * sensitivity);
            setPanY(prevPanY => prevPanY + gyroscopeData.x * sensitivity);
          });
          
          setGyroscopeSubscription(subscription);
        }
      } else {
        setError("Gyroscope not available on this device");
        setIsGyroscopeEnabled(false);
      }
    };

    setupGyroscope();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [isGyroscopeEnabled]);

  // Toggle gyroscope function
  const toggleGyroscope = () => {
    if (isGyroscopeEnabled) {
      // Disable gyroscope
      if (gyroscopeSubscription) {
        gyroscopeSubscription.remove();
        setGyroscopeSubscription(null);
      }
    } else {
      // Re-enable gyroscope
      const subscription = Sensors.Gyroscope.addListener(gyroscopeData => {
        const sensitivity = 2;
        setPanX(prevPanX => prevPanX - gyroscopeData.y * sensitivity);
        setPanY(prevPanY => prevPanY + gyroscopeData.x * sensitivity);
      });
      setGyroscopeSubscription(subscription);
    }
    
    setIsGyroscopeEnabled(!isGyroscopeEnabled);
  };

  useEffect(() => {
    const fetchEnvironmentAndMedia = async () => {
      try {
        // Fetch environment from Firestore
        const envDoc = await getDoc(doc(db, 'environments', environmentId));
        if (!envDoc.exists()) throw new Error('Environment not found');
        const envData = envDoc.data();
        setEnvironment({
          ...envData,
          duration: parseInt(envData.duration) * 60,
        });
        setTimeRemaining(parseInt(envData.duration) * 60);

        // Fetch media URLs from backend
        const [videoRes, guidanceRes, ambientRes] = await Promise.all([
          axios.post(`${API_URL}/get_media_url`, { fileId: envData.videoUrl }),
          axios.post(`${API_URL}/get_media_url`, { fileId: envData.guidanceAudioUrl }),
          axios.post(`${API_URL}/get_media_url`, { fileId: envData.ambientAudioUrl }),
        ]);

        setMediaUrls({
          videoUrl: videoRes.data.mediaUrl,
          guidanceAudioUrl: guidanceRes.data.mediaUrl,
          ambientAudioUrl: ambientRes.data.mediaUrl,
        });

        // Load audio
        await guidanceSound.current.loadAsync({ uri: guidanceRes.data.mediaUrl });
        await ambientSound.current.loadAsync({ uri: ambientRes.data.mediaUrl });
        await guidanceSound.current.setIsLoopingAsync(true);
        await ambientSound.current.setIsLoopingAsync(true);
        if (isPlaying) {
          await guidanceSound.current.playAsync();
          await ambientSound.current.playAsync();
        }
      } catch (err) {
        setError(`Failed to load environment or media: ${err.message}`);
        setEnvironment({
          title: 'Peaceful Forest',
          duration: 20 * 60,
        });
        setMediaUrls({
          videoUrl: 'https://drive.google.com/uc?export=download&id=your-fallback-video-id',
          guidanceAudioUrl: 'https://drive.google.com/uc?export=download&id=your-fallback-guidance-id',
          ambientAudioUrl: 'https://drive.google.com/uc?export=download&id=your-fallback-ambient-id',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchEnvironmentAndMedia();

    return () => {
      guidanceSound.current.unloadAsync();
      ambientSound.current.unloadAsync();
    };
  }, [environmentId]);

  // Sync audio with play/pause
  useEffect(() => {
    const syncAudio = async () => {
      if (isPlaying && mediaUrls.guidanceAudioUrl && mediaUrls.ambientAudioUrl) {
        await guidanceSound.current.playAsync();
        await ambientSound.current.playAsync();
      } else {
        await guidanceSound.current.pauseAsync();
        await ambientSound.current.pauseAsync();
      }
    };
    if (environment) syncAudio();
  }, [isPlaying, environment]);

  // Format time for display (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle pinch gesture for zoom
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

  // Handle pan gesture for 360 view (only active when gyroscope is disabled)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isGyroscopeEnabled,
      onPanResponderGrant: () => {
        showControlsTemporarily();
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isGyroscopeEnabled) {
          setPanX(panX + gestureState.dx / 10);
          setPanY(panY + gestureState.dy / 10);
        }
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // Show controls temporarily then fade them out
  const showControlsTemporarily = () => {
    setShowControls(true);
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(controlsOpacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          setShowControls(false);
        });
      }, 3000);
    });
  };

  // Handle back button press
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

  // Set up timer
  useEffect(() => {
    if (isPlaying && environment) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => {
      clearInterval(timerRef.current);
    };
  }, [isPlaying, environment]);

  // Hide instructions after a delay
  useEffect(() => {
    const instructionsTimer = setTimeout(() => {
      Animated.timing(instructionsOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setShowInstructions(false);
      });
    }, 8000);

    return () => clearTimeout(instructionsTimer);
  }, []);

  // Handle play/pause
  const togglePlayPause = async () => {
    if (isPlaying) {
      setShowPauseModal(true);
      setIsPlaying(false);
      if (videoRef.current) {
        await videoRef.current.pauseAsync();
      }
      await guidanceSound.current.pauseAsync();
      await ambientSound.current.pauseAsync();
    } else {
      setShowPauseModal(false);
      setIsPlaying(true);
      if (videoRef.current) {
        await videoRef.current.playAsync();
      }
      await guidanceSound.current.playAsync();
      await ambientSound.current.playAsync();
    }
  };

  // Handle end session
  const handleEndSession = () => {
    setShowEndModal(true);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
    guidanceSound.current.pauseAsync();
    ambientSound.current.pauseAsync();
  };

  // Handle session complete
  const handleSessionComplete = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('User not authenticated');
      await addDoc(collection(db, 'sessions'), {
        userId,
        sessionId,
        mentalHealthIssue,
        therapy,
        environmentId,
        completedAt: new Date().toISOString(),
      });
      router.replace({
        pathname: '/session-complete',
        params: { environment: environmentId, sessionId },
      });
    } catch (err) {
      Alert.alert('Error', `Failed to save session: ${err.message}`);
    }
  };

  // Handle continue session from pause modal
  const handleContinueSession = async () => {
    setShowPauseModal(false);
    setShowEndModal(false);
    setIsPlaying(true);
    if (videoRef.current) {
      await videoRef.current.playAsync();
    }
    await guidanceSound.current.playAsync();
    await ambientSound.current.playAsync();
  };

  // Handle exit session from modals
  const handleExitSession = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        await addDoc(collection(db, 'sessions'), {
          userId,
          sessionId,
          mentalHealthIssue,
          therapy,
          environmentId,
          status: 'exited',
          exitedAt: new Date().toISOString(),
        });
      }
      router.replace('/FeedbackScreen');
    } catch (err) {
      Alert.alert('Error', `Failed to save session exit: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading therapy session...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setIsLoading(true)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden />

      {/* 360° Video Background */}
      <PinchGestureHandler ref={pinchGestureHandler} {...pinchHandler}>
        <Animated.View
          style={[
            styles.videoContainer,
            {
              transform: [
                { scale },
                { translateX: panX },
                { translateY: panY },
              ],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Video
            ref={videoRef}
            source={{ uri: mediaUrls.videoUrl }}
            rate={1.0}
            volume={1.0}
            isMuted={false}
            resizeMode="cover"
            shouldPlay={isPlaying}
            isLooping
            style={styles.video}
          />
        </Animated.View>
      </PinchGestureHandler>

      {/* Instructions Overlay */}
      {showInstructions && (
        <Animated.View
          style={[styles.instructionsContainer, { opacity: instructionsOpacity }]}
        >
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>How to Navigate</Text>
            <View style={styles.instructionItem}>
              <Feather name="smartphone" size={24} color="#6A8CAF" />
              <Text style={styles.instructionText}>Move device to look around</Text>
            </View>
            <View style={styles.instructionItem}>
              <Feather name="move" size={24} color="#6A8CAF" />
              <Text style={styles.instructionText}>Or drag to look around</Text>
            </View>
            <View style={styles.instructionItem}>
              <Feather name="zoom-in" size={24} color="#6A8CAF" />
              <Text style={styles.instructionText}>Pinch to zoom in/out</Text>
            </View>
            <View style={styles.instructionItem}>
              <Feather name="tap" size={24} color="#6A8CAF" />
              <Text style={styles.instructionText}>Tap to show/hide controls</Text>
            </View>
            <TouchableOpacity
              style={styles.gotItButton}
              onPress={() => {
                Animated.timing(instructionsOpacity, {
                  toValue: 0,
                  duration: 500,
                  useNativeDriver: true,
                }).start(() => {
                  setShowInstructions(false);
                });
              }}
            >
              <Text style={styles.gotItButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Controls Overlay */}
      <Animated.View
        style={[styles.controlsContainer, { opacity: controlsOpacity }]}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={handleEndSession}>
            <Feather name="x" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>{environment?.title}</Text>
          </View>
          <View style={styles.timerContainer}>
            <Feather name="clock" size={18} color="#FFFFFF" />
            <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
          </View>
        </View>
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.controlButton} onPress={togglePlayPause}>
            <Feather name={isPlaying ? 'pause' : 'play'} size={28} color="#FFFFFF" />
          </TouchableOpacity>
          
          {/* Gyroscope Toggle Button */}
          <View style={styles.gyroscopeToggle}>
            <Feather name="smartphone" size={20} color="#FFFFFF" />
            <Switch
              value={isGyroscopeEnabled}
              onValueChange={toggleGyroscope}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
              thumbColor={isGyroscopeEnabled ? "#f5dd4b" : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              style={{ marginLeft: 8 }}
            />
          </View>
          
          <TouchableOpacity style={styles.controlButton} onPress={showControlsTemporarily}>
            <Feather name="info" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Pause Modal */}
      <Modal
        visible={showPauseModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleContinueSession}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Session Paused</Text>
            <Text style={styles.modalText}>
              Take a moment to breathe. Your session will continue when you're ready.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleContinueSession}>
              <Feather name="play" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Continue Session</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleExitSession}>
              <Text style={styles.secondaryButtonText}>Exit Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* End Session Modal */}
      <Modal
        visible={showEndModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleContinueSession}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>End Session?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to end your therapy session? Your progress will be saved.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleContinueSession}>
              <Feather name="play" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Continue Session</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.endButton]}
              onPress={handleExitSession}
            >
              <Feather name="x-circle" size={20} color="#FF6B6B" />
              <Text style={styles.endButtonText}>End Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoContainer: {
    flex: 1,
    width: width,
    height: height,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  instructionsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 350,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  instructionText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
  },
  gotItButton: {
    backgroundColor: '#6A8CAF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 10,
  },
  gotItButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 5,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    alignItems: 'center',
  },
  sessionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(106, 140, 175, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gyroscopeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106, 140, 175, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 350,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: '#6A8CAF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#6A8CAF',
    fontSize: 16,
  },
  endButton: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  endButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6A8CAF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TherapySessionScreen;
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  SafeAreaView,
  Easing,
  Platform,
  PanResponder,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase/init';

// Cache keys
const CACHE_KEYS = {
  THERAPY_SUGGESTION: (userId, sessionId) => `therapy_suggestion_${userId}_${sessionId}`,
};

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;

// Cache helper functions
const cacheData = async (key, data) => {
  try {
    const cacheItem = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {
    console.error('Error caching data:', error);
  }
};

const getCachedData = async (key) => {
  try {
    const cachedItem = await AsyncStorage.getItem(key);
    if (!cachedItem) return null;

    const { data, timestamp } = JSON.parse(cachedItem);
    if (Date.now() - timestamp > CACHE_EXPIRATION) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting cached data:', error);
    return null;
  }
};

// Dynamically set API_URL with a fallback and handle device/emulator environment
const API_URL = (() => {
  const url = Constants.manifest?.extra?.API_URL || 
              Constants.expoConfig?.extra?.API_URL;
  if (url) return url;
  if (Platform.OS === 'web') return 'http://localhost:5000';
  if (Platform.OS === 'android') return 'http://10.0.2.2:5000';
  if (Platform.OS === 'ios') return 'http://localhost:5000';
  return 'http://localhost:5000';
})();

const { width, height } = Dimensions.get('window');

// Normalize responses to match backend expectations
const normalizeResponse = (response, index, expectedTypes) => {
  const expectedType = expectedTypes[index];
  if (typeof response !== 'string') return response;

  const lowerResponse = response.toLowerCase();
  if (expectedType === 'binary') {
    if (lowerResponse === 'yes' || lowerResponse === 'true') return 'Yes';
    if (lowerResponse === 'no' || lowerResponse === 'false') return 'No';
  } else if (expectedType === 'categorical') {
    const categoricalMappings = {
      High: 3,
      Medium: 2,
      Low: 1,
      Poor: 1,
      Good: 3,
    };
    const normalized = Object.keys(categoricalMappings).find(
      (key) => key.toLowerCase() === lowerResponse
    );
    return normalized || response;
  }
  return response;
};

const RecommendationScreen = () => {
  const { responses, sessionId } = useLocalSearchParams();

  const expectedTypes = [
    'categorical', 'categorical', 'categorical', 'categorical', 'binary',
    'binary', 'binary', 'binary', 'binary', 'binary',
    'binary', 'numeric', 'numeric', 'binary', 'binary'
  ];

  const parsedResponses = useMemo(() => {
    try {
      if (!responses) return [];
      const parsed = JSON.parse(responses);
      // Normalize responses
      return parsed.map((response, index) => normalizeResponse(response, index, expectedTypes));
    } catch (e) {
      console.error('Failed to parse responses:', e);
      return [];
    }
  }, [responses]);

  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading recommendations...');
  const [error, setError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const [rotateAngle, setRotateAngle] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (evt, gestureState) => {
        const newAngle = rotateAngle + gestureState.dx / 2;
        setRotateAngle(newAngle);
        rotateValue.setValue(newAngle);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  useEffect(() => {
    console.log('API_URL:', API_URL);
    console.log('Parsed responses:', parsedResponses);
    if (!API_URL) {
      console.error('API_URL is not configured.');
      setError('Backend URL is not configured correctly. Please contact support.');
      setIsLoading(false);
      return;
    }

    if (!sessionId) {
      console.error('Session ID is missing.');
      setError('Session ID is missing. Please restart the process.');
      setIsLoading(false);
      return;
    }

    const checkNetworkAndFetch = async () => {
      try {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          throw new Error('No internet connection. Please check your network.');
        }

        await saveResponsesAndGetRecommendation();
      } catch (err) {
        console.error('Network check failed:', err.message);
        setError(`Failed to connect: ${err.message}`);
        setIsLoading(false);
      }
    };

    if (parsedResponses.length === 15) {
      checkNetworkAndFetch();
    } else {
      console.error('Invalid responses length:', parsedResponses.length);
      setError(`Invalid number of responses: expected 15, got ${parsedResponses.length}`);
      setIsLoading(false);
    }
  }, [parsedResponses, sessionId]);

  const saveResponsesAndGetRecommendation = useCallback(async (retryCount = 0, maxRetries = 3) => {
    try {
      console.log('Starting recommendation process', { responses: parsedResponses, sessionId });

      if (!auth.currentUser) {
        console.log('No authenticated user, waiting for auth...');
        await new Promise((resolve) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            resolve(user);
          });
        });
      }

      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const userId = auth.currentUser.uid;
      console.log('User authenticated:', userId);

      if (parsedResponses.length !== 15) {
        throw new Error(`Invalid number of responses: expected 15, got ${parsedResponses.length}`);
      }

      // Check cache for recommendation
      const cacheKey = CACHE_KEYS.THERAPY_SUGGESTION(userId, sessionId);
      const cachedRecommendation = await getCachedData(cacheKey);
      if (cachedRecommendation) {
        console.log('Using cached recommendation:', cachedRecommendation);
        setRecommendation(cachedRecommendation);
        setIsLoading(false);
        return;
      }

      // Step 1: Call /predict_pre_therapy with responses to get condition
      console.log('Sending to /predict_pre_therapy:', parsedResponses);
      const preTherapyResponse = await axios.post(`${API_URL}/predict_pre_therapy`, {
        responses: parsedResponses,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (preTherapyResponse.status !== 200 || !preTherapyResponse.data.condition) {
        throw new Error('Failed to fetch condition from pre-therapy prediction');
      }

      const condition = preTherapyResponse.data.condition;
      console.log('Predicted condition:', condition);

      // Step 2: Call /recommend_therapy with condition to get therapy recommendation
      const therapyResponse = await axios.post(`${API_URL}/recommend_therapy`, {
        condition,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
       console.log("Therapy API raw response:", therapyResponse.data);
        if (!therapyResponse.data.environmentId) {
        console.error("environmentId is missing from backend response"); 
        throw new Error("Therapy recommendation is missing environmentId");
      }

      if (therapyResponse.status === 200 && therapyResponse.data) {
        // Ensure environmentId is included in the recommendation
     const recommendationData = {
  ...therapyResponse.data,
  mentalHealthIssue: condition,
};

        console.log('Recommendation received:', recommendationData);
       setRecommendation(recommendationData);
      await cacheData(cacheKey, recommendationData);
      setIsLoading(false);
    }
    } catch (error) {
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 8000));
        return saveResponsesAndGetRecommendation(retryCount + 1, maxRetries);
      } else {
        setError(error.message || 'Failed to get recommendation');
        setIsLoading(false);
      }
    }
  }, [parsedResponses, sessionId]);
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 5000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ),
    ]).start();
  }, [fadeAnim, slideAnim, rotateValue]);

  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleStartTherapy = useCallback(async () => {
    try {
      if (!recommendation) {
        throw new Error('No recommendation available');
      }
      console.log('Navigating to TherapyScreen with params:', {
        environmentId: recommendation.environmentId,
        therapy: recommendation.therapy,
        mentalHealthIssue: recommendation.mentalHealthIssue,
        sessionId,
      });
      router.push({
        pathname: '/TherapyScreen',
        params: {
          environmentId: recommendation.environmentId,
          therapy: recommendation.therapy,
          mentalHealthIssue: recommendation.mentalHealthIssue,
          sessionId,
        },
      });
    } catch (err) {
      console.error('Error starting therapy:', err.message);
      Alert.alert('Error', `Failed to start therapy: ${err.message}`);
    }
  }, [recommendation, sessionId]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>{loadingMessage}</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            setError(null);
            setLoadingMessage('Loading recommendations...');
            if (parsedResponses.length === 15) {
              saveResponsesAndGetRecommendation();
            }
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (!recommendation) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No recommendation available</Text>
      </SafeAreaView>
    );
  }

  const { environment, therapy, therapyDescription, mentalHealthIssue } = recommendation;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#6A8CAF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Therapy Recommendation</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{therapy}</Text>
            <Text style={styles.cardSubtitle}>Recommended for: {mentalHealthIssue}</Text>
            <Text style={styles.therapyDescription}>{therapyDescription}</Text>

            <View style={styles.imageContainer}>
              <Animated.View
                {...panResponder.panHandlers}
                style={styles.panoramaContainer}
              >
                <Animated.Image
                  source={{ uri: environment.imageUrl }}
                  style={[styles.environmentImage, { transform: [{ rotate: spin }] }]}
                  resizeMode="cover"
                  onError={(e) => console.error('Image load error:', e.nativeEvent.error)}
                />
                <View style={styles.panoramaOverlay}>
                  <View style={styles.dragIndicator}>
                    <Feather name="move" size={24} color="#FFFFFF" />
                    <Text style={styles.dragText}>Drag to explore 360°</Text>
                  </View>
                </View>
              </Animated.View>
              <View style={styles.environmentBadge}>
                <Text style={styles.environmentBadgeText}>{environment.title}</Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.environmentDescriptionTitle}>Environment Description</Text>
              <Text style={styles.environmentDescription}>{environment.description}</Text>

              <View style={styles.benefitsContainer}>
                <Text style={styles.benefitsTitle}>Benefits</Text>
                {environment.benefits.length > 0 ? (
                  environment.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitItem}>
                      <FontAwesome5 name="check-circle" size={16} color="#6A8CAF" />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noBenefitsText}>No benefits available</Text>
                )}
              </View>

              <View style={styles.sessionInfoContainer}>
                <View style={styles.sessionInfoItem}>
                  <Feather name="clock" size={20} color="#6A8CAF" />
                  <Text style={styles.sessionInfoText}>Duration: {environment.duration}</Text>
                </View>
                {environment.guidanceAudioUrl && (
                  <View style={styles.sessionInfoItem}>
                    <Feather name="headphones" size={20} color="#6A8CAF" />
                    <Text style={styles.sessionInfoText}>Audio guidance included</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.startButton} onPress={handleStartTherapy}>
            <Feather name="play-circle" size={24} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start AR/VR Session</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.alternativeButton}
            onPress={() => router.push('/EnvironmentSelectionScreen')}
          >
            <Text style={styles.alternativeButtonText}>See Other Environments</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

export default RecommendationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  therapyDescription: {
    fontSize: 16,
    color: '#444444',
    marginTop: 8,
    marginBottom: 16,
  },
  imageContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  panoramaContainer: {
    flex: 1,
  },
  environmentImage: {
    width: '100%',
    height: '100%',
  },
  panoramaOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
  environmentBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#6A8CAF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  environmentBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoSection: {
    marginTop: 16,
  },
  environmentDescriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  environmentDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  benefitsContainer: {
    marginTop: 12,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  benefitText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#444444',
  },
  noBenefitsText: {
    fontSize: 14,
    color: '#999999',
  },
  sessionInfoContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  sessionInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  sessionInfoText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666666',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A8CAF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 8,
  },
  alternativeButton: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  alternativeButtonText: {
    color: '#6A8CAF',
    fontSize: 16,
  },
});
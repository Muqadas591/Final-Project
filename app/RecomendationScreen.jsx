import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  SafeAreaView,
  Easing,
  Platform, // Added Platform import
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebase/init';
import { collection, addDoc, doc, getDoc, query, where, getDocs } from '@firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getFirestore } from '@firebase/firestore';

// Cache keys
const CACHE_KEYS = {
  RESPONSES: (userId, sessionId) => `responses_${userId}_${sessionId}`,
  THERAPY_SUGGESTION: (userId, sessionId) => `therapy_suggestion_${userId}_${sessionId}`,
  ENVIRONMENT: (envId) => `environment_${envId}`,
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

// Dynamically set API_URL with a fallback
const API_URL = Constants.manifest?.extra?.API_URL || 
               Constants.expoConfig?.extra?.API_URL || 
               "http://localhost:5000"; // Update this to your actual backend URL

const { width, height } = Dimensions.get('window');

const RecommendationScreen = () => {
  const { responses, sessionId } = useLocalSearchParams();
  let parsedResponses = [];
  try {
    parsedResponses = responses ? JSON.parse(responses) : [];
  } catch (e) {
    console.error('Failed to parse responses:', e);
  }

  const [recommendation, setRecommendation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading recommendations...');
  const [error, setError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const [rotateAngle, setRotateAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    console.log('API_URL:', API_URL);
    // Check if API_URL is valid for the platform
    if (!API_URL || (API_URL.includes('localhost') && Platform.OS !== 'web')) {
      console.error('API_URL may be invalid for this environment. Ensure it points to a reachable backend.');
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
        // Check network connectivity
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

  const saveResponsesAndGetRecommendation = async (retryCount = 0, maxRetries = 3) => {
    try {
      console.log('Starting recommendation process', { responses: parsedResponses, sessionId });

      // Wait for authentication
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

      // Get Firestore instance
      const db = await getFirestore();

      // Check cache for responses
      const responsesCacheKey = CACHE_KEYS.RESPONSES(userId, sessionId);
      const cachedResponses = await getCachedData(responsesCacheKey);

      if (!cachedResponses) {
        // Check if responses exist in Firestore
        setLoadingMessage('Checking existing responses...');
        const responsesRef = collection(db, 'Responses');
        const responsesQuery = query(
          responsesRef,
          where('userId', '==', userId),
          where('sessionId', '==', sessionId)
        );
        const existingResponses = await getDocs(responsesQuery);

        if (!existingResponses.empty) {
          console.log('Responses already exist in Firestore, caching them');
          const responseData = existingResponses.docs[0].data();
          await cacheData(responsesCacheKey, responseData);
        } else {
          setLoadingMessage('Saving responses...');
          console.log('Saving responses to Firestore');
          const firestoreStart = Date.now();

          const responseData = {
            userId,
            sessionId,
            responses: parsedResponses,
            timestamp: new Date().toISOString(),
          };

          await addDoc(responsesRef, responseData);
          await cacheData(responsesCacheKey, responseData);
          console.log(`Firestore save took ${Date.now() - firestoreStart}ms`);
        }
      }

      // Check cache for therapy suggestion
      const suggestionCacheKey = CACHE_KEYS.THERAPY_SUGGESTION(userId, sessionId);
      const cachedSuggestion = await getCachedData(suggestionCacheKey);

      if (cachedSuggestion) {
        console.log('Using cached therapy suggestion');
        setRecommendation(cachedSuggestion);
        setIsLoading(false);
        return;
      }

      // Check if therapy suggestion exists in Firestore
      const suggestionsRef = collection(db, 'therapySuggestions');
      const suggestionsQuery = query(
        suggestionsRef,
        where('userId', '==', userId),
        where('sessionId', '==', sessionId)
      );
      const existingSuggestions = await getDocs(suggestionsQuery);

      if (!existingSuggestions.empty) {
        console.log('Therapy suggestion exists in Firestore, caching it');
        const existingSuggestion = existingSuggestions.docs[0].data();
        const recommendationData = {
          mentalHealthIssue: existingSuggestion.condition,
          therapy: existingSuggestion.suggestion,
          therapyDescription: existingSuggestion.therapyDescription,
          environmentId: existingSuggestion.environmentId,
          environment: existingSuggestion.environment
        };
        await cacheData(suggestionCacheKey, recommendationData);
        setRecommendation(recommendationData);
        setIsLoading(false);
        return;
      }

      setLoadingMessage('Predicting condition...');
      console.log('Calling /predict_pre_therapy');
      const predictStart = Date.now();
      
      // Configure axios with longer timeout and retry logic
      const axiosConfig = {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      };

      const conditionResponse = await axios.post(
        `${API_URL}/predict_pre_therapy`, 
        { responses: parsedResponses }, 
        axiosConfig
      );

      if (conditionResponse.status !== 200) {
        throw new Error(`Prediction failed: ${conditionResponse.data.error || 'Unknown error'}`);
      }

      console.log(`Predict pre-therapy took ${Date.now() - predictStart}ms`, conditionResponse.data);
      const mentalHealthIssue = conditionResponse.data.condition;

      setLoadingMessage('Fetching recommendation...');
      console.log('Calling /recommend_therapy');
      const recommendStart = Date.now();
      
      const therapyResponse = await axios.post(
        `${API_URL}/recommend_therapy`, 
        { condition: mentalHealthIssue }, 
        axiosConfig
      );

      if (therapyResponse.status !== 200) {
        throw new Error(`Therapy recommendation failed: ${therapyResponse.data.error || 'Unknown error'}`);
      }

      console.log(`Recommend therapy took ${Date.now() - recommendStart}ms`, therapyResponse.data);

      // Validate therapy response
      if (!therapyResponse.data.therapy || !therapyResponse.data.environmentId) {
        throw new Error('Invalid therapy response: Missing therapy or environmentId');
      }

      // Fetch environment data from Firestore
      setLoadingMessage('Fetching environment details...');
      const environmentId = therapyResponse.data.environmentId;
      console.log('Fetching environment from Firestore:', environmentId);
      const envDocRef = doc(db, 'environments', environmentId);
      const envDoc = await getDoc(envDocRef);

      if (!envDoc.exists()) {
        throw new Error(`Environment with ID ${environmentId} not found in Firestore`);
      }

      const environmentData = envDoc.data();

      // Validate required environment fields
      const requiredFields = ['title', 'description', 'benefits', 'imageUrl'];
      const missingFields = requiredFields.filter(field => !environmentData[field]);
      if (missingFields.length > 0) {
        throw new Error(`Environment data missing required fields: ${missingFields.join(', ')}`);
      }

      // Save therapy suggestion with environment data
      setLoadingMessage('Saving therapy suggestion...');
      await addDoc(suggestionsRef, {
        userId,
        sessionId,
        condition: mentalHealthIssue,
        suggestion: therapyResponse.data.therapy,
        therapyDescription: therapyResponse.data.therapyDescription || 'A personalized therapy to support your mental well-being.',
        environmentId,
        environment: {
          title: environmentData.title,
          description: environmentData.description,
          benefits: Array.isArray(environmentData.benefits) ? environmentData.benefits : ['Unknown benefits'],
          imageUrl: environmentData.imageUrl,
          duration: environmentData.duration || '20min',
          videoUrl: environmentData.videoUrl || '',
          guidanceAudioUrl: environmentData.guidanceAudioUrl || '',
          ambientAudioUrl: environmentData.ambientAudioUrl || '',
        },
        recommendedAt: new Date().toISOString(),
      });

      // After getting new recommendation, cache it
      const recommendationData = {
        mentalHealthIssue,
        therapy: therapyResponse.data.therapy,
        therapyDescription: therapyResponse.data.therapyDescription || 'A personalized therapy to support your mental well-being.',
        environmentId,
        environment: {
          title: environmentData.title,
          description: environmentData.description,
          benefits: Array.isArray(environmentData.benefits) ? environmentData.benefits : ['Unknown benefits'],
          imageUrl: environmentData.imageUrl,
          duration: environmentData.duration || '20min',
          videoUrl: environmentData.videoUrl || '',
          guidanceAudioUrl: environmentData.guidanceAudioUrl || '',
          ambientAudioUrl: environmentData.ambientAudioUrl || '',
        },
      };

      // Cache the environment data
      const environmentCacheKey = CACHE_KEYS.ENVIRONMENT(environmentId);
      await cacheData(environmentCacheKey, environmentData);

      // Cache the recommendation
      await cacheData(suggestionCacheKey, recommendationData);

      setRecommendation(recommendationData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in saveResponsesAndGetRecommendation:', error);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying... Attempt ${retryCount + 1} of ${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        return saveResponsesAndGetRecommendation(retryCount + 1, maxRetries);
      }
      
      setError(error.message);
      setIsLoading(false);
    }
  };

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
          duration: 15000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ),
    ]).start();
  }, [fadeAnim, slideAnim, rotateValue]);

  const onGestureEvent = (event) => {
    if (isDragging) {
      const newAngle = rotateAngle + event.nativeEvent.translationX / 2;
      setRotateAngle(newAngle);
      rotateValue.value = newAngle;
    }
  };

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === State.BEGAN) {
      setIsDragging(true);
    } else if (event.nativeEvent.state === State.END) {
      setIsDragging(false);
    }
  };

  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const imageRotation = isDragging ? `${rotateAngle}deg` : spin;

  const handleStartTherapy = async () => {
    try {
      if (!recommendation) {
        throw new Error('No recommendation available');
      }
      console.log('Navigating to TherapySessionScreen', recommendation);
      router.push({
        pathname: '/TherapyScreen',
        params: {
          environment: recommendation.environmentId,
          therapy: recommendation.therapy,
          mentalHealthIssue: recommendation.mentalHealthIssue,
          sessionId,
        },
      });
    } catch (err) {
      console.error('Error starting therapy:', err.message);
      Alert.alert('Error', `Failed to start therapy: ${err.message}`);
    }
  };

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
              <PanGestureHandler onGestureEvent={onGestureEvent} onHandlerStateChange={onHandlerStateChange}>
                <Animated.View style={styles.panoramaContainer}>
                  <Animated.Image
                    source={{ uri: environment.imageUrl }}
                    style={[styles.environmentImage, spin]}
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
              </PanGestureHandler>
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
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 250,
    backgroundColor: '#000',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  panoramaContainer: {
    width: '100%',
    height: '100%',
  },
  environmentImage: {
    width: '100%',
    height: '100%',
  },
  panoramaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  dragText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontSize: 14,
  },
  environmentBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
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
    padding: 0,
  },
  environmentDescriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  environmentDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  benefitsContainer: {
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 10,
    flex: 1,
  },
  noBenefitsText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  sessionInfoContainer: {
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sessionInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionInfoText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 10,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  startButton: {
    backgroundColor: '#6A8CAF',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 12,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  alternativeButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  alternativeButtonText: {
    color: '#6A8CAF',
    fontSize: 16,
  },
  loadingText: {
    fontSize: 18,
    color: '#333333',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
    marginHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#6A8CAF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default RecommendationScreen;
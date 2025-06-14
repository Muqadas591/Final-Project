import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  SafeAreaView,
  Platform,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { db, auth } from '../firebase/init';
import firebase from 'firebase/compat/app';

const API_URL = 'http://localhost:5000';

let Camera;
let FaceDetector;
if (Platform.OS !== 'web') {
  Camera = require('expo-camera').Camera;
  FaceDetector = require('expo-face-detector');
}

const environments = {
  forest: { title: 'Peaceful Forest', nextSession: 'beach' },
  beach: { title: 'Tranquil Beach', nextSession: 'mountains' },
  mountains: { title: 'Mountain Retreat', nextSession: 'garden' },
  garden: { title: 'Japanese Garden', nextSession: 'forest' },
};

const SessionCompleteScreen = () => {
  const params = useLocalSearchParams();
  const sessionId = params.sessionId;
  const [environment, setEnvironment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [sentimentResult, setSentimentResult] = useState('');
  const [sentimentLabel, setSentimentLabel] = useState(null);
  const [cameraResult, setCameraResult] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef(null);
  const router = useRouter();
  const now = new Date();

  useEffect(() => {
    const fetchSessionAndEnvironment = async () => {
      setIsLoading(true);
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in to view session details.');
        setIsLoading(false);
        return;
      }

      try {
        const sessionsRef = db.collection('sessions');
        const sessionsQuery = sessionsRef
          .where('userId', '==', user.uid)
          .orderBy('timestamp', 'desc')
          .limit(1);
        const sessionSnapshot = await sessionsQuery.get();

        if (sessionSnapshot.empty) {
          setEnvironment({ title: 'No Session Data' });
          setIsLoading(false);
          return;
        }

        const latestSession = sessionSnapshot.docs[0].data();
        const environmentIdFromSession = latestSession.environmentId;

        const envDoc = await db.collection('environments').doc(environmentIdFromSession).get();
        setEnvironment(envDoc.exists ? envDoc.data() : { title: 'Unknown Environment' });
      } catch (error) {
        console.error('Error fetching session/environment:', error);
        setEnvironment({ title: 'Error' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionAndEnvironment();
  }, []);

  useEffect(() => {
    const requestCameraPermission = async () => {
      if (Platform.OS !== 'web' && Camera) {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } else {
        setHasPermission(false);
      }
    };

    requestCameraPermission();
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  const analyzeSentiment = async () => {
    try {
      const res = await axios.post(`${API_URL}/sentiment`, { text: feedbackText });
      const resultMessage = res.data.result;
      setSentimentResult(resultMessage);
      const sentimentMatch = resultMessage.match(/suggests (\w+)\./);
      setSentimentLabel(sentimentMatch?.[1]?.toLowerCase() || null);
    } catch (error) {
      setSentimentResult('Error analyzing sentiment');
      setSentimentLabel(null);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });

      try {
        const res = await axios.post(`${API_URL}/analyze_emotion`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setCameraResult(res.data.result);
        setShowCamera(false);
      } catch {
        setCameraResult('Error analyzing emotion');
      }
    }
  };

  const handleSaveAndReturn = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save your feedback');
      return;
    }

    setIsSaving(true);
    try {
      const userId = user.uid;
      const now = new Date();
      
      // Validate required fields
      if (!feedbackText.trim()) {
        Alert.alert('Error', 'Please provide feedback before saving');
        setIsSaving(false);
        return;
      }

      // Get the latest session data to get the predicted issue and recommended therapy
      const sessionsSnapshot = await db.collection('sessions')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(1)
        .get();

      let predictedIssue = 'stress'; // default value
      let recommendedTherapy = environment?.title || 'Unknown Therapy';
      let sessionStatus = 'completed';

      if (!sessionsSnapshot.empty) {
        const latestSession = sessionsSnapshot.docs[0].data();
        predictedIssue = latestSession.predictedIssue || predictedIssue;
        recommendedTherapy = latestSession.recommendedTherapy || recommendedTherapy;
        sessionStatus = latestSession.status || sessionStatus;
      }
      

      // Create a properly formatted session data object
      const sessionData = {
        userId,
        sessionId: sessionId || `feedback_${Date.now()}`,
        feedback: feedbackText.trim(),
        sentiment: sentimentResult || 'neutral',
        emotion: cameraResult || 'neutral',
        sessionsTaken: sessionsSnapshot.size,
        mentalHealthIssue: predictedIssue,
        therapy: recommendedTherapy,
        status: sessionStatus,
        createdAt: firebase.firestore.Timestamp.fromDate(now),
        updatedAt: firebase.firestore.Timestamp.fromDate(now),
        timestamp: firebase.firestore.Timestamp.fromDate(now),
      };
       Object.keys(sessionData).forEach(key => {
        if (sessionData[key] === undefined) {
          sessionData[key] = null;
        }
      });

      console.log('Session data to be saved:', sessionData);

      // Add the feedback document with error handling
      try {
        const feedbackRef = db.collection('feedback');
        await feedbackRef.add(sessionData);
        
        Alert.alert('Success', 'Feedback and session details saved!');
        router.push('/home');
      } catch (writeError) {
        console.error('Error writing to Firestore:', writeError);
        Alert.alert(
          'Error',
          'Failed to save feedback. Please try again.'
        );
      }
    } catch (error) {
      console.error('Error in handleSaveAndReturn:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading session details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.headerTitle}>Session Complete - {environment?.title}</Text>
        <ScrollView>
          <View style={styles.feedbackSection}>
            <Text style={styles.sectionTitle}>How are you feeling?</Text>
            <TextInput
              style={styles.feedbackInput}
              multiline
              placeholder="Describe your experience..."
              value={feedbackText}
              onChangeText={setFeedbackText}
            />
            <TouchableOpacity
              style={styles.analysisButton}
              onPress={analyzeSentiment}
              disabled={!feedbackText}
            >
              <Text style={styles.analysisButtonText}>Analyze Sentiment</Text>
            </TouchableOpacity>

            {sentimentLabel === 'positive' && (
              <Text style={[styles.resultText, styles.positiveSentimentText]}>
                You are doing great! Keep up the positive outlook.
              </Text>
            )}
            {sentimentLabel === 'negative' && (
              <Text style={[styles.resultText, styles.negativeSentimentText]}>
                It seems you are feeling down. Consider trying another therapy session or exercise.
              </Text>
            )}
            {sentimentLabel !== 'positive' && sentimentLabel !== 'negative' && sentimentResult && (
              <Text style={styles.resultText}>{sentimentResult}</Text>
            )}

            {Platform.OS !== 'web' && hasPermission && (
              <TouchableOpacity
                style={styles.facialAnalysisButton}
                onPress={() => setShowCamera(true)}
              >
                <Text style={styles.facialAnalysisButtonText}>Analyze Facial Expression</Text>
              </TouchableOpacity>
            )}

            {!hasPermission && (
              <Text style={styles.warningText}>Facial analysis is not available on this platform.</Text>
            )}

            {cameraResult && <Text style={styles.resultText}>{cameraResult}</Text>}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveAndReturn}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save & Return Home'}</Text>
        </TouchableOpacity>
      </Animated.View>

      {showCamera && hasPermission && Platform.OS !== 'web' && (
        <View style={styles.cameraContainer}>
          <Camera ref={cameraRef} style={styles.cameraPreview} type={Camera.Constants.Type.front}>
            <View style={styles.cameraControlsContainer}>
              <TouchableOpacity style={styles.cameraButton} onPress={takePicture}>
                <Text style={styles.cameraButtonText}>Take Picture</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCamera(false)}>
                <Text style={styles.cameraButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Camera>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  content: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#666' },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
  },
  feedbackSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333333', marginBottom: 10 },
  feedbackInput: {
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    padding: 12,
    height: 120,
    textAlignVertical: 'top',
  },
  analysisButton: {
    backgroundColor: '#6A8CAF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  analysisButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  facialAnalysisButton: {
    backgroundColor: '#6A8CAF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  facialAnalysisButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  saveButton: {
    backgroundColor: '#6A8CAF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  cameraContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 },
  cameraPreview: { flex: 1 },
  cameraControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  cameraButton: {
    backgroundColor: '#6A8CAF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    width: '45%',
  },
  cancelButton: {
    backgroundColor: '#E29578',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    width: '45%',
  },
  cameraButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  warningText: { color: '#E29578', marginTop: 10, textAlign: 'center' },
  saveButtonDisabled: { opacity: 0.7 },
  resultText: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F0F4F8',
    borderRadius: 8,
    color: '#333333',
  },
  positiveSentimentText: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
    fontWeight: 'bold',
  },
  negativeSentimentText: {
    backgroundColor: '#F8D7DA',
    color: '#721C24',
    fontWeight: 'bold',
  },
});

export default SessionCompleteScreen;

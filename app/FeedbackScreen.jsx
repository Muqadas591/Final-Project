import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Animated, SafeAreaView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import axios from 'axios';
import { API_URL } from 'react-native-dotenv';

// Import Camera conditionally to handle web environment
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
  const environmentId = params.environment || 'forest';
  const environment = environments[environmentId];
  const [feedbackText, setFeedbackText] = useState('');
  const [sentimentResult, setSentimentResult] = useState('');
  const [cameraResult, setCameraResult] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // Request camera permissions only on native platforms
    const requestCameraPermission = async () => {
      if (Platform.OS !== 'web' && Camera) {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } else {
        // On web, set permission to false
        setHasPermission(false);
      }
    };
    
    requestCameraPermission();
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);
  
  const uploadImage = async (uri, userId) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const imageRef = ref(storage, `facial_images/${userId}/${Date.now()}.jpg`);
    await uploadBytes(imageRef, blob);
    return await getDownloadURL(imageRef);
  };
  const analyzeSentiment = async () => {
    try {
      const res = await axios.post(`${API_URL}/sentiment`, { text: feedbackText });
      setSentimentResult(res.data.result);
    } catch (error) {
      setSentimentResult('Error analyzing sentiment');
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
      } catch (error) {
        setCameraResult('Error analyzing emotion');
      }
    }
  };

  // Check if camera is available on this platform
  const isCameraAvailable = Platform.OS !== 'web' && Camera !== undefined;

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text style={styles.headerTitle}>Session Complete - {environment.title}</Text>
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
            <TouchableOpacity style={styles.analysisButton} onPress={analyzeSentiment} disabled={!feedbackText}>
              <Text style={styles.analysisButtonText}>Analyze Sentiment</Text>
            </TouchableOpacity>
            {sentimentResult && <Text>{sentimentResult}</Text>}
            
            {/* Only show facial analysis button if camera is available */}
            {isCameraAvailable && hasPermission && (
              <TouchableOpacity style={styles.facialAnalysisButton} onPress={() => setShowCamera(true)}>
                <Text style={styles.facialAnalysisButtonText}>Analyze Facial Expression</Text>
              </TouchableOpacity>
            )}
            
            {/* Show message if camera is not available */}
            {!isCameraAvailable && (
              <Text style={styles.warningText}>
                Facial analysis is not available on this platform.
              </Text>
            )}
            
            {cameraResult && <Text>{cameraResult}</Text>}
          </View>
        </ScrollView>
        <TouchableOpacity style={styles.saveButton} onPress={() => router.push('/home')}>
          <Text style={styles.saveButtonText}>Save & Return Home</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Only render camera if it's available and permissions are granted */}
      {showCamera && hasPermission && isCameraAvailable && (
        <View style={styles.cameraContainer}>
          <Camera 
            ref={cameraRef} 
            style={styles.cameraPreview} 
            type={Camera.Constants.Type.front}
          >
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
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333333', textAlign: 'center', marginBottom: 20 },
  feedbackSection: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333333', marginBottom: 10 },
  feedbackInput: { backgroundColor: '#F0F4F8', borderRadius: 10, padding: 12, height: 120, textAlignVertical: 'top' },
  analysisButton: { backgroundColor: '#6A8CAF', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  analysisButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  facialAnalysisButton: { backgroundColor: '#6A8CAF', padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  facialAnalysisButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  saveButton: { backgroundColor: '#6A8CAF', padding: 16, borderRadius: 12, alignItems: 'center' },
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
    padding: 20
  },
  cameraButton: { backgroundColor: '#6A8CAF', padding: 12, borderRadius: 12, alignItems: 'center', width: '45%' },
  cancelButton: { backgroundColor: '#E29578', padding: 12, borderRadius: 12, alignItems: 'center', width: '45%' },
  cameraButtonText: { color: '#FFFFFF', fontWeight: 'bold' },
  warningText: { color: '#E29578', marginTop: 10, textAlign: 'center' }
});

export default SessionCompleteScreen;
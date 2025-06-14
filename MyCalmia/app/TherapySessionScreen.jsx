import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { saveTherapyHistory } from '../firebase/firestore';
import { uploadFile } from '../firebase/storage';
import { auth } from '../firebase/firebaseConfig';

const TherapySessionScreen = ({ route, navigation }) => {
  const [sessionData, setSessionData] = useState({
    type: route.params?.type || 'general',
    duration: 0,
    notes: '',
    mediaFiles: []
  });

  const handleSaveSession = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.log('User not authenticated');
        return;
      }

      // Upload any media files
      const uploadedFiles = await Promise.all(
        sessionData.mediaFiles.map(file => 
          uploadFile(file.uri, file.name, {
            customMetadata: {
              sessionType: sessionData.type,
              sessionDate: new Date().toISOString()
            }
          })
        )
      );

      // Save session data with file references
      await saveTherapyHistory(userId, {
        ...sessionData,
        mediaFiles: uploadedFiles,
        timestamp: new Date()
      });

      navigation.goBack();
    } catch (error) {
      console.error('Error saving therapy session:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Therapy Session</Text>
      
      <View style={styles.sessionInfo}>
        <Text style={styles.label}>Session Type:</Text>
        <Text style={styles.value}>{sessionData.type}</Text>
      </View>

      <View style={styles.sessionInfo}>
        <Text style={styles.label}>Duration:</Text>
        <Text style={styles.value}>{sessionData.duration} minutes</Text>
      </View>

      <TouchableOpacity 
        style={styles.saveButton}
        onPress={handleSaveSession}
      >
        <Text style={styles.buttonText}>Save Session</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sessionInfo: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 10,
  },
  value: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TherapySessionScreen;

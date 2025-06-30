import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase/init';

export default function SessionHistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/LogInScreen');
      } else {
        setIsAuthChecked(true);
        fetchSessions();
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchSessions = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsLoading(true);
    try {
      const q = db.collection('sessions')
        .where('userId', '==', user.uid)
        .orderBy('timestamp', 'desc');
      const snapshot = await q.get();
      const sessionList = snapshot.docs.map((doc) => {
        const data = doc.data();
        const timestamp = data.timestamp || data.exitedAt;
        return {
          id: doc.id,
          environment: data.environmentId || 'Unknown',
          recommendation: data.recommendation || 'None',
          lastVisited: timestamp ? new Date(timestamp.toDate()).toLocaleDateString('en-US', {
            month: 'long',
            day: '2-digit',
            year: 'numeric',
          }) : 'Unknown',
          sessionsTaken: data.sessionsTaken || 1,
          emotion: data.emotion || 'Unknown',
          feedback: data.feedback || 'No feedback',
          mentalHealthIssue: data.mentalHealthIssue || 'Unknown',
          sentiment: data.sentiment || 'Unknown',
          status: data.status || 'Unknown',
          therapy: data.therapy || 'Unknown',
          userId: data.userId || user.uid,
          timestamp: timestamp ? new Date(timestamp.toDate()).toLocaleString('en-US') : 'Unknown',
        };
      });
      setSessions(sessionList);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      Alert.alert('Error', 'Failed to load session history');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSession = (session) => (
    <View key={session.id} style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <MaterialIcons name="event-note" size={20} color="#4F6367" />
        <Text style={styles.sessionDate}>{session.lastVisited}</Text>
      </View>
      <Text style={styles.sessionTitle}>Therapy: <Text style={styles.sessionValue}>{session.therapy}</Text></Text>
      <Text style={styles.sessionTitle}>Environment: <Text style={styles.sessionValue}>{session.environment}</Text></Text>
      <Text style={styles.sessionTitle}>Status: <Text style={styles.sessionValue}>{session.status}</Text></Text>
      {session.mentalHealthIssue && (
        <Text style={styles.sessionTitle}>Issue: <Text style={styles.sessionValue}>{session.mentalHealthIssue}</Text></Text>
      )}
      {session.feedback && (
        <Text style={styles.sessionTitle}>Feedback: <Text style={styles.sessionValue}>{session.feedback}</Text></Text>
      )}
      <Text style={styles.sessionTitle}>Sessions Taken: <Text style={styles.sessionValue}>{session.sessionsTaken}</Text></Text>
      <Text style={styles.sessionTitle}>Emotion: <Text style={styles.sessionValue}>{session.emotion}</Text></Text>
      <Text style={styles.sessionTitle}>Sentiment: <Text style={styles.sessionValue}>{session.sentiment}</Text></Text>
    </View>
  );

  if (!isAuthChecked) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F4A896" />
          <Text style={styles.emptyText}>Checking authentication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#D8E8E4', '#E1D6F2']} style={styles.gradientBackground}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/home')}>
              <MaterialIcons name="arrow-back" size={24} color="#4F6367" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Session History</Text>
          </View>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F4A896" />
            </View>
          ) : sessions.length > 0 ? (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {sessions.map(renderSession)}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={48} color="#4F6367" />
              <Text style={styles.emptyText}>No session history yet</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4F6367',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sessionCard: {
    backgroundColor: '#F8F9FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionDate: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  sessionTitle: {
    fontSize: 16,
    color: '#4F6367',
    marginBottom: 4,
    fontWeight: '600',
  },
  sessionValue: {
    fontWeight: '400',
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 12,
    textAlign: 'center',
  },
}); 
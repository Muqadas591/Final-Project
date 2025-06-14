import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  Animated,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase/init';

// Get device dimensions
const { width, height } = Dimensions.get('window');

// Navbar Component (unchanged)
const Navbar = () => {
  const router = useRouter();
  const navItems = [
    { icon: <MaterialIcons name="home" size={24} color="#FFF" />, label: 'Home', onPress: () => router.push('/home') },
    { icon: <Feather name="check-square" size={24} color="#FFF" />, label: 'Assessment', onPress: () => router.push('/Questionare') },
    { icon: <MaterialIcons name="settings" size={24} color="#FFF" />, label: 'Settings', onPress: () => router.push('/SettingScreen') },
  ];

  const scales = navItems.map(() => new Animated.Value(1));

  const onPressIn = (index) => Animated.spring(scales[index], { toValue: 1.2, useNativeDriver: true }).start();
  const onPressOut = (index) => Animated.spring(scales[index], { toValue: 1, useNativeDriver: true }).start();

  return (
    <View style={styles.navbarContainer}>
      {navItems.map((item, index) => (
        <TouchableOpacity
          key={item.label}
          style={styles.navbarButton}
          activeOpacity={0.7}
          onPressIn={() => onPressIn(index)}
          onPressOut={() => onPressOut(index)}
          onPress={item.onPress}
        >
          <Animated.View style={[styles.iconContainer, { transform: [{ scale: scales[index] }] }]}>{item.icon}</Animated.View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// User Greeting Component (updated)
const UserGreeting = () => {
  const [greeting, setGreeting] = useState('Good day');
  const [userName, setUserName] = useState('User');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userRef = db.collection('users').doc(user.uid);
          const userSnap = await userRef.get();
          
          if (userSnap.exists) {
            const userData = userSnap.data();
            setUserName(userData.name || 'User');
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  if (isLoading) {
    return (
      <View style={styles.header}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName.split(' ').map((n) => n[0]).join('').slice(0, 2)}</Text>
        </View>
        <View>
          <Text style={styles.greeting}>{greeting}, {userName}</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
      </View>
    </View>
  );
};

// Section Title Component (unchanged)
const SectionTitle = ({ title }) => <Text style={styles.sectionTitle}>{title}</Text>;

// Progress Slider Component (updated)
const ProgressSlider = () => {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      const user = auth.currentUser;
      if (!user) {
        console.log('No user logged in');
        setIsLoading(false);
        return;
      }

      try {
        console.log('Fetching sessions for user:', user.uid);
        
        // Get all sessions for the user without ordering
        const q = db.collection('sessions')
          .where('userId', '==', user.uid)
          .limit(3);
        
        const snapshot = await q.get();
        console.log('User sessions snapshot:', snapshot.size, 'documents found');
        
        if (snapshot.empty) {
          console.log('No sessions found for user');
          setSessions([]);
          setIsLoading(false);
          return;
        }

        const sessionList = snapshot.docs.map((doc) => {
          const data = doc.data();
          console.log('Processing session data:', {
            id: doc.id,
            data: data
          });
          
          // Get the timestamp from either timestamp or exitedAt field
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

        // Sort sessions by timestamp in memory
        sessionList.sort((a, b) => {
          const dateA = a.timestamp ? new Date(a.timestamp) : new Date(0);
          const dateB = b.timestamp ? new Date(b.timestamp) : new Date(0);
          return dateB - dateA;
        });

        console.log('Processed sessions:', sessionList);
        setSessions(sessionList);
      } catch (error) {
        console.error('Error fetching sessions:', error);
        console.error('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        Alert.alert('Error', 'Failed to load sessions. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const renderProgressItem = ({ item }) => (
    <View style={styles.sliderCard}>
      <Text style={styles.sliderTitle}>Session Summary</Text>
      <View style={styles.sliderContent}>
        <Text style={styles.sliderText}>
          Date: <Text style={styles.sliderValue}>{item.lastVisited}</Text>
        </Text>
        <Text style={styles.sliderText}>
          Therapy: <Text style={styles.sliderValue}>{item.therapy}</Text>
        </Text>
        <Text style={styles.sliderText}>
          Environment: <Text style={styles.sliderValue}>{item.environment}</Text>
        </Text>
        <Text style={styles.sliderText}>
          Status: <Text style={styles.sliderValue}>{item.status}</Text>
        </Text>
        {item.mentalHealthIssue && (
          <Text style={styles.sliderText}>
            Issue: <Text style={styles.sliderValue}>{item.mentalHealthIssue}</Text>
          </Text>
        )}
        {item.feedback && (
          <Text style={styles.sliderText}>
            Feedback: <Text style={styles.sliderValue}>{item.feedback}</Text>
          </Text>
        )}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderHeaderText}>Your Therapy Progress</Text>
        <TouchableOpacity>
          <Text style={styles.viewDetailsText}>View All</Text>
        </TouchableOpacity>
      </View>
      {sessions.length > 0 ? (
        <FlatList
          data={sessions}
          renderItem={renderProgressItem}
          keyExtractor={(item) => item.id}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sliderContainer}
        />
      ) : (
        <Text style={styles.noDataText}>No sessions yet. Try a therapy session!</Text>
      )}
    </View>
  );
};

// Journal Component (unchanged)
const Journal = () => {
  const [journalEntry, setJournalEntry] = useState('');
  const [feedbackEntries, setFeedbackEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchFeedback = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const q = db.collection('feedback')
            .where('userId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .limit(1);
          const snapshot = await q.get();
          const feedbackList = snapshot.docs.map((doc) => ({
            id: doc.id,
            content: doc.data().feedback || '',
            date: doc.data().timestamp?.toDate().toLocaleString('en-US', {
              month: 'short',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }) || 'Unknown',
          }));
          setFeedbackEntries(feedbackList);
        } catch (error) {
          console.error('Error fetching feedback:', error);
          Alert.alert('Error', 'Failed to load feedback');
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchFeedback();
  }, []);

  const saveJournalEntry = async () => {
    if (!journalEntry.trim()) {
      Alert.alert('Error', 'Please write something before saving.');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save journal entries.');
      return;
    }

    setIsSaving(true);
    try {
      await db.collection('journal').add({
        userId: user.uid,
        content: journalEntry.trim(),
        timestamp: db.FieldValue.serverTimestamp(),
      });
      setJournalEntry('');
      Alert.alert('Success', 'Journal entry saved!');
    } catch (error) {
      console.error('Error saving journal entry:', error);
      Alert.alert('Error', 'Failed to save journal entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.loadingText}>Loading journal...</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.journalHeader}>
        <Feather name="edit-3" size={20} color="#4F6367" />
        <Text style={styles.journalTitle}>Your Journal</Text>
        <TouchableOpacity 
          style={styles.viewAllButton}
          onPress={() => router.push('./JournalHistoryScreen')}
        >
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.journalInput}
        placeholder="Reflect on your day or therapy session..."
        placeholderTextColor="#757575"
        multiline={true}
        numberOfLines={5}
        value={journalEntry}
        onChangeText={setJournalEntry}
      />
      <TouchableOpacity
        style={[styles.saveButton, (!journalEntry.trim() || isSaving) && styles.disabledButton]}
        disabled={!journalEntry.trim() || isSaving}
        onPress={saveJournalEntry}
      >
        <Text style={styles.saveButtonText}>
          {isSaving ? 'Saving...' : 'Save Entry'}
        </Text>
      </TouchableOpacity>
      {feedbackEntries.length > 0 && (
        <View style={styles.savedEntriesContainer}>
          <Text style={styles.savedEntriesTitle}>Recent Feedback</Text>
          {feedbackEntries.map((entry) => (
            <View key={entry.id} style={styles.savedEntry}>
              <Text style={styles.savedEntryContent} numberOfLines={2}>
                {entry.content}
              </Text>
              <Text style={styles.savedEntryDate}>{entry.date}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// Main Dashboard Screen
export default function Home() {
  const router = useRouter();
  const [dimensions, setDimensions] = useState({ width, height });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsReady(true);
      if (!user) {
        router.replace('/LogInScreen');
      }
    });

    return () => {
      subscription?.remove();
      unsubscribe();
    };
  }, []);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#D8E8E4', '#E1D6F2']} style={styles.gradientBackground}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <UserGreeting />
            <SectionTitle title="Your Progress" />
            <ProgressSlider />
            <SectionTitle title="Journal" />
            <Journal />
          </ScrollView>
          <Navbar />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

// Styles (simplified avatar style)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8F9FD",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F4A896",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4F6367",
  },
  greeting: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4F6367",
  },
  date: {
    fontSize: 14,
    color: "#757575",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#4F6367",
  },
  card: {
    backgroundColor: "#F8F9FD",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sliderHeaderText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F6367",
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#F4A896",
    fontWeight: "500",
  },
  sliderContainer: {
    paddingRight: 16,
  },
  sliderCard: {
    backgroundColor: "#E8D6B8",
    borderRadius: 12,
    padding: 16,
    width: 280,
    marginRight: 12,
  },
  sliderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F6367",
    marginBottom: 8,
  },
  sliderContent: {
    flexDirection: "column",
    gap: 6,
  },
  sliderText: {
    fontSize: 14,
    color: "#757575",
  },
  sliderValue: {
    fontWeight: "600",
    color: "#4F6367",
  },
  journalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  journalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F6367",
    flex: 1,
  },
  viewAllButton: {
    padding: 4,
  },
  viewAllText: {
    fontSize: 14,
    color: "#F4A896",
    fontWeight: "500",
  },
  journalInput: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    padding: 12,
    height: 120,
    textAlignVertical: "top",
    marginBottom: 16,
    color: "#4F6367",
    borderWidth: 1,
    borderColor: "transparent",
  },
  saveButton: {
    backgroundColor: "#F4A896",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    alignSelf: "flex-end",
    paddingHorizontal: 20,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  savedEntriesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8D6B8",
  },
  savedEntriesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F6367",
    marginBottom: 8,
  },
  savedEntry: {
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  savedEntryContent: {
    fontSize: 14,
    color: "#4F6367",
    marginBottom: 4,
  },
  savedEntryDate: {
    fontSize: 12,
    color: "#757575",
    textAlign: "right",
  },
  // Navbar Styles
  navbarContainer: {
    flexDirection: "row",
    backgroundColor: "#4F6367",
    width: 220,
    height: 60,
    alignItems: "center",
    justifyContent: "space-around",
    borderRadius: 30,
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  navbarButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    padding: 20,
  },
});

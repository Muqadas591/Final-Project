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
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth, db } from '../firebase/init';

export default function JournalHistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('journal'); // 'journal' or 'feedback'
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace('/LogInScreen');
      } else {
        setIsAuthChecked(true);
        fetchEntries();
      }
    });

    return () => unsubscribe();
  }, [activeTab]);

  const fetchEntries = async () => {
    const user = auth.currentUser;
    if (!user) return; // Navigation handled by onAuthStateChanged

    setIsLoading(true);
    try {
      const collectionName = activeTab === 'journal' ? 'journal' : 'feedback';
      const q = db.collection(collectionName)
        .where('userId', '==', user.uid)
        .orderBy('timestamp', 'desc');
      
      const snapshot = await q.get();
      const entryList = snapshot.docs.map((doc) => ({
        id: doc.id,
        content: activeTab === 'journal' ? doc.data().content : doc.data().feedback,
        timestamp: doc.data().timestamp?.toDate().toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) || 'Unknown',
      }));
      
      setEntries(entryList);
    } catch (error) {
      console.error('Error fetching entries:', error);
      Alert.alert('Error', 'Failed to load entries');
    } finally {
      setIsLoading(false);
    }
  };

  const renderEntry = (entry) => (
    <View key={entry.id} style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Feather 
          name={activeTab === 'journal' ? 'edit-3' : 'message-circle'} 
          size={20} 
          color="#4F6367" 
        />
        <Text style={styles.entryDate}>{entry.timestamp}</Text>
      </View>
      <Text style={styles.entryContent}>{entry.content}</Text>
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
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <MaterialIcons name="arrow-back" size={24} color="#4F6367" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {activeTab === 'journal' ? 'Journal History' : 'Feedback History'}
            </Text>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'journal' && styles.activeTab]}
              onPress={() => setActiveTab('journal')}
            >
              <Text style={[styles.tabText, activeTab === 'journal' && styles.activeTabText]}>
                Journal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'feedback' && styles.activeTab]}
              onPress={() => setActiveTab('feedback')}
            >
              <Text style={[styles.tabText, activeTab === 'feedback' && styles.activeTabText]}>
                Feedback
              </Text>
            </TouchableOpacity>
            </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F4A896" />
            </View>
          ) : entries.length > 0 ? (
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {entries.map(renderEntry)}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color="#4F6367" />
              <Text style={styles.emptyText}>
                No {activeTab === 'journal' ? 'journal entries' : 'feedback'} yet
              </Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FD',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#F4A896',
  },
  tabText: {
    fontSize: 16,
    color: '#4F6367',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  entryCard: {
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
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  entryContent: {
    fontSize: 16,
    color: '#4F6367',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#4F6367',
    marginTop: 12,
  },
});
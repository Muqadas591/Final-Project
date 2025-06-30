import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../firebase/init';

export default function EnvironmentSelectionScreen() {
  const router = useRouter();
  const [environments, setEnvironments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEnvironments = async () => {
      setIsLoading(true);
      try {
        const snapshot = await db.collection('environments').get();
        const envList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setEnvironments(envList);
      } catch (error) {
        console.error('Error fetching environments:', error);
        Alert.alert('Error', 'Failed to load environments');
      } finally {
        setIsLoading(false);
      }
    };
    fetchEnvironments();
  }, []);

  const renderEnvironment = (env) => (
    <TouchableOpacity
      key={env.id}
      style={styles.envCard}
      onPress={() => {
        if (env.videoUrl) {
          router.push({
            pathname: '/VideoScreen',
            params: { videoUrl: env.videoUrl }
          });
        } else {
          Alert.alert('No Video', 'No video available for this environment.');
        }
      }}
    >
      <View style={styles.envImageContainer}>
        {env.imageUrl ? (
          <Image source={{ uri: env.imageUrl }} style={styles.envImage} resizeMode="cover" />
        ) : (
          <View style={styles.envImagePlaceholder}>
            <Feather name="image" size={48} color="#B0B0B0" />
          </View>
        )}
        <View style={styles.envBadge}>
          <Text style={styles.envBadgeText}>{env.title}</Text>
        </View>
      </View>
      <Text style={styles.envTitle}>{env.title}</Text>
      <Text style={styles.envDescription}>{env.description}</Text>
      <View style={styles.benefitsContainer}>
        <Text style={styles.benefitsTitle}>Benefits</Text>
        {env.benefits && env.benefits.length > 0 ? (
          env.benefits.map((benefit, idx) => (
            <View key={idx} style={styles.benefitItem}>
              <FontAwesome5 name="check-circle" size={16} color="#6A8CAF" />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noBenefitsText}>No benefits listed</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#D8E8E4', '#E1D6F2']} style={styles.gradientBackground}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/RecomendationScreen')}>
              <MaterialIcons name="arrow-back" size={24} color="#4F6367" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Environment</Text>
          </View>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F4A896" />
            </View>
          ) : environments.length > 0 ? (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {environments.map(renderEnvironment)}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color="#4F6367" />
              <Text style={styles.emptyText}>No environments found</Text>
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
  envCard: {
    backgroundColor: '#F8F9FD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  envImageContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  envImage: {
    width: '100%',
    height: '100%',
  },
  envImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  envBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#6A8CAF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  envBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  envTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F6367',
    marginBottom: 6,
  },
  envDescription: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 10,
  },
  benefitsContainer: {
    marginTop: 8,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#4F6367',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
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
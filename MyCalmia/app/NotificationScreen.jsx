import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { db, auth } from '../firebase/init';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore/lite';
import { markNotificationAsRead } from '../firebase/firestore';
import Icon from 'react-native-vector-icons/MaterialIcons';

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [messagingSupported, setMessagingSupported] = useState(true);

  const fetchNotifications = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const checkMessagingSupport = async () => {
      if (Platform.OS === 'web') {
        // Implement messaging support check if needed
        setMessagingSupported(true);
      }
    };
    
    checkMessagingSupport();
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleNotificationPress = (notification) => {
    if (!notification.read) {
      markNotificationAsRead(notification.id);
    }
    // Handle specific notification types
    switch (notification.type) {
      case 'reminder':
        // Handle reminder action
        break;
      case 'motivational':
        // Handle motivational message
        break;
      default:
        // Default notification handling
        break;
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.notificationItem,
        item.read ? styles.readNotification : styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp?.toDate()).toLocaleString()}
        </Text>
      </View>
      {!item.read && (
        <TouchableOpacity 
          style={styles.markAsReadButton}
          onPress={() => markNotificationAsRead(item.id)}
        >
          <Icon name="check-circle" size={24} color="#4CAF50" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {!messagingSupported && (
        <View style={styles.unsupportedBanner}>
          <Text style={styles.unsupportedText}>
            Push notifications are not supported in this browser.
            Please use a supported browser like Chrome or Firefox.
          </Text>
        </View>
      )}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications available</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: '#fff',
  },
  readNotification: {
    opacity: 0.6,
  },
  unreadNotification: {
    backgroundColor: '#f5f5f5',
  },
  notificationContent: {
    flex: 1,
  },
  markAsReadButton: {
    marginLeft: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  unsupportedBanner: {
    backgroundColor: '#ffe6e6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  unsupportedText: {
    color: '#cc0000',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default NotificationScreen;

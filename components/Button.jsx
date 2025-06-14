import React, { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Link } from 'expo-router';
import { StyleSheet, TouchableOpacity, Text, Animated, Easing } from 'react-native';

export default function Button(props) {
  const { title, path, onPress } = props;
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);
  const glowAnim = new Animated.Value(0);

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 200,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
    if (path) {
      router.push(path);
    }
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(217, 176, 255, 0.5)', 'rgba(217, 176, 255, 1)'],
  });

  const glowSpreadColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(191, 123, 255, 0.3)', 'rgba(191, 123, 255, 0.8)'],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.button,
          {
            borderColor: glowColor,
            shadowColor: glowColor,
            backgroundColor: isPressed ? '#D9B0FF' : '#643D88',
          },
        ]}
      >
        <LinearGradient
          colors={isPressed ? ['#D9B0FF', '#D9B0FF'] : ['#643D88', '#643D88']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {path ? (
            <Link href={path} style={styles.link}>
              <Text style={[styles.text, { color: isPressed ? '#643D88' : '#D9B0FF' }]}>
                {title}
              </Text>
            </Link>
          ) : (
            <Text style={[styles.text, { color: isPressed ? '#643D88' : '#D9B0FF' }]}>
              {title}
            </Text>
          )}
        </LinearGradient>
        <Animated.View
          style={[
            styles.glowEffect,
            {
              backgroundColor: glowSpreadColor,
              opacity: glowAnim,
              transform: [
                { perspective: 1.5 },
                { rotateX: '35deg' },
                { scaleY: 0.6 },
              ],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 20,
    borderWidth: 2,
    paddingVertical: 15,
    paddingHorizontal: 30,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
    width: '100%',
    height: '60%',
  },
  gradient: {
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  glowEffect: {
    position: 'absolute',
    top: '120%',
    left: 0,
    right: 0,
    height: '100%',
    borderRadius: 20,
  },
  link: {
    backgroundColor: 'transparent',
  },
});
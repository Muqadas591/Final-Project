"use client"

import React, { useState, useEffect } from "react"
import { 
  Text, 
  View, 
  ScrollView, 
  SafeAreaView, 
  Image, 
  Dimensions, 
  StyleSheet 
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Button from "../components/Button"
import ReusableStyles from "../components/ReusableStyles"

// Get device dimensions
const { width, height } = Dimensions.get("window")

function App() {
  const [isSplashVisible, setSplashVisible] = useState(true)
  const [dimensions, setDimensions] = useState({ width, height })

  useEffect(() => {
    // Handle orientation changes
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions({ width: window.width, height: window.height })
    })

    // Splash screen timer
    const timer = setTimeout(() => {
      setSplashVisible(false)
    }, 3000) // Splash screen duration: 3 seconds

    return () => {
      clearTimeout(timer)
      subscription?.remove()
    }
  }, [])

  // Calculate responsive sizes
  const logoSize = Math.min(dimensions.width * 0.4, 180) // Cap at 180px max size
  const buttonWidth = Math.min(dimensions.width * 0.7, 300) // Cap at 300px max width

  if (isSplashVisible) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient 
          colors={["#91DDCF", "#D8CFF5", "#D5F0C1"]} 
          style={[styles.gradientBackground, ReusableStyles.gradientBackground]}
        >
          <View style={[styles.splashContent, ReusableStyles.overlay]}>
            <View style={[styles.imageContainer, { width: logoSize, height: logoSize }]}>
              <Image 
                source={require("../assets/images/logo.png")} 
                style={[styles.splashImage, ReusableStyles.splashImage]} 
                resizeMode="cover" 
              />
            </View>
            <Text style={[styles.splashTitle, ReusableStyles.splashText]}>Calmia</Text>
            <Text style={[styles.splashTagline, ReusableStyles.splashTagline]}>Find Your Inner Calm</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient 
        colors={["#D8E8E4", "#E1D6F2"]} 
        style={[styles.gradientBackground, ReusableStyles.gradientBackground]}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false} 
          bounces={false}
        >
          <View style={styles.welcomeContent}>
            <View style={[styles.imageContainer, { width: logoSize, height: logoSize }]}>
              <Image 
                source={require("../assets/images/logo.png")} 
                style={[styles.welcomeImage, ReusableStyles.splashImage]} 
                resizeMode="cover" 
              />
            </View>
            <Text style={[styles.welcomeTitle, ReusableStyles.splashText]}>Welcome to Calmia</Text>
            <Text style={[styles.welcomeTagline, ReusableStyles.tagline]}>Find Your Inner Calm</Text>

            <View style={styles.buttonContainer}>
              <Button 
                title="Login Here" 
                path="/LogInScreen" 
                style={[styles.button, { width: buttonWidth }]} 
              />
              <Button 
                title="Signup Here" 
                path="/SignUpScreen" 
                style={[styles.button, { width: buttonWidth }]} 
              />
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  splashContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  imageContainer: {
    borderRadius: 1000, // Very large value to ensure it's circular
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#659287",
    marginBottom: 20,
  },
  splashImage: {
    width: "100%",
    height: "100%",
  },
  welcomeImage: {
    width: "100%",
    height: "100%",
  },
  splashTitle: {
    fontSize: 42,
    fontWeight: "bold",
    color: "#4F6367",
    marginBottom: 10,
    textAlign: "center",
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4F6367",
    marginBottom: 10,
    textAlign: "center",
  },
  splashTagline: {
    fontSize: 18,
    color: "#4F6367",
    marginBottom: 20,
    textAlign: "center",
    fontStyle: "italic",
  },
  welcomeTagline: {
    fontSize: 18,
    color: "#4F6367",
    marginBottom: 40,
    textAlign: "center",
    fontStyle: "italic",
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    gap: 20,
  },
  button: {
    marginVertical: 10,
    height: 50,
  },
})


export default App
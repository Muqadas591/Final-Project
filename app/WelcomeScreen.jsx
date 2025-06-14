"use client"

import React, { useEffect, useRef, useState } from "react"
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Animated, 
  Dimensions, 
  SafeAreaView, 
  TouchableOpacity 
} from "react-native"
import { Video } from "expo-av"
import Toast from "react-native-toast-message"
import { useRouter } from "expo-router"
import Button from "../components/Button"
import { Feather } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"

// Get device dimensions
const { width, height } = Dimensions.get("window")

export default function WelcomeScreen() {
  const router = useRouter()
  const [dimensions, setDimensions] = useState({ width, height })
  const [videoError, setVideoError] = useState(false)
  const fadeAnim = useRef(new Animated.Value(0)).current

  // Handle orientation changes
  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions({ width: window.width, height: window.height })
    })

    // Trigger animation on component mount
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1500,
      useNativeDriver: true,
    }).start()

    return () => subscription?.remove()
  }, [])

  const handleContinue = () => {
    Toast.show({
      type: "success",
      text1: "Let's Begin!",
      text2: "Redirecting to the consultation page...",
      visibilityTime: 3000,
    })

    setTimeout(() => {
      router.push("/Questionare")
    }, 3000)
  }

  const handleGoToHome = () => {
    try {
      router.replace("/home");
    } catch (error) {
      console.error("Navigation error:", error);
      Toast.show({
        type: "error",
        text1: "Navigation Error",
        text2: "Unable to navigate to home screen. Please try again.",
        visibilityTime: 3000,
      });
    }
  }

  const handleGoToQuestionnaire = () => {
    router.push("/Questionare")
  }

  // Calculate responsive sizes
  const cardWidth = Math.min(dimensions.width * 0.9, 500) // Cap at 500px max width

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Video Background */}
      <View style={styles.backgroundContainer}>
        <Video
          source={require("../assets/images/sun sky.mp4")}
          shouldPlay
          isLooping
          isMuted
          resizeMode="cover"
          style={StyleSheet.absoluteFillObject}
          onError={(error) => {
            console.log("Video error:", error)
            setVideoError(true)
          }}
        />

        {/* Fallback background if video fails */}
        {videoError && <LinearGradient colors={["#E8F4F1", "#EFE7F5"]} style={StyleSheet.absoluteFillObject} />}

        {/* Overlay for Card */}
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.cardContainer, { width: cardWidth, opacity: fadeAnim }]}>
              <LinearGradient
                colors={["rgba(248, 243, 233, 0.95)", "rgba(232, 214, 184, 0.95)"]}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Welcome Statement */}
                <Text style={styles.title}>Welcome to Calmia!</Text>

                {/* Therapy Explanation */}
                <Text style={styles.description}>
                  At Calmia, our goal is to provide you with a calming and personalized virtual therapy experience.
                  Through a series of serene landscapes and tailored exercises, we'll help you manage stress and improve
                  your mental well-being.
                </Text>

                {/* Privacy Statement */}
                <Text style={styles.privacy}>
                  Your responses to the following questions will help us personalize your experience. Rest assured, your
                  privacy is our top priority, and all your information will remain secure.
                </Text>

                {/* Navigation Options */}
                <View style={styles.navigationContainer}>
                  <Text style={styles.navigationTitle}>Choose your path:</Text>

                  <View style={styles.buttonContainer}>
                    {/* Continue to Questionnaire Button */}
                    <Button 
                      title="Take Assessment" 
                      onPress={handleGoToQuestionnaire} 
                      style={styles.primaryButton}
                    />

                    {/* Skip to Home Button */}
                    <Button 
                      title="Skip to Dashboard" 
                      onPress={handleGoToHome} 
                      style={styles.secondaryButton}
                    />
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          </ScrollView>

          {/* Back button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Toast Component */}
      <Toast />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  backgroundContainer: {
    flex: 1,
    position: "relative",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(89, 235, 223, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cardContainer: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden", // Important for the gradient to respect the border radius
  },
  cardGradient: {
    padding: 24,
    alignItems: "center",
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4F6367",
    textAlign: "center",
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: "#4F6367",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 24,
  },
  privacy: {
    fontSize: 14,
    color: "#4F6367",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  navigationContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  navigationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4F6367",
    marginBottom: 15,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 15,
  },
  assessmentButton: {
    backgroundColor: "#F4A896",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 15,
    width: "100%",
  },
  skipButton: {
    backgroundColor: "#E8D6B8",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 15,
    width: "100%",
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
})
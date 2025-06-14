"use client"

import React, { useState, useEffect } from "react"
import {
  View,
  TextInput,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
  Dimensions,
  Platform,
  SafeAreaView,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { useForm, Controller } from "react-hook-form"
import { useRouter } from "expo-router"
import IconComponent from "../components/IconComponent"
import Button from "../components/Button"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase/firebaseServices"
import Toast from "react-native-toast-message"

// Get device dimensions
const { width, height } = Dimensions.get("window")

export default function LogInScreen() {
  const [error, setError] = useState("")
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [focusedInput, setFocusedInput] = useState(null)
  const router = useRouter()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm()

  // Update layout on orientation change
  const [dimensions, setDimensions] = useState({ width, height })

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions({ width: window.width, height: window.height })
    })
    return () => subscription?.remove()
  }, [])

  const handleLogin = async (data) => {
    try {
      console.log("Login attempt with email:", data.email)
      await signInWithEmailAndPassword(auth, data.email, data.password)
      
      Toast.show({
        type: "success",
        text1: "Welcome Back!",
        text2: `Logged in as ${data.email}`,
        visibilityTime: 3000,
      })

      setTimeout(() => {
        router.replace("/WelcomeScreen")
      }, 3000)
    } catch (err) {
      setError(err.message)
      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: err.message.includes("user-not-found") 
          ? "User not found" 
          : err.message.includes("wrong-password") 
            ? "Incorrect password" 
            : err.message,
        visibilityTime: 3000,
      })
    }
  }

  // Calculate responsive sizes
  const cardWidth = Math.min(dimensions.width * 0.85, 400) // Cap at 400px max width
  const imageSize = Math.min(dimensions.width * 0.25, 100) // Cap at 100px max size
  const buttonWidth = cardWidth - 40 // Account for padding

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={["#D8E8E4", "#E1D6F2"]} style={styles.gradientBackground}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          >
            <View style={[styles.card, { width: cardWidth }]}>
              <View
                style={[
                  styles.imageContainer,
                  { width: imageSize, height: imageSize, borderRadius: imageSize / 2, top: -imageSize / 2 },
                ]}
              >
                <Image
                  source={require("../assets/images/login.png")}
                  style={[styles.roundImage, { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }]}
                />
              </View>
              <Text style={[styles.title, { marginTop: imageSize / 2 }]}>Log In</Text>

              {/* Email Input */}
              <View style={[styles.inputContainer, focusedInput === "email" && styles.focusedInputContainer]}>
                <IconComponent name="email-outline" style={styles.icon} />
                <Controller
                  control={control}
                  name="email"
                  rules={{
                    required: "Email is required",
                    pattern: {
                      value: /\S+@\S+\.\S+/,
                      message: "Invalid email address",
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      onBlur={() => {
                        setFocusedInput(null)
                        onBlur()
                      }}
                      onFocus={() => setFocusedInput("email")}
                      onChangeText={onChange}
                      value={value}
                      keyboardType="email-address"
                      placeholderTextColor="#757575"
                      selectionColor="#F4A896"
                      cursorColor="#F4A896"
                      underlineColorAndroid="transparent"
                    />
                  )}
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}

            {/* Password Input - Fixed Version */}
<View style={[styles.inputContainer, focusedInput === "password" && styles.focusedInputContainer]}>
  <IconComponent name="lock-outline" style={styles.icon} />
  <Controller
    control={control}
    name="password"
    rules={{ 
      required: "Password is required",
      minLength: { 
        value: 6, 
        message: "Password must be at least 6 characters" 
      } 
    }}
    render={({ field: { onChange, onBlur, value } }) => (
      <TextInput
        style={[styles.input, { paddingRight: 40 }]}
        placeholder="Password"
        onBlur={() => {
          setFocusedInput(null)
          onBlur()
        }}
        onFocus={() => setFocusedInput("password")}
        onChangeText={onChange}
        value={value}
        secureTextEntry={!passwordVisible}
        placeholderTextColor="#757575"
        selectionColor="#F4A896"
        cursorColor="#F4A896"
        underlineColorAndroid="transparent"
      />
    )}
  />
  {/* Fixed eye toggle button */}
  <TouchableOpacity 
    onPress={() => setPasswordVisible(!passwordVisible)} 
    style={{
      position: 'absolute',
      right: 12,
      height: 48,
      width: 40,
      justifyContent: 'center',
      alignItems: 'center',
    }}
  >
    <IconComponent 
      name={passwordVisible ? "eye-outline" : "eye-off-outline"} 
      style={{
        fontSize: 20,
        color: '#757575',
      }}
    />
  </TouchableOpacity>
</View>
{errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}
              {/* Login Button */}
              <Button
                title="Log In"
                onPress={handleSubmit(handleLogin)}
                style={[styles.primaryButton, { width: buttonWidth }]}
              />

              {/* Signup Link */}
              <Button
                title="Sign Up"
                onPress={() => router.replace("/SignUpScreen")}
                style={[styles.secondaryButton, { width: buttonWidth }]}
              />
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </LinearGradient>
      <Toast />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  card: {
    alignItems: "center",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    backgroundColor: "#F8F9FD",
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#fff",
    paddingBottom: 25,
  },
  imageContainer: {
    position: "absolute",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#659287",
    backgroundColor: "#fff",
  },
  roundImage: {
    resizeMode: "cover",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4F6367",
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    paddingHorizontal: 15,
    marginVertical: 10,
    width: "100%",
    shadowColor: "#cff0ff",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 3,
    height: 50,
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative", // Add this to ensure proper positioning of absolute elements
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333333",
    paddingVertical: 8,
    borderWidth: 0,
    outlineStyle: 'none', // This helps on web
  },
  eyeIconContainer: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    // Remove any absolute positioning to prevent overlap
  },
  eyeIcon: {
    fontSize: 20,
    color: '#757575',
  },
  icon: {
    fontSize: 20,
    color: "#F4A896",
    marginRight: 10,
  },
  // You can keep this for backward compatibility, but we'll use eyeIconContainer instead
  iconToggle: {
    padding: 8,
    // Remove position: "absolute" and right: 5 to prevent positioning conflicts
  },
  errorText: {
    color: "#F76C5E",
    fontSize: 14,
    marginTop: -5,
    marginBottom: 10,
    textAlign: "left",
    width: "100%",
  },
  primaryButton: {
    backgroundColor: "#F4A896",
    padding: 15,
    borderRadius: 20,
    marginTop: 20,
    alignItems: "center",
    height: 50,
  },
  secondaryButton: {
    backgroundColor: "#E8D6B8",
    padding: 15,
    borderRadius: 20,
    marginTop: 10,
    alignItems: "center",
    height: 50,
  },
  focusedInputContainer: {
    borderColor: "#F4A896",
    borderWidth: 1.5,
  },
});
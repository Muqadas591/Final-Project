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
import Toast from "react-native-toast-message"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "../firebase/firebaseConfig"
import { doc, setDoc } from "firebase/firestore"

// Get device dimensions
const { width, height } = Dimensions.get("window")

export default function SignUpScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm()
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [focusedInput, setFocusedInput] = useState(null)
  const router = useRouter()

  // Update layout on orientation change
  const [dimensions, setDimensions] = useState({ width, height })

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions({ width: window.width, height: window.height })
    })
    return () => subscription?.remove()
  }, [])

  const saveUserProfile = async (uid, name, email) => {
    try {
      await setDoc(doc(db, "users", uid), {
        name,
        email,
        createdAt: new Date().toISOString(),
      })
      console.log("User profile saved")
    } catch (error) {
      console.error("Error saving user data:", error)
    }
  }

  const handleSignUp = async (data) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password)
      const user = userCredential.user
      
      await saveUserProfile(user.uid, data.name, data.email)

      Toast.show({
        type: "success",
        text1: "Success",
        text2: `Account created successfully for ${data.email}!`,
        visibilityTime: 3000,
      })

      setTimeout(() => {
        router.replace("/WelcomeScreen")
      }, 3000)
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Signup Failed",
        text2: err.message.includes("email-already-in-use") 
          ? "Email already in use" 
          : err.message.includes("weak-password") 
            ? "Password should be at least 6 characters" 
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
                  source={require("../assets/images/signup.jpg")}
                  style={[styles.roundImage, { width: imageSize, height: imageSize, borderRadius: imageSize / 2 }]}
                />
              </View>
              <Text style={[styles.title, { marginTop: imageSize / 2 }]}>Sign Up</Text>

              {/* Name Input */}
              <View style={[styles.inputContainer, focusedInput === "name" && styles.focusedInputContainer]}>
                <IconComponent name="account-outline" style={styles.icon} />
                <Controller
                  control={control}
                  name="name"
                  rules={{
                    required: "Name is required",
                    minLength: {
                      value: 2,
                      message: "Name must be at least 2 characters long",
                    },
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Full Name"
                      onBlur={() => {
                        setFocusedInput(null)
                        onBlur()
                      }}
                      onFocus={() => setFocusedInput("name")}
                      onChangeText={onChange}
                      value={value}
                      placeholderTextColor="#757575"
                      selectionColor="#F4A896"
                      cursorColor="#F4A896"
                      underlineColorAndroid="transparent"
                    />
                  )}
                />
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

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
                      message: "Email is invalid",
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

             {/* Password Input - Fixed with Pinkish Eye Icon */}
<View style={[styles.inputContainer, focusedInput === "password" && styles.focusedInputContainer]}>
  <IconComponent name="lock-outline" style={styles.icon} />
  <Controller
    control={control}
    name="password"
    rules={{
      required: "Password is required",
      minLength: {
        value: 6,
        message: "Password must be at least 6 characters long",
      },
    }}
    render={({ field: { onChange, onBlur, value } }) => (
      <TextInput
        style={[styles.input, { paddingRight: 40 }]} // Add padding to prevent text from going under the icon
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
  {/* Single eye toggle with pinkish color */}
  <TouchableOpacity 
    onPress={() => setPasswordVisible(!passwordVisible)} 
    style={{
      position: 'absolute',
      right: 12,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      width: 40,
    }}
  >
    <IconComponent 
      name={passwordVisible ? "eye-outline" : "eye-off-outline"} 
      style={{
        fontSize: 20,
        color: '#F4A896', // Pinkish color to match your theme
      }}
    />
  </TouchableOpacity>
</View>
{errors.password && <Text style={styles.errorText}>{errors.password.message}</Text>}

              {/* Confirm Password Input */}
              <View style={[styles.inputContainer, focusedInput === "confirmPassword" && styles.focusedInputContainer]}>
                <IconComponent name="lock-outline" style={styles.icon} />
                <Controller
                  control={control}
                  name="confirmPassword"
                  rules={{
                    required: "Confirm password is required",
                    validate: (value) => value === control._getWatch("password") || "Passwords do not match",
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Confirm Password"
                      onBlur={() => {
                        setFocusedInput(null)
                        onBlur()
                      }}
                      onFocus={() => setFocusedInput("confirmPassword")}
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
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>}

              {/* Signup Button */}
              <Button
                title="Sign Up"
                onPress={handleSubmit(handleSignUp)}
                style={[styles.primaryButton, { width: buttonWidth }]}
              />

              {/* Login Link */}
              <Button
                title="Login"
                onPress={() => router.replace("/LogInScreen")}
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
    paddingVertical: 60, // Add padding to ensure the card is fully visible
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
    borderRadius: 30, // Reduced from 40 for better appearance on smaller screens
    borderWidth: 3, // Reduced from 5 for better appearance
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
    borderRadius: 15, // Reduced from 20 for better appearance
    paddingHorizontal: 15,
    marginVertical: 10,
    width: "100%",
    shadowColor: "#cff0ff",
    shadowOffset: { width: 0, height: 5 }, // Reduced shadow
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 3, // Reduced elevation
    height: 50, // Fixed height for consistency
    borderWidth: 1,
    borderColor: "transparent", // Default transparent border
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: "#333333",
    paddingVertical: 8,
     borderWidth: 0,
    outlineStyle: 'none'
  },
  icon: {
    fontSize: 20,
    color: "#F4A896",
    marginRight: 10,
  },
  iconToggle: {
    padding: 8, // Increased touch target
    position: "absolute",
    right: 5,
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
    height: 50, // Fixed height
  },
  secondaryButton: {
    backgroundColor: "#E8D6B8",
    padding: 15,
    borderRadius: 20,
    marginTop: 10,
    alignItems: "center",
    height: 50, // Fixed height
  },
  focusedInputContainer: {
    borderColor: "#F4A896", // Soft pink border that matches the icon color
    borderWidth: 1.5,
  },
})
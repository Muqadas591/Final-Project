"use client"

import { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { auth } from "../firebase/init"
import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from "firebase/auth"

const ChangePasswordScreen = () => {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long")
      return
    }

    const user = auth.currentUser
    if (!user) {
      Alert.alert("Error", "You must be logged in to change your password")
      return
    }

    try {
      // Reauthenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // Update password
      await updatePassword(user, newPassword)
      
      Alert.alert("Success", "Password updated successfully. Please login again with your new password.", [
        {
          text: "OK",
          onPress: async () => {
            try {
              await auth.signOut()
              router.replace("/LogInScreen")
            } catch (error) {
              console.error("Error signing out:", error)
              Alert.alert("Error", "Failed to sign out. Please try again.")
            }
          }
        }
      ])
    } catch (error) {
      console.error("Error changing password:", error)
      if (error.code === "auth/wrong-password") {
        Alert.alert("Error", "Current password is incorrect")
      } else {
        Alert.alert("Error", "Failed to change password. Please try again.")
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FD" />
      <LinearGradient colors={["#D8E8E4", "#E1D6F2"]} style={styles.gradientBackground}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Feather name="arrow-left" size={24} color="#4F6367" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Change Password</Text>
          </View>

          {/* Password Form */}
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#757575"
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  style={styles.eyeIcon}
                >
                  <Feather
                    name={showCurrentPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#4F6367"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#757575"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  style={styles.eyeIcon}
                >
                  <Feather
                    name={showNewPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#4F6367"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#757575"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIcon}
                >
                  <Feather
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#4F6367"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.changeButton} onPress={handleChangePassword}>
              <Text style={styles.changeButtonText}>Change Password</Text>
            </TouchableOpacity>
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
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  backButton: {
    marginRight: 15,
    pointerEvents: "auto",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4F6367",
  },
  formContainer: {
    backgroundColor: "#F8F9FD",
    borderRadius: 15,
    padding: 20,
    boxShadow: "0px 2px 3px rgba(0, 0, 0, 0.1)",
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#4F6367",
    marginBottom: 8,
    fontWeight: "500",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#4F6367",
  },
  eyeIcon: {
    padding: 12,
    pointerEvents: "auto",
  },
  changeButton: {
    backgroundColor: "#F4A896",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
    pointerEvents: "auto",
  },
  changeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default ChangePasswordScreen 
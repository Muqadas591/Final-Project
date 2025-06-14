"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Image,
  Alert,
} from "react-native"
import { Feather, MaterialIcons, FontAwesome } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { auth, db } from "../firebase/init"

// Get device dimensions
const { width, height } = Dimensions.get("window")

const SettingScreen = () => {
  const router = useRouter()
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState("English")
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [showEditNameModal, setShowEditNameModal] = useState(false)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [userName, setUserName] = useState("Jamie Doe")
  const [newUserName, setNewUserName] = useState("")
  const [profileImage, setProfileImage] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")

  // Update layout on orientation change
  const [dimensions, setDimensions] = useState({ width, height })

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions({ width: window.width, height: window.height })
    })
    return () => subscription?.remove()
  }, [])

  // Fetch user data on mount
  useEffect(() => {
    const user = auth.currentUser
    if (user) {
      const userRef = db.collection("users").doc(user.uid)
      userRef.get().then((doc) => {
        if (doc.exists) {
          const data = doc.data()
          setUserName(data.name || "Jamie Doe")
        }
      }).catch((error) => {
        console.error("Error fetching user data:", error)
        Alert.alert("Error", "Failed to load user data")
      })
    }
  }, [])

  const languages = ["English", "Spanish", "French", "German", "Chinese"]

  const handleContactSupport = () => {
    Linking.openURL("mailto:support@mycalmia.com")
  }

  const handlePrivacyPolicy = () => {
    Linking.openURL("https://mycalmia.com/privacy-policy")
  }

  const selectLanguage = (lang) => {
    setLanguage(lang)
    setShowLanguageModal(false)
  }

  const handleEditName = () => {
    setNewUserName(userName)
    setShowEditNameModal(true)
  }

  const saveUserName = async () => {
    if (!newUserName.trim()) {
      Alert.alert("Error", "Username cannot be empty")
      return
    }

    const user = auth.currentUser
    if (!user) {
      Alert.alert("Error", "You must be logged in to update your username")
      setShowEditNameModal(false)
      return
    }

    try {
      await db.collection("users").doc(user.uid).set(
        { name: newUserName.trim() },
        { merge: true }
      )
      setUserName(newUserName)
      Alert.alert("Success", "Username updated successfully")
    } catch (error) {
      console.error("Error updating username:", error)
      Alert.alert("Error", "Failed to update username")
    } finally {
      setShowEditNameModal(false)
    }
  }

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Sorry, we need camera roll permissions to make this work!")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri)
        Alert.alert("Success", "Profile picture updated locally")
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Error", "Failed to update profile picture")
    }
  }

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          onPress: async () => {
            try {
              await auth.signOut()
              router.replace("/LogInScreen")
            } catch (error) {
              console.error("Error logging out:", error)
              Alert.alert("Error", "Failed to log out")
            }
          },
        },
      ],
      { cancelable: true }
    )
  }

  const handleDeleteAccount = () => {
    setShowDeleteAccountModal(true)
  }

  const confirmDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== "delete") {
      Alert.alert("Error", "Please type 'delete' to confirm account deletion.")
      return
    }

    const user = auth.currentUser
    if (!user) {
      Alert.alert("Error", "You must be logged in to delete your account")
      setShowDeleteAccountModal(false)
      return
    }

    try {
      // Delete user data from Firestore
      await db.collection("users").doc(user.uid).delete()
      // Delete user account
      await user.delete()
      setShowDeleteAccountModal(false)
      Alert.alert("Account Deleted", "Your account has been successfully deleted.")
      router.replace("/LogInScreen")
    } catch (error) {
      console.error("Error deleting account:", error)
      Alert.alert("Error", "Failed to delete account. Please try again.")
    }
  }

  // Calculate responsive sizes
  const sectionWidth = dimensions.width - 40 // 20px padding on each side

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FD" />
      <LinearGradient colors={["#D8E8E4", "#E1D6F2"]} style={styles.gradientBackground}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          {/* Profile Section */}
          <View style={[styles.section, { width: sectionWidth }]}>
            <Text style={styles.sectionTitle}>Profile</Text>

            <TouchableOpacity style={styles.settingItem} onPress={pickImage}>
              <View style={styles.settingInfo}>
                <FontAwesome name="user-circle" size={24} color="#F4A896" />
                <Text style={styles.settingLabel}>Change Profile Picture</Text>
              </View>
              <View style={styles.profileImageContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profileImage} />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileImagePlaceholderText}>
                      {userName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </Text>
                  </View>
                )}
                <Feather name="chevron-right" size={20} color="#F4A896" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={handleEditName}>
              <View style={styles.settingInfo}>
                <Feather name="edit-2" size={24} color="#F4A896" />
                <Text style={styles.settingLabel}>Edit Username</Text>
              </View>
              <View style={styles.valueContainer}>
                <Text style={styles.valueText}>{userName}</Text>
                <Feather name="chevron-right" size={20} color="#F4A896" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Notifications Settings */}
          <View style={[styles.section, { width: sectionWidth }]}>
            <Text style={styles.sectionTitle}>Notifications</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Feather name="bell" size={24} color="#F4A896" />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: "#E5E5EA", true: "#F4A896" }}
                thumbColor={notifications ? "#FFFFFF" : "#FFFFFF"}
                ios_backgroundColor="#E5E5EA"
              />
            </View>
          </View>

          {/* Language Settings */}
          <View style={[styles.section, { width: sectionWidth }]}>
            <Text style={styles.sectionTitle}>Language</Text>

            <TouchableOpacity style={styles.settingItem} onPress={() => setShowLanguageModal(true)}>
              <View style={styles.settingInfo}>
                <Feather name="globe" size={24} color="#F4A896" />
                <Text style={styles.settingLabel}>App Language</Text>
              </View>
              <View style={styles.languageButton}>
                <Text style={styles.languageText}>{language}</Text>
                <Feather name="chevron-right" size={20} color="#F4A896" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Account Settings */}
          <View style={[styles.section, { width: sectionWidth }]}>
            <Text style={styles.sectionTitle}>Account</Text>

            <TouchableOpacity style={styles.settingItem} onPress={() => router.push("/ChangePasswordScreen")}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="security" size={24} color="#F4A896" />
                <Text style={styles.settingLabel}>Change Password</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#F4A896" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="delete-outline" size={24} color="#F76C5E" />
                <Text style={[styles.settingLabel, { color: "#F76C5E" }]}>Delete Account</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#F76C5E" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="logout" size={24} color="#F76C5E" />
                <Text style={[styles.settingLabel, { color: "#F76C5E" }]}>Log Out</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#F76C5E" />
            </TouchableOpacity>
          </View>

          {/* Support */}
          <View style={[styles.section, { width: sectionWidth }]}>
            <Text style={styles.sectionTitle}>Support</Text>

            <TouchableOpacity style={styles.settingItem} onPress={handleContactSupport}>
              <View style={styles.settingInfo}>
                <Feather name="mail" size={24} color="#F4A896" />
                <Text style={styles.settingLabel}>Contact Support</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#F4A896" />
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <View style={[styles.section, { width: sectionWidth }]}>
            <Text style={styles.sectionTitle}>Legal</Text>

            <TouchableOpacity style={styles.settingItem} onPress={handlePrivacyPolicy}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="privacy-tip" size={24} color="#F4A896" />
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#F4A896" />
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={[styles.section, { width: sectionWidth }]}>
            <Text style={styles.sectionTitle}>About</Text>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Feather name="info" size={24} color="#F4A896" />
                <Text style={styles.settingLabel}>App Version</Text>
              </View>
              <Text style={styles.versionText}>1.0.0</Text>
            </View>
          </View>
        </ScrollView>

        {/* Language Selection Modal */}
        <Modal
          visible={showLanguageModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Language</Text>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[styles.languageOption, language === lang && styles.selectedLanguage]}
                  onPress={() => selectLanguage(lang)}
                >
                  <Text style={[styles.languageOptionText, language === lang && styles.selectedLanguageText]}>
                    {lang}
                  </Text>
                  {language === lang && <Feather name="check" size={20} color="#F4A896" />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowLanguageModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Edit Username Modal */}
        <Modal
          visible={showEditNameModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEditNameModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Username</Text>
              <TextInput
                style={styles.textInput}
                value={newUserName}
                onChangeText={setNewUserName}
                placeholder="Enter new username"
                placeholderTextColor="#757575"
              />
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => setShowEditNameModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.saveModalButton]} onPress={saveUserName}>
                  <Text style={styles.modalButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Delete Account Confirmation Modal */}
        <Modal
          visible={showDeleteAccountModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDeleteAccountModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <Text style={styles.deleteWarningText}>
                Warning: This action cannot be undone. All your data will be permanently deleted.
              </Text>
              <Text style={styles.deleteConfirmText}>Type "delete" to confirm:</Text>
              <TextInput
                style={styles.textInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="Type 'delete' to confirm"
                placeholderTextColor="#757575"
              />
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelModalButton]}
                  onPress={() => setShowDeleteAccountModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.deleteModalButton]} onPress={confirmDeleteAccount}>
                  <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4F6367",
  },
  section: {
    marginBottom: 25,
    backgroundColor: "#F8F9FD",
    borderRadius: 15,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#4F6367",
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 16,
    color: "#4F6367",
    marginLeft: 12,
  },
  languageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8D6B8",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  languageText: {
    fontSize: 16,
    color: "#4F6367",
    marginRight: 8,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  valueText: {
    fontSize: 16,
    color: "#4F6367",
    marginRight: 8,
  },
  versionText: {
    fontSize: 16,
    color: "#757575",
  },
  profileImageContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
  },
  profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8D6B8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  profileImagePlaceholderText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4F6367",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#F8F9FD",
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4F6367",
    marginBottom: 15,
    textAlign: "center",
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  selectedLanguage: {
    backgroundColor: "rgba(244, 168, 150, 0.1)",
  },
  languageOptionText: {
    fontSize: 16,
    color: "#4F6367",
  },
  selectedLanguageText: {
    fontWeight: "bold",
    color: "#F4A896",
  },
  cancelButton: {
    marginTop: 15,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#E8D6B8",
    borderRadius: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F6367",
  },
  textInput: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#4F6367",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelModalButton: {
    backgroundColor: "#E5E5EA",
  },
  saveModalButton: {
    backgroundColor: "#F4A896",
  },
  deleteModalButton: {
    backgroundColor: "#F76C5E",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F6367",
  },
  deleteWarningText: {
    fontSize: 14,
    color: "#F76C5E",
    marginBottom: 15,
    textAlign: "center",
  },
  deleteConfirmText: {
    fontSize: 14,
    color: "#4F6367",
    marginBottom: 10,
  },
})

export default SettingScreen

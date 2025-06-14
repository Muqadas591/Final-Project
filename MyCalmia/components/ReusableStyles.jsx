import { StyleSheet } from "react-native";

const ReusableStyles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  gradientBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
  },
  overlay: {
    justifyContent: "center",
    alignItems: "center",
  },
  
  splashImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    borderRadius: 60,
  },
  splashText: {
    marginTop: 20,
    fontSize: 30,
    fontWeight: "bold",
    color: "#C566A",// Deep charcoal
    fontFamily: "Poppins-Bold",
  },
  splashTagline: {
    marginTop: 10,
    fontSize: 18,
    color: "#ECEFF4", // Warm peach
    fontFamily: "Poppins-Medium",
    textAlign: "center",
  },
  tagline: {
    fontSize: 16,
    color: "#F5B7A5", // Cool grey 
    textAlign: "center",
    marginBottom: 20,
  },

});

export default ReusableStyles;

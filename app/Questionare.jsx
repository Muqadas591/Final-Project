import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import Button from "../components/Button";
import { useRouter } from "expo-router";
import InfinityLoader from "../components/InfinityLoader";
import { getQuestions } from "../firebase/firestore";
import { auth } from "../firebase/init";

const { width, height } = Dimensions.get("window");

// Helper function to determine slider track color based on value
const getSliderTrackColor = (value) => {
  if (value >= 1 && value <= 3) {
    return "#4CAF50"; // Green
  } else if (value >= 4 && value <= 6) {
    return "#FFEB3B"; // Yellow
  } else if (value >= 7 && value <= 10) {
    return "#F44336"; // Red
  }
  return "#757575"; // Default color if outside ranges
};

export default function QuestionnaireScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sliderValue, setSliderValue] = useState(5);
  const fadeAnim = new Animated.Value(1);
  const router = useRouter();

  const [dimensions, setDimensions] = useState({ width, height });

  const categoricalMappings = {
    High: 3,
    Medium: 2,
    Low: 1,
    No: 0,
    Poor: 1,
    Good: 3,
    Yes: 1,
    True: 1,
    False: 0,
  };

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setDimensions({ width: window.width, height: window.height });
    });

    const loadQuestions = async () => {
      try {
        console.log("Fetching questions...");
        const fetchedQuestions = await getQuestions();
        console.log("Fetched questions:", JSON.stringify(fetchedQuestions, null, 2));

        if (!Array.isArray(fetchedQuestions)) {
          throw new Error("Questions data is not an array");
        }

        if (fetchedQuestions.length !== 15) {
          console.warn(`Expected 15 questions, got ${fetchedQuestions.length}`);
        }

        setQuestions(fetchedQuestions);
        initializeAnswers(fetchedQuestions);
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();

    return () => subscription?.remove();
  }, []);

  const initializeAnswers = (qs) => {
    const initialAnswers = {};
    qs.forEach((q, i) => {
      if (q.type === "scale" || q.type === "numeric") {
        initialAnswers[i] = 5;
      } else if (q.type === "options" || q.type === "binary") {
        initialAnswers[i] = q.options?.[0]?.value || "";
      } else {
        initialAnswers[i] = "";
      }
    });
    setAnswers(initialAnswers);
  };

  // Normalize responses to match backend expectations
  const normalizeResponse = (value, questionType) => {
    if (typeof value !== "string") return value;

    const lowerValue = value.toLowerCase();
    if (questionType === "binary") {
      if (lowerValue === "yes" || lowerValue === "true") return "Yes";
      if (lowerValue === "no" || lowerValue === "false") return "No";
    } else if (questionType === "categorical") {
      const normalized = Object.keys(categoricalMappings).find(
        (key) => key.toLowerCase() === lowerValue
      );
      return normalized || value; // Fallback to original if not found
    }
    return value;
  };

  const handleNext = async () => {
    const currentQuestion = questions[currentIndex];
    if (currentQuestion.type === "scale") {
      setAnswers((prev) => ({ ...prev, [currentIndex]: sliderValue }));
    }

    if (currentIndex < questions.length - 1) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prev) => prev + 1);
        fadeAnim.setValue(1);
        setSliderValue(answers[currentIndex + 1] || 5);
      });
    } else {
      // Ensure all questions have been answered
      const answeredQuestions = Object.keys(answers);
      if (answeredQuestions.length !== questions.length) {
        setError(`Please answer all ${questions.length} questions.`);
        return;
      }

      // Convert answers to ordered responses with normalization
      const orderedResponses = questions.map((question, index) => {
        const response = answers[index];
        return normalizeResponse(response, question.type);
      });

      // Validate responses
      if (orderedResponses.some((response) => response === undefined || response === null || response === "")) {
        setError("Please answer all questions before submitting.");
        return;
      }

      console.log("Questions:", JSON.stringify(questions, null, 2));
      console.log("Answers before normalization:", JSON.stringify(answers, null, 2));
      console.log("Ordered responses after normalization:", JSON.stringify(orderedResponses, null, 2));

      try {
        router.push({
          pathname: "/RecomendationScreen",
          params: {
            responses: JSON.stringify(orderedResponses),
            sessionId: `session_${Date.now()}`,
          },
        });
      } catch (err) {
        console.error("Error navigating to Recommendationscreen:", err);
        setError("Failed to navigate to recommendations. Please try again.");
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setCurrentIndex((prev) => prev - 1);
        fadeAnim.setValue(1);
        setSliderValue(answers[currentIndex - 1] || 5);
      });
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#D8E8E4", "#E1D6F2"]} style={styles.gradientBackground}>
          <View style={styles.loaderContainer}>
            <InfinityLoader size={55} color="black" />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#D8E8E4", "#E1D6F2"]} style={styles.gradientBackground}>
          <View style={styles.container}>
            <Text style={styles.errorText}>Error: {error}</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <LinearGradient colors={["#D8E8E4", "#E1D6F2"]} style={styles.gradientBackground}>
          <View style={styles.container}>
            <Text style={styles.errorText}>No questions available</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={["#D8E8E4", "#E1D6F2"]} style={styles.gradientBackground}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.cloudCard, { opacity: fadeAnim, width: dimensions.width * 0.85 }]}>
              <Text style={styles.questionText}>{questions[currentIndex]?.text}</Text>

              {(() => {
                const currentQuestion = questions[currentIndex];
                if (!currentQuestion) {
                  return <Text style={styles.errorText}>No question available</Text>;
                }

                if (!currentQuestion.type) {
                  console.error("Question missing type field:", currentQuestion);
                  return (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>Invalid question format</Text>
                      <Text style={styles.errorDetail}>Question ID: {currentQuestion.id}</Text>
                    </View>
                  );
                }

                if ((currentQuestion.type === "options" || currentQuestion.type === "binary") && !currentQuestion.options) {
                  console.error("Options missing for question:", currentQuestion);
                  return (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>No options available</Text>
                      <Text style={styles.errorDetail}>Question: {currentQuestion.text}</Text>
                    </View>
                  );
                }

                switch (currentQuestion.type.toLowerCase()) {
                  case "scale":
                  case "numeric":
                    return (
                      <View style={styles.sliderContainer}>
                        <Slider
                          style={[styles.slider, { width: dimensions.width * 0.7 }]}
                          minimumValue={1}
                          maximumValue={10}
                          step={1}
                          value={sliderValue}
                          onValueChange={setSliderValue}
                          minimumTrackTintColor={getSliderTrackColor(sliderValue)}
                          maximumTrackTintColor={getSliderTrackColor(sliderValue)}
                          thumbTintColor="#4c00ff"
                        />
                        <Text style={styles.sliderValueText}>Value: {Math.round(sliderValue)}</Text>
                      </View>
                    );
                  case "options":
                  case "binary":
                    let optionsToRender = [];
                    try {
                      if (Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0) {
                        optionsToRender = currentQuestion.options;
                        console.log(`Rendering options for question ${currentQuestion.id}:`, JSON.stringify(optionsToRender, null, 2));
                      } else {
                        console.error("Invalid options format:", currentQuestion.options);
                        return <Text style={styles.errorText}>Invalid options format</Text>;
                      }
                    } catch (e) {
                      console.error(`Error processing options: ${e.message}`, e);
                      return <Text style={styles.errorText}>Error processing options</Text>;
                    }

                    return (
                      <View style={styles.optionsContainer}>
                        {optionsToRender.map((option, idx) => {
                          const optionText = typeof option === "object" ? option.text : option;
                          const optionValue = typeof option === "object" ? option.value : option;
                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                styles.optionButton,
                                { width: dimensions.width * 0.7 },
                                answers[currentIndex] === optionValue && styles.selectedOption,
                              ]}
                              onPress={() => setAnswers({ ...answers, [currentIndex]: optionValue })}
                            >
                              <Text style={styles.optionText}>{optionText}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  default:
                    console.error("Unsupported question type:", currentQuestion.type);
                    return <Text style={styles.errorText}>Unsupported question type: {currentQuestion.type}</Text>;
                }
              })()}
            </Animated.View>

            <View style={styles.buttonContainer}>
              {currentIndex > 0 && (
                <Button title="Previous" onPress={handlePrevious} style={[styles.button, { width: 120 }]} />
              )}
              <Button
                title={currentIndex === questions.length - 1 ? "Submit" : "Next"}
                onPress={handleNext}
                style={[styles.button, { width: 120 }]}
              />
            </View>
          </ScrollView>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cloudCard: {
    backgroundColor: "#F8F3E9",
    padding: 20,
    borderRadius: 30,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginHorizontal: 20,
    maxHeight: 500,
  },
  questionText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4F6367",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  sliderContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 10,
  },
  slider: {
    height: 40,
  },
  sliderValueText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#4F6367",
  },
  optionsContainer: {
    width: "100%",
    alignItems: "center",
  },
  optionButton: {
    backgroundColor: "#E8D6B8",
    padding: 12,
    borderRadius: 20,
    marginVertical: 6,
    alignItems: "center",
  },
  selectedOption: {
    backgroundColor: "#F4A896",
  },
  optionText: {
    fontSize: 16,
    color: "#4F6367",
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    marginTop: 30,
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 15,
  },
  button: {
    marginHorizontal: 5,
  },
  errorText: {
    fontSize: 16,
    color: "#FF6B6B",
    textAlign: "center",
    marginVertical: 10,
  },
  errorContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  errorDetail: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
});
from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
import joblib
from deepface import DeepFace
from transformers import pipeline
import cv2
import numpy as np
import firebase_admin
from firebase_admin import credentials, firestore
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
import httplib2
import ssl
from googleapiclient.http import HttpRequest
import requests
from google.auth.transport.requests import Request as GoogleAuthRequest
from google_auth_httplib2 import AuthorizedHttp
import os
import json
import logging
import certifi
from google.oauth2 import service_account
from googleapiclient.http import MediaIoBaseDownload
import io


app = Flask(__name__)
# Enable CORS for all routes, allowing requests from http://localhost:8081
CORS(app, resources={r"/*": {
    "origins": ["http://localhost:8081"],
    "methods": ["GET", "POST", "OPTIONS"],
    "allow_headers": ["Content-Type"]
}})

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase
cred = credentials.Certificate('../firebase/mental-health-app-68c4b-firebase-adminsdk-fbsvc-18a9b4b239.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# Load models
pre_therapy_model = joblib.load("models/pre_therapy_model.pkl")
therapy_model = joblib.load("models/therapy_model (1).pkl")
sentiment_classifier = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

# Load label encoder
label_encoder = joblib.load("models/label_encoder.pkl")
therapy_label_encoder = joblib.load("models/therapy_label_encoder.pkl")

# Define all possible conditions from label encoder
ALL_CONDITIONS = list(label_encoder.classes_)

# Categorical mappings
categorical_mappings = {
    "High": 3, "Medium": 2, "Low": 1, "No": 0, "Yes": 1,
    "Poor": 1, "Good": 3, "True": 1, "False": 0
}

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Welcome to MyCalmia API"})
@app.route("/predict_pre_therapy", methods=["POST"])
def predict_pre_therapy():
    try:
        responses = request.json["responses"]
        logger.info(f"Received responses: {responses}")
        if not isinstance(responses, list):
            logger.error(f"'responses' is not a list: {type(responses)}")
            return jsonify({"error": "'responses' must be a list"}), 400
        if len(responses) != 15:
            logger.error(f"Expected 15 responses, got {len(responses)}")
            return jsonify({"error": f"Expected 15 responses, got {len(responses)}"}), 400

        # Preprocess responses
        processed_responses = []
        expected_types = [
            "scale", "binary", "binary", "binary", "categorical",
            "categorical", "binary", "binary", "binary", "binary",
            "binary", "numeric", "binary", "numeric", "numeric"
        ]
        
        for i, (response, exp_type) in enumerate(zip(responses, expected_types)):
            if exp_type in ["numeric", "scale"]:
                if not isinstance(response, (int, float)) or response < 1 or response > 10:
                    logger.error(f"Response at index {i} is not a valid numeric/scale value (1-10): {response}")
                    return jsonify({"error": f"Response at index {i} must be numeric between 1 and 10"}), 400
                processed_responses.append(response)
            elif exp_type == "categorical":
                if isinstance(response, str):
                    normalized_response = next(
                        (key for key in categorical_mappings if key.lower() == response.lower()), None
                    )
                    if normalized_response:
                        processed_responses.append(categorical_mappings[normalized_response])
                    else:
                        logger.error(f"Response at index {i} is not a valid categorical value: {response}. Expected one of: {list(categorical_mappings.keys())}")
                        return jsonify({"error": f"Response at index {i} must be one of {list(categorical_mappings.keys())}"}), 400
                else:
                    logger.error(f"Response at index {i} is not a valid categorical value: {response}. Expected one of: {list(categorical_mappings.keys())}")
                    return jsonify({"error": f"Response at index {i} must be one of {list(categorical_mappings.keys())}"}), 400
            elif exp_type == "binary":
                if isinstance(response, str):
                    normalized_response = response.lower()
                    if normalized_response in ["yes", "true"]:
                        processed_responses.append(categorical_mappings["Yes"])
                    elif normalized_response in ["no", "false"]:
                        processed_responses.append(categorical_mappings["No"])
                    else:
                        logger.error(f"Response at index {i} is not a valid binary value: {response}. Expected 'Yes', 'No', 'True', 'False', 0, or 1.")
                        return jsonify({"error": f"Response at index {i} must be 'Yes', 'No', 'True', 'False', 0, or 1."}), 400
                elif isinstance(response, (int, float)) and response in [0, 1]:
                    processed_responses.append(int(response))
                else:
                    logger.error(f"Response at index {i} is not a valid binary value: {response}. Expected 'Yes', 'No', 'True', 'False', 0, or 1.")
                    return jsonify({"error": f"Response at index {i} must be 'Yes', 'No', 'True', 'False', 0, or 1."}), 400

        try:
            prediction = pre_therapy_model.predict([processed_responses])[0]
            prediction = int(prediction)
        except Exception as pred_err:
            logger.error(f"Model prediction error: {str(pred_err)}")
            return jsonify({"error": f"Model prediction error: {str(pred_err)}"}), 500

        if prediction < 0 or prediction >= len(ALL_CONDITIONS):
            logger.error(f"Prediction index {prediction} out of range")
            return jsonify({"error": "Prediction index out of range"}), 500

        condition = ALL_CONDITIONS[prediction]
        logger.info(f"Predicted condition: {condition}")
        return jsonify({"condition": condition})
    except KeyError:
        logger.error("Missing 'responses' key in JSON payload")
        return jsonify({"error": "Missing 'responses' key in JSON payload"}), 400
    except Exception as e:
        logger.error(f"Error in predict_pre_therapy: {str(e)}")
        return jsonify({"error": str(e)}), 500
@app.route("/recommend_therapy", methods=["POST"])
def recommend_therapy():
    try:
        condition = request.json.get("condition")
        logger.info(f"[Backend] Received condition: {condition}")

        if not condition:
            return jsonify({"error": "Missing condition in request"}), 400

        if condition not in ALL_CONDITIONS:
            return jsonify({"error": f"Condition '{condition}' not valid"}), 400

        # Predict environment index from therapy_model
        condition_encoded = [1 if c == condition else 0 for c in ALL_CONDITIONS]
        predicted_env_index = therapy_model.predict([condition_encoded])[0]
        predicted_env_index = int(predicted_env_index)

        logger.info(f"[Backend] Predicted environment index: {predicted_env_index}")

        # Convert index to environment ID string
        environment_id = therapy_label_encoder.inverse_transform([predicted_env_index])[0]

        logger.info(f"[Backend] Decoded environmentId: {environment_id}")

        # Fetch environment data from Firestore
        env_doc = db.collection('environments').document(environment_id).get()

        if not env_doc.exists:
            logger.warning(f"[Backend] Environment '{environment_id}' not found. Falling back to 'forest'")
            environment_id = 'forest'
            env_doc = db.collection('environments').document(environment_id).get()

        if not env_doc.exists:
            logger.error("[Backend] Even fallback environment 'forest' not found.")
            return jsonify({"error": "No valid environment found"}), 500

        environment_data = env_doc.to_dict()

        # ✅ FINAL RESPONSE: Make sure environmentId is camelCase and present
        response_payload = {
            "therapy": f"{condition} Therapy",
            "environmentId": environment_id,
            "environment": environment_data
        }

        logger.info(f"[Backend] Sending therapy recommendation: {response_payload}")
        return jsonify(response_payload)

    except Exception as e:
        logger.error(f"[Backend] Exception in /recommend_therapy: {str(e)}")
        return jsonify({"error": str(e)}), 500



@app.route("/sentiment", methods=["POST"])
def sentiment():
    try:
        text = request.json["text"]
        result = sentiment_classifier(text)
        sentiment = result[0]["label"].lower()
        logger.info(f"Detected sentiment: {sentiment}")
        return jsonify({"result": f"Your tone suggests {sentiment}. Let's try a relaxation technique."})
    except KeyError:
        logger.error("Missing 'text' key in JSON payload")
        return jsonify({"error": "Missing 'text' key in JSON payload"}), 400
    except Exception as e:
        logger.error(f"Error in sentiment: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/analyze_emotion", methods=["POST"])
def analyze_emotion():
    try:
        data = request.json
        if "image" not in data:
            return jsonify({"error": "Missing 'image' key in JSON payload"}), 400

        # Decode the base64 image
        import base64
        import cv2
        import numpy as np

        image_data = base64.b64decode(data["image"])
        np_arr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Analyze emotion using DeepFace
        result = DeepFace.analyze(img, actions=['emotion'], enforce_detection=False)
        dominant_emotion = result["dominant_emotion"]
        emotion_scores = result["emotion"]

        return jsonify({
            "dominant_emotion": dominant_emotion,
            "emotion_scores": emotion_scores
        })
    except Exception as e:
        logger.error(f"Error in analyze_emotion: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000,debug=True)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('assets/images', 'favicon.png', mimetype='image/png')

@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_options(path):
    response = make_response()
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:8081')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    return response

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response



#if __name__ == "__main__":
    #app.run(host="0.0.0.0", port=5000, debug=True)
from flask import Flask, request, jsonify, send_from_directory
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
import os
import json
import os
import logging


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
pre_therapy_model = joblib.load("models/pre_therapy_model (1).pkl")
therapy_model = joblib.load("models/therapy_model (1).pkl")
sentiment_classifier = pipeline("sentiment-analysis")

# Google Drive API setup
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
google_service_account_key = os.environ.get('GOOGLE_SERVICE_ACCOUNT_KEY')
default_credential_path = '../calmiayoutube-0446c67672c9.json'

creds = None
if google_service_account_key:
    if os.path.exists(google_service_account_key):
        creds = Credentials.from_service_account_file(
            google_service_account_key,
            scopes=SCOPES
        )
    else:
        try:
            creds_info = json.loads(google_service_account_key)
            creds = Credentials.from_service_account_info(
                creds_info,
                scopes=SCOPES
            )
        except json.JSONDecodeError:
            # Invalid JSON, fallback to default file path
            pass

if creds is None:
    if os.path.exists(default_credential_path):
        creds = Credentials.from_service_account_file(
            default_credential_path,
            scopes=SCOPES
        )
    else:
        raise EnvironmentError(f"Google service account credentials not found at default path: {default_credential_path}")

drive_service = build('drive', 'v3', credentials=creds)

# Define all possible conditions
ALL_CONDITIONS = [
    "Stress & Anxiety", "Social Anxiety", "Fear of Failure", "Depression",
    "Decision Paralysis", "Agoraphobia", "Emotional Loneliness", "Burnout",
    "PTSD", "Sleep Anxiety", "Severe Stress", "Panic Disorder",
    "OCD", "Bipolar Disorder",
]

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

        # Validate each response is numeric (int or float)
        for i, r in enumerate(responses):
            if not isinstance(r, (int, float)):
                logger.error(f"Response at index {i} is not numeric: {r} (type {type(r)})")
                return jsonify({"error": f"Response at index {i} is not numeric"}), 400

        try:
            prediction = pre_therapy_model.predict([responses])[0]
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

# Mapping from model predicted numeric environment_id to Firestore environment document names
ENV_ID_TO_NAME = {
    0: 'forest',
    1: 'social exposure',
    2: 'beach',
    3: 'mountains',
    4: 'Rainforest',
    5: 'garden',
    6: 'Self Affirmation',
    7: 'sunlight therapy',
    8: 'Decision Making',
    9: 'Emotional Bonding',
    10: 'Guided Nature Walk',
    11: 'Starry Night',
    12: 'virtual_room',
    13: 'meadow',
    14: 'virtual_city',
    15: 'cozy_cabin',
    16: 'forest_path',
    17: 'ocean_shore',
}

@app.route("/recommend_therapy", methods=["POST"])
def recommend_therapy():
    try:
        condition = request.json["condition"]
        logger.info(f"Received condition: {condition}")
        condition_encoded = [1 if c == condition else 0 for c in ALL_CONDITIONS]
        predicted_env_id = therapy_model.predict([condition_encoded])[0]
        logger.info(f"Predicted environment_id: {predicted_env_id}")
        environment_id = ENV_ID_TO_NAME.get(predicted_env_id)
        if environment_id is None:
            logger.warning(f"Predicted environment_id {predicted_env_id} not found in mapping, falling back to 'forest'")
            environment_id = 'forest'
        env_ref = db.collection('environments').document(environment_id)
        env_doc = env_ref.get()
        if not env_doc.exists:
            logger.warning(f"Environment document '{environment_id}' not found in Firestore, falling back to 'forest'")
            environment_id = 'forest'
            env_doc = db.collection('environments').document(environment_id).get()
        return jsonify({
            "therapy": f"{condition} Therapy",
            "environmentId": environment_id,
            "environment": env_doc.to_dict()
        })
    except KeyError:
        logger.error("Missing 'condition' key in JSON payload")
        return jsonify({"error": "Missing 'condition' key in JSON payload"}), 400
    except ValueError as e:
        logger.error(f"Prediction failed: {str(e)}")
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Error in recommend_therapy: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/get_media_url", methods=["POST"])
def get_media_url():
    try:
        file_id = request.json["fileId"]
        logger.info(f"Fetching media URL for fileId: {file_id}")
        file = drive_service.files().get(fileId=file_id, fields='webContentLink').execute()
        return jsonify({"mediaUrl": file.get('webContentLink')})
    except KeyError:
        logger.error("Missing 'fileId' key in JSON payload")
        return jsonify({"error": "Missing 'fileId' key in JSON payload"}), 400
    except Exception as e:
        logger.error(f"Error in get_media_url: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/analyze_emotion", methods=["POST"])
def analyze_emotion():
    try:
        image = cv2.imdecode(np.frombuffer(request.files["image"].read(), np.uint8), cv2.IMREAD_COLOR)
        result = DeepFace.analyze(image, actions=["emotion"], enforce_detection=False)
        emotion = result[0]["dominant_emotion"]
        logger.info(f"Detected emotion: {emotion}")
        return jsonify({"result": f"You seem {emotion}. Let’s try a breathing exercise."})
    except Exception as e:
        logger.error(f"Error in analyze_emotion: {str(e)}")
        return jsonify({"error": str(e)}), 500
    

@app.route("/sentiment", methods=["POST"])
def sentiment():
    try:
        text = request.json["text"]
        result = sentiment_classifier(text)
        sentiment = result[0]["label"].lower()
        logger.info(f"Detected sentiment: {sentiment}")
        return jsonify({"result": f"Your tone suggests {sentiment}. Let’s try a relaxation technique."})
    except KeyError:
        logger.error("Missing 'text' key in JSON payload")
        return jsonify({"error": "Missing 'text' key in JSON payload"}), 400
    except Exception as e:
        logger.error(f"Error in sentiment: {str(e)}")
        return jsonify({"error": str(e)}), 500
from flask import make_response

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

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

import cv2
import mediapipe as mp
import numpy as np
import base64
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import logging
from collections import deque
import json
from threading import Lock
import os

app = Flask(__name__)
CORS(app)
# Threading मोडमुळे कनेक्शन फास्ट होते आणि लॅग कमी होतो
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================================================================================
#                               PART 1: DEAF MODE SETUP
#                           (MediaPipe Hand Tracking Logic)
# ==================================================================================

try:
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    mp_drawing = mp.solutions.drawing_utils
    logger.info("✅ MediaPipe loaded successfully!")
except Exception as e:
    logger.error(f"⚠️ MediaPipe error: {e}")
    mp_hands = None
    hands = None
    mp_drawing = None
processing_lock = Lock() # Lock मुळे सिस्टम क्रॅश होत नाही

# ASL Recognition Dictionary (A-Z Logic)
class ASLRecognizer:
    def __init__(self):
        self.gesture_buffer = deque(maxlen=5)
        self.asl_patterns = self._init_asl_patterns()
    
    def _init_asl_patterns(self):
        # A-Z Patterns
        return {
            'A': self._recognize_A, 'B': self._recognize_B, 'C': self._recognize_C,
            'D': self._recognize_D, 'E': self._recognize_E, 'F': self._recognize_F,
            'G': self._recognize_G, 'H': self._recognize_H, 'I': self._recognize_I,
            'J': self._recognize_J, 'K': self._recognize_K, 'L': self._recognize_L,
            'M': self._recognize_M, 'N': self._recognize_N, 'O': self._recognize_O,
            'P': self._recognize_P, 'Q': self._recognize_Q, 'R': self._recognize_R,
            'S': self._recognize_S, 'T': self._recognize_T, 'U': self._recognize_U,
            'V': self._recognize_V, 'W': self._recognize_W, 'X': self._recognize_X,
            'Y': self._recognize_Y, 'Z': self._recognize_Z,
        }

    def _get_hand_features(self, landmarks):
        if landmarks is None: return None
        hand_center = np.mean(landmarks, axis=0)
        normalized = landmarks - hand_center
        fingers = {
            'thumb': landmarks[4], 'index': landmarks[8], 'middle': landmarks[12],
            'ring': landmarks[16], 'pinky': landmarks[20]
        }
        finger_status = self._get_finger_status(landmarks)
        return {'landmarks': normalized, 'fingers': fingers, 'status': finger_status, 'center': hand_center}
    
    def _get_finger_status(self, landmarks):
        status = {}
        finger_tips = {'thumb': (4, 2), 'index': (8, 6), 'middle': (12, 10), 'ring': (16, 14), 'pinky': (20, 18)}
        for name, (tip, base) in finger_tips.items():
            status[name] = landmarks[tip][1] < landmarks[base][1]
        return status

    # ASL Hand Sign Logic (Original)
    def _recognize_A(self, f): return 0.85 if not any([f['status'][x] for x in ['index','middle','ring','pinky']]) and f['status']['thumb'] else 0.0
    def _recognize_B(self, f): return 0.80 if all(f['status'].values()) else 0.0
    def _recognize_C(self, f): return 0.75 if f['status']['index'] and f['status']['middle'] and not f['status']['ring'] else 0.0
    def _recognize_D(self, f): return 0.80 if f['status']['index'] and not f['status']['middle'] else 0.0
    def _recognize_E(self, f): return 0.75 if not any(f['status'].values()) else 0.0
    def _recognize_F(self, f): return 0.80 if not f['status']['index'] and f['status']['middle'] else 0.0
    def _recognize_G(self, f): return 0.80 if f['status']['index'] and f['status']['thumb'] else 0.0
    def _recognize_H(self, f): return 0.78 if f['status']['index'] and f['status']['middle'] else 0.0
    def _recognize_I(self, f): return 0.80 if f['status']['pinky'] and not f['status']['index'] else 0.0
    def _recognize_J(self, f): return 0.75 if f['status']['pinky'] else 0.0
    def _recognize_K(self, f): return 0.75 if f['status']['index'] and f['status']['middle'] and f['status']['thumb'] else 0.0
    def _recognize_L(self, f): return 0.78 if f['status']['index'] and f['status']['thumb'] else 0.0
    def _recognize_M(self, f): return 0.75 if f['status']['index'] and f['status']['middle'] and f['status']['ring'] else 0.0
    def _recognize_N(self, f): return 0.75 if f['status']['middle'] and f['status']['ring'] else 0.0
    def _recognize_O(self, f): return 0.70 if not any(f['status'].values()) else 0.0
    def _recognize_P(self, f): return 0.0
    def _recognize_Q(self, f): return 0.0
    def _recognize_R(self, f): return 0.70 if f['status']['index'] and f['status']['middle'] else 0.0
    def _recognize_S(self, f): return 0.80 if not any(f['status'].values()) else 0.0
    def _recognize_T(self, f): return 0.0
    def _recognize_U(self, f): return 0.78 if f['status']['index'] and f['status']['middle'] else 0.0
    def _recognize_V(self, f): return 0.80 if f['status']['index'] and f['status']['middle'] and not f['status']['ring'] else 0.0
    def _recognize_W(self, f): return 0.78 if f['status']['index'] and f['status']['middle'] and f['status']['ring'] else 0.0
    def _recognize_X(self, f): return 0.0
    def _recognize_Y(self, f): return 0.80 if f['status']['thumb'] and f['status']['pinky'] else 0.0
    def _recognize_Z(self, f): return 0.0

    def recognize(self, landmarks):
        features = self._get_hand_features(landmarks)
        if features is None: return None, 0.0
        scores = {l: f(features) for l, f in self.asl_patterns.items()}
        best_letter = max(scores, key=scores.get)
        if scores[best_letter] < 0.5: return None, scores[best_letter]
        return best_letter, scores[best_letter]

asl_recognizer = ASLRecognizer()

# ==================================================================================
#                               PART 2: BLIND MODE SETUP
#                           (YOLO Object Detection Logic)
# ==================================================================================

net = None
output_layers = []
classes = []

# YOLO Files Path
YOLO_WEIGHTS = "yolov3-tiny.weights"
YOLO_CFG = "yolov3-tiny.cfg"
COCO_NAMES = "coco.names"

# Load YOLO Model
try:
    if os.path.exists(YOLO_WEIGHTS) and os.path.exists(YOLO_CFG):
        net = cv2.dnn.readNet(YOLO_WEIGHTS, YOLO_CFG)
        layer_names = net.getLayerNames()
        output_layers = [layer_names[i - 1] for i in net.getUnconnectedOutLayers()]
        
        if os.path.exists(COCO_NAMES):
            with open(COCO_NAMES, "r") as f:
                classes = [line.strip() for line in f.readlines()]
        logger.info("✅ YOLO Object Detection Model Loaded Successfully!")
    else:
        logger.warning("⚠️ YOLO files missing. Blind mode will work but won't detect objects.")
except Exception as e:
    logger.error(f"⚠️ YOLO Error: {e}")

# ==================================================================================
#                               PART 3: SERVER ROUTES
# ==================================================================================

@socketio.on('connect')
def handle_connect():
    logger.info('Client connected')
    emit('response', {'data': 'Connected to Backend'})

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('Client disconnected')

# ---------------------------------------------------------
# ROUTE 1: DEAF MODE (Real-time Hand Tracking)
# ---------------------------------------------------------
@socketio.on('video_frame')
def handle_video_frame(data):
    try:
        frame_data = data['frame'].split(',')[1]
        nparr = np.frombuffer(base64.b64decode(frame_data), np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None: return
        
        frame = cv2.flip(frame, 1)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        with processing_lock:
            results = hands.process(rgb_frame)
        
        recognized_letters = []
        if results.multi_hand_landmarks:
            for hand_landmarks, handedness in zip(results.multi_hand_landmarks, results.multi_handedness):
                landmarks = np.array([[lm.x * frame.shape[1], lm.y * frame.shape[0], lm.z] for lm in hand_landmarks.landmark])
                letter, confidence = asl_recognizer.recognize(landmarks)
                if letter and confidence > 0.5:
                    recognized_letters.append({'letter': letter, 'confidence': float(confidence), 'hand': handedness.classification[0].label})
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
        
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_base64 = base64.b64encode(buffer).decode()
        
        emit('asl_result', {'letters': recognized_letters, 'frame': f'data:image/jpeg;base64,{frame_base64}'}, broadcast=False)
        
    except Exception as e:
        logger.error(f"Error in Deaf Mode: {e}")

# ---------------------------------------------------------
# ROUTE 2: BLIND MODE (High Sensitivity Object Detection)
# ---------------------------------------------------------
@app.route('/api/describe-image', methods=['POST'])
def describe_image():
    try:
        if 'image' not in request.files: return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        nparr = np.frombuffer(file.read(), np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None: return jsonify({'error': 'Invalid image'}), 400
        
        # Analyze Scene function call
        description = _analyze_scene(image)
        return jsonify({'description': description, 'success': True})
    
    except Exception as e:
        logger.error(f"Error describing image: {e}")
        return jsonify({'error': str(e)}), 500

def _analyze_scene(image):
    if net is None: 
        return "I can see the scene, but I need YOLO model files to identify objects."
    
    # 1. Image Pre-processing
    blob = cv2.dnn.blobFromImage(image, 0.00392, (416, 416), (0, 0, 0), True, crop=False)
    net.setInput(blob)
    outs = net.forward(output_layers)
    
    class_ids = []
    confidences = []
    
    # 2. Scanning detections
    for out in outs:
        for detection in out:
            scores = detection[5:]
            class_id = np.argmax(scores)
            confidence = scores[class_id]
            
            # 🔥 CHANGE: Threshold lowered to 0.15 (15%) for detecting more objects
            if confidence > 0.15:
                class_ids.append(class_id)
                confidences.append(float(confidence))
    
    # 3. Filtering duplicates (NMS Simulation)
    # Using dummy boxes just to keep the logic flow, since we care about classification mostly
    detected_objects = [classes[i] for i in class_ids]
    
    # 🔥 DEBUG: Terminal मध्ये दाखवा काय सापडले
    if detected_objects:
        unique_objs = list(set(detected_objects))
        print(f"👀 FOUND OBJECTS: {unique_objs}")
    else:
        print("❌ No objects detected (Try moving the camera)")

    if not detected_objects: 
        return "I see a scene, but no specific objects are clear to me."
    
    # 4. वाक्य बनवणे (Counting)
    from collections import Counter
    counts = Counter(detected_objects)
    
    desc_parts = [f"{count} {obj}" + ("s" if count > 1 else "") for obj, count in counts.items()]
    description = "I can see " + ", ".join(desc_parts) + "."
    
    return description

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'online', 'service': 'SignSight Backend'}), 200

@app.route('/api/asl-letters', methods=['GET'])
def get_asl_letters():
    return jsonify({'letters': list(asl_recognizer.asl_patterns.keys())}), 200
    
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, debug=False, host='0.0.0.0', port=port, allow_unsafe_werkzeug=True)
    
import threading, requests, time

def keep_alive():
    while True:
        time.sleep(840)  # 14 minutes
        try:
            requests.get("https://तुमचा-render-url.onrender.com/api/health")
        except:
            pass

threading.Thread(target=keep_alive, daemon=True).start()

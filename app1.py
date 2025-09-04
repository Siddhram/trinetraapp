import os
import cv2
import tempfile
from flask import Flask, request, jsonify
import google.generativeai as genai
import json

# 🔹 Set your Gemini API Key here
GEMINI_API_KEY = "AIzaSyAerBoGRKAl_AMK4uGDG1re1u86sNxa28o"
genai.configure(api_key=GEMINI_API_KEY)

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 🔹 Helper function to analyze video for anomalies & weapons
def analyze_video_for_anomalies(video_path, frame_interval_sec=5):
    cap = cv2.VideoCapture(video_path)
    frame_count = 0
    fps = cap.get(cv2.CAP_PROP_FPS)
    results = []

    model = genai.GenerativeModel("gemini-1.5-flash")  # Free-tier model

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        if frame_count % int(fps * frame_interval_sec) == 0:
            # Save frame to temp file
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
                cv2.imwrite(temp_file.name, frame)
                temp_file_path = temp_file.name

            # Read bytes and close before sending to API
            with open(temp_file_path, "rb") as img:
                image_bytes = img.read()

            os.unlink(temp_file_path)  # Safe deletion

            prompt = """
            You are an AI security monitoring system analyzing CCTV footage. 
            Carefully examine this frame and detect:
            - Any suspicious or abnormal activity (running, fights, unusual gatherings, trespassing, etc.)
            - Presence of weapons such as guns, knives, explosives, or any dangerous items.

            Respond ONLY in this JSON structure:
            {
              "status": "normal" | "anomaly" | "critical",
              "summary": "Brief description of what is seen",
              "weapons": ["gun", "knife"] or []
            }
            """

            # Call Gemini free-tier model
            response = model.generate_content([
                prompt,
                {"mime_type": "image/jpeg", "data": image_bytes}
            ])

            # Parse response JSON safely
            try:
                frame_analysis = json.loads(response.text.strip())
            except Exception as e:
                frame_analysis = {
                    "status": "error",
                    "summary": "Could not parse AI response",
                    "weapons": []
                }

            timestamp = round(frame_count / fps, 2)
            results.append({
                "frame": frame_count,
                "timestamp_sec": timestamp,
                "analysis": frame_analysis
            })

    cap.release()
    return results

# 🔹 Flask endpoint
@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    analysis = analyze_video_for_anomalies(file_path, frame_interval_sec=5)
    return jsonify({"results": analysis})

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5002, debug=True)

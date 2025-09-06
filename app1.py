import os
import cv2
import tempfile
import base64
from flask import Flask, request, jsonify
import google.generativeai as genai
import json
import re
import numpy as np

# Custom JSON encoder to handle numpy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

# 🔹 Set your Gemini API Key here
GEMINI_API_KEY = "AIzaSyAerBoGRKAl_AMK4uGDG1re1u86sNxa28o"
genai.configure(api_key=GEMINI_API_KEY)

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# 🔹 Helper function to detect persons in frame
def detect_persons(frame):
    """Detect persons in frame and return bounding boxes"""
    try:
        # Load pre-trained HOG descriptor for person detection
        hog = cv2.HOGDescriptor()
        hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
        
        # Detect persons in the frame
        (rects, weights) = hog.detectMultiScale(frame, winStride=(4, 4), padding=(8, 8), scale=1.05)
        
        persons = []
        if len(rects) > 0 and len(weights) > 0:
            for i, (x, y, w, h) in enumerate(rects):
                if i < len(weights) and weights[i] > 0.3:  # Lower confidence threshold
                    # Ensure crop is valid
                    if x >= 0 and y >= 0 and w > 0 and h > 0 and x + w <= frame.shape[1] and y + h <= frame.shape[0]:
                        person_crop = frame[y:y+h, x:x+w]
                        if person_crop.size > 0:  # Check if crop is not empty
                            persons.append({
                                'bbox': (int(x), int(y), int(w), int(h)),
                                'confidence': float(weights[i]),
                                'crop': person_crop
                            })
        
        print(f"🔍 Person detection: Found {len(persons)} persons")
        return persons
    except Exception as e:
        print(f"❌ Error in person detection: {e}")
        return []

# 🔹 Helper function to encode image to base64
def encode_image_to_base64(image):
    """Convert OpenCV image to base64 string"""
    if image is None or image.size == 0:
        return None
    
    # Encode image as JPEG
    _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 85])
    image_base64 = base64.b64encode(buffer).decode('utf-8')
    return f"data:image/jpeg;base64,{image_base64}"

# 🔹 Helper function to analyze video for weapons/harmful objects
def analyze_video_for_weapons(video_path, frame_interval_sec=5):
    try:
        print(f"🎬 Opening video: {video_path}")
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            raise Exception(f"Could not open video file: {video_path}")
        
        frame_count = 0
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        if fps <= 0:
            fps = 30  # Default FPS if detection fails
            print(f"⚠️ Could not detect FPS, using default: {fps}")
        
        print(f"📊 Video info - FPS: {fps}, Frame interval: {frame_interval_sec}s")
        results = []

        model = genai.GenerativeModel("gemini-1.5-flash")  # Free-tier model
        print(f"🤖 Initialized Gemini model")

        while True:
            ret, frame = cap.read()
            if not ret:
                print(f"📹 End of video reached at frame {frame_count}")
                break

            frame_count += 1
            if frame_count % int(fps * frame_interval_sec) == 0:
                print(f"🖼️ Processing frame {frame_count} at {frame_count/fps:.2f}s")
                
                # Save frame to temp file
                with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as temp_file:
                    cv2.imwrite(temp_file.name, frame)
                    temp_file_path = temp_file.name

                # Read bytes and close before sending to API
                with open(temp_file_path, "rb") as img:
                    image_bytes = img.read()

                os.unlink(temp_file_path)  # Safe deletion

                prompt = """
                You are an AI security monitoring system analyzing CCTV footage in spiritual places.
                Carefully examine this frame and detect ONLY:
                - Any weapons or objects that could harm others (guns, knives, explosives, sticks, stones, etc.)

                Respond ONLY in this JSON structure:
                {
                  "status": "safe" | "danger",
                  "weapons": ["gun", "knife"] or []
                }

                Rules:
                - Use "danger" if any harmful object is detected.
                - Use "safe" if no dangerous items are present.
                """

                # Call Gemini free-tier model with error handling
                try:
                    print(f"🤖 Calling Gemini API for frame {frame_count}...")
                    response = model.generate_content([
                        prompt,
                        {"mime_type": "image/jpeg", "data": image_bytes}
                    ])
                    print(f"✅ Gemini API response received for frame {frame_count}")
                    
                    # Robust JSON extraction
                    try:
                        response_text = response.text.strip()
                        print(f"📝 Raw response: {response_text[:200]}...")
                        
                        match = re.search(r'{.*}', response_text, re.DOTALL)
                        if match:
                            frame_analysis = json.loads(match.group())
                            print(f"✅ JSON parsed successfully: {frame_analysis}")
                        else:
                            print(f"❌ No JSON found in response")
                            frame_analysis = {
                                "status": "safe",
                                "weapons": []
                            }
                    except json.JSONDecodeError as json_error:
                        print(f"❌ JSON decode error: {json_error}")
                        frame_analysis = {
                            "status": "safe",
                            "weapons": []
                        }
                        
                except Exception as gemini_error:
                    print(f"❌ Gemini API error: {gemini_error}")
                    frame_analysis = {
                        "status": "safe",
                        "weapons": []
                    }

                # Initialize result with basic analysis
                timestamp = round(frame_count / fps, 2)
                result = {
                    "frame": int(frame_count),
                    "timestamp_sec": float(timestamp),
                    "analysis": frame_analysis,
                    "frame_screenshot": None,
                    "person_images": []
                }

                # Always capture frame screenshot for analysis (weapon detection or not)
                try:
                    frame_screenshot_b64 = encode_image_to_base64(frame)
                    if frame_screenshot_b64:
                        result["frame_screenshot"] = frame_screenshot_b64
                        print(f"✅ Frame screenshot captured for frame {frame_count}")
                    else:
                        print(f"❌ Failed to encode frame screenshot for frame {frame_count}")
                except Exception as e:
                    print(f"❌ Error capturing frame screenshot: {e}")

                # If weapons detected, also try to detect persons
                weapons_detected = frame_analysis.get("status") == "danger" and frame_analysis.get("weapons")
                
                if weapons_detected:
                    print(f"⚠️ WEAPONS DETECTED in frame {frame_count} at {timestamp}s: {frame_analysis.get('weapons', [])}")
                    
                    # Try to detect and capture person images (optional)
                    person_images = []
                    try:
                        persons = detect_persons(frame)
                        print(f"🔍 Attempting to detect persons in frame {frame_count}...")
                        
                        if len(persons) > 0:
                            for i, person in enumerate(persons):
                                try:
                                    if person.get('crop') is not None and person['crop'].size > 0:
                                        person_image_b64 = encode_image_to_base64(person['crop'])
                                        if person_image_b64:
                                            person_images.append({
                                                "image": person_image_b64,
                                                "confidence": float(person['confidence']),
                                                "bbox": [int(x) for x in person['bbox']]
                                            })
                                            print(f"✅ Person {i+1} image captured (confidence: {person['confidence']:.2f})")
                                        else:
                                            print(f"❌ Failed to encode person {i+1} image")
                                    else:
                                        print(f"❌ Person {i+1} crop is invalid")
                                except Exception as person_error:
                                    print(f"❌ Error processing person {i+1}: {person_error}")
                        else:
                            print(f"ℹ️ No persons detected in frame {frame_count} - weapon detection only")
                        
                        result["person_images"] = person_images
                        print(f"📸 Total captured {len(person_images)} person images from frame {frame_count}")
                        
                    except Exception as e:
                        print(f"❌ Error in person detection process: {e}")
                        result["person_images"] = []  # Empty array is fine

                results.append(result)

                # Print frame result for console debugging
                print(f"Frame {frame_count} | Time {timestamp}s | Analysis: {frame_analysis}")

        cap.release()
        print(f"📊 Analysis complete: {len(results)} frames processed")
        return results
        
    except Exception as e:
        print(f"❌ Error in analyze_video_for_weapons: {e}")
        # Return at least one result to prevent frontend errors
        return [{
            "frame": int(1),
            "timestamp_sec": float(0.0),
            "analysis": {
                "status": "error",
                "weapons": []
            },
            "frame_screenshot": None,
            "person_images": []
        }]

# 🔹 Test endpoint to verify image encoding
@app.route('/test-image', methods=['GET'])
def test_image():
    """Test endpoint to verify image encoding works"""
    try:
        # Create a simple test image
        import numpy as np
        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        test_image[:, :] = [255, 0, 0]  # Red image
        
        # Encode to base64
        encoded = encode_image_to_base64(test_image)
        
        return jsonify({
            "success": True,
            "message": "Image encoding test successful",
            "image_size": len(encoded) if encoded else 0,
            "image_preview": encoded[:100] + "..." if encoded else None
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# 🔹 Helper function to analyze single image
def analyze_single_image(image_path):
    """Analyze a single image for weapons"""
    try:
        print(f"🖼️ Analyzing single image: {image_path}")
        
        # Read the image
        frame = cv2.imread(image_path)
        if frame is None:
            raise Exception(f"Could not read image: {image_path}")
        
        # Initialize Gemini model
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Read image bytes
        with open(image_path, "rb") as img:
            image_bytes = img.read()
        
        prompt = """
        You are an AI security monitoring system analyzing CCTV footage in spiritual places.
        Carefully examine this frame and detect ONLY:
        - Any weapons or objects that could harm others (guns, knives, explosives, sticks, stones, etc.)

        Respond ONLY in this JSON structure:
        {
          "status": "safe" | "danger",
          "weapons": ["gun", "knife"] or []
        }

        Rules:
        - Use "danger" if any harmful object is detected.
        - Use "safe" if no dangerous items are present.
        """
        
        # Call Gemini API
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_bytes}
        ])
        
        # Parse response
        try:
            match = re.search(r'{.*}', response.text.strip(), re.DOTALL)
            if match:
                frame_analysis = json.loads(match.group())
            else:
                frame_analysis = {
                    "status": "safe",
                    "weapons": []
                }
        except Exception as e:
            print(f"❌ JSON parse error: {e}")
            frame_analysis = {
                "status": "safe",
                "weapons": []
            }
        
        # Create result with JSON serializable types
        result = {
            "frame": int(1),
            "timestamp_sec": float(0.0),
            "analysis": frame_analysis,
            "frame_screenshot": None,
            "person_images": []
        }
        
        # Always capture frame screenshot
        try:
            frame_screenshot_b64 = encode_image_to_base64(frame)
            if frame_screenshot_b64:
                result["frame_screenshot"] = frame_screenshot_b64
                print(f"✅ Frame screenshot captured")
        except Exception as e:
            print(f"❌ Error capturing frame screenshot: {e}")
        
        # If weapons detected, try to detect persons
        weapons_detected = frame_analysis.get("status") == "danger" and frame_analysis.get("weapons")
        
        if weapons_detected:
            print(f"⚠️ WEAPONS DETECTED: {frame_analysis.get('weapons', [])}")
            
            # Try to detect persons
            person_images = []
            try:
                persons = detect_persons(frame)
                print(f"🔍 Attempting to detect persons...")
                
                if len(persons) > 0:
                    for i, person in enumerate(persons):
                        try:
                            if person.get('crop') is not None and person['crop'].size > 0:
                                person_image_b64 = encode_image_to_base64(person['crop'])
                                if person_image_b64:
                                    person_images.append({
                                        "image": person_image_b64,
                                        "confidence": float(person['confidence']),
                                        "bbox": [int(x) for x in person['bbox']]
                                    })
                                    print(f"✅ Person {i+1} image captured (confidence: {person['confidence']:.2f})")
                        except Exception as person_error:
                            print(f"❌ Error processing person {i+1}: {person_error}")
                else:
                    print(f"ℹ️ No persons detected - weapon detection only")
                
                result["person_images"] = person_images
                print(f"📸 Total captured {len(person_images)} person images")
                
            except Exception as e:
                print(f"❌ Error in person detection: {e}")
                result["person_images"] = []
        
        return [result]
        
    except Exception as e:
        print(f"❌ Error in analyze_single_image: {e}")
        return [{
            "frame": int(1),
            "timestamp_sec": float(0.0),
            "analysis": {
                "status": "error",
                "weapons": []
            },
            "frame_screenshot": None,
            "person_images": []
        }]

# 🔹 Flask endpoint
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        file_path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(file_path)

        print(f"🎬 Starting analysis of file: {file.filename}")
        
        # Check if it's an image or video
        file_extension = file.filename.lower().split('.')[-1]
        
        if file_extension in ['jpg', 'jpeg', 'png', 'bmp']:
            # Single image analysis
            print(f"🖼️ Detected image file, analyzing single image...")
            analysis = analyze_single_image(file_path)
        else:
            # Video analysis
            print(f"🎥 Detected video file, analyzing video frames...")
            analysis = analyze_video_for_weapons(file_path, frame_interval_sec=5)
        
        # Debug: Print summary of results
        total_frames = len(analysis)
        frames_with_images = sum(1 for r in analysis if r.get('frame_screenshot'))
        total_person_images = sum(len(r.get('person_images', [])) for r in analysis)
        
        print(f"📊 Analysis Summary:")
        print(f"   Total frames analyzed: {total_frames}")
        print(f"   Frames with screenshots: {frames_with_images}")
        print(f"   Total person images: {total_person_images}")
        
        # Clean up uploaded file
        try:
            os.remove(file_path)
            print(f"🗑️ Cleaned up uploaded file: {file.filename}")
        except Exception as cleanup_error:
            print(f"⚠️ Could not clean up file: {cleanup_error}")
        
        # Ensure all data is JSON serializable
        try:
            # Test JSON serialization
            json.dumps(analysis, cls=NumpyEncoder)
            return jsonify({"results": analysis}, cls=NumpyEncoder)
        except Exception as json_error:
            print(f"❌ JSON serialization error: {json_error}")
            # Fallback: return simplified results
            simplified_results = []
            for result in analysis:
                simplified_results.append({
                    "frame": int(result.get("frame", 1)),
                    "timestamp_sec": float(result.get("timestamp_sec", 0.0)),
                    "analysis": result.get("analysis", {"status": "error", "weapons": []}),
                    "frame_screenshot": result.get("frame_screenshot"),
                    "person_images": []
                })
            return jsonify({"results": simplified_results})
        
    except Exception as e:
        print(f"❌ Endpoint error: {e}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5002, debug=True)

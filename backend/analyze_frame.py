import cv2
import mediapipe as mp
import sys
import json

mp_face = mp.solutions.face_mesh
face_mesh = mp_face.FaceMesh()

def analyze(image_path):
    image = cv2.imread(image_path)
    if image is None:
      return {"status":"no_image"}
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    results = face_mesh.process(rgb)

    if not results.multi_face_landmarks:
        return {"status": "no_face"}

    landmarks = results.multi_face_landmarks[0]

    left_eye = landmarks.landmark[33]

    if left_eye.x < 0.3:
        return {"status": "looking_left"}
    elif left_eye.x > 0.7:
        return {"status": "looking_right"}
    else:
        return {"status": "focused"}

if __name__ == "__main__":
    path = sys.argv[1]
    result = analyze(path)
    print(json.dumps(result))
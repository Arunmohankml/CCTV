# 🛡️ Sentinel AI - Next-Gen Real-Time CCTV Security & Surveillance Pipeline

Sentinel AI is a cutting-edge video surveillance and automated incident intelligence platform featuring real-time object tracking, perimeter boundary monitoring, automated license plate recognition (ANPR), and face capture forensics.

---

## 🌟 Key Features

- **🎯 Real-Time Object & Person Tracking**: High-accuracy tracking of individuals, vehicles, and general objects with dynamic bounding boxes and zero-flicker identification.
- **🚨 Restricted Perimeter Intrusion Detection**: Live boundary monitoring and instant audible alerts for zone breaches.
- **🏃 Running & Suspect Fleeing Detection**: Instant kinematic velocity tracking detecting fleeing or sprinting individuals with automated zoomed face captures.
- **🏎️ Vehicle Overspeeding Radar**: Real-time velocity tracking and speed estimation (/h$) with overspeeding alarms.
- **🪪 High-Accuracy License Plate Recognition (ANPR)**: Multi-pass CLAHE contrast-enhanced neural OCR supporting American, European, and Indian plate formats, with clean [NIL] fallback for distant vehicles.
- **👤 Live Faces Found Forensics Gallery**: Auto-crops zoomed human faces in real time, de-duplicates to single master cards per individual, and provides 1-click **Jump to Sighting** and high-res JPEG export.
- **🎨 Modern Enterprise Minimalist UI**: Sleek, non-neon, dark-mode design with expandable detail panels and clear KPI counters.

---

## 🚀 Quick Start

### 1. Backend (FastAPI + YOLOv8 + EasyOCR)
`ash
cd backend
pip install -r requirements.txt # or install fastapi uvicorn ultralytics opencv-python easyocr
python app.py
`
Backend runs on http://localhost:8000.

### 2. Frontend (Vite + React + Tailwind CSS)
`ash
cd frontend
npm install
npm run dev
`
Frontend runs on http://localhost:5173.

# SignSight 🤟

SignSight is an AI-powered accessibility web app for Deaf and Blind users.

## Features
- 🤟 Deaf Mode — Real-time ASL (American Sign Language) recognition using MediaPipe
- 👁️ Blind Mode — Object detection using YOLO
- 🔐 Firebase Authentication (Login / Signup)
- 📊 Firestore Database for user profiles

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript (Deployed on Vercel)
- **Backend:** Python, Flask, Flask-SocketIO, MediaPipe, OpenCV (Deployed on Render)
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication

## Project Structure
SignSight/
├── backend/         → Flask backend (bk.py)
├── css/             → Stylesheets
├── js/              → JavaScript files
├── images/          → Sign language images
├── index.html       → Landing page
├── login.html       → Login page
└── dashboard.html   → Main dashboard

## Deployment
- Frontend → Vercel
- Backend → Render
- Auth + DB → Firebase
try:
    import mediapipe as mp
    print("MediaPipe imported successfully!")
    print(f"Solutions available: {dir(mp.solutions)}")
    mp_hands = mp.solutions.hands
    print("Hands module loaded successfully!")
except AttributeError as e:
    print("\n[ERROR] Problem found: Solutions module not loading.")
    print("Fix: You need to downgrade protobuf.")
except Exception as e:
    print(f"Other Error: {e}")
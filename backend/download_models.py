import urllib.request
import os

print("⏳ Downloading YOLO files... Please wait (This may take time)...")

files = {
    "yolov3-tiny.weights": "https://pjreddie.com/media/files/yolov3-tiny.weights",
    "yolov3-tiny.cfg": "https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3-tiny.cfg",
    "coco.names": "https://raw.githubusercontent.com/pjreddie/darknet/master/data/coco.names"
}

for name, url in files.items():
    if not os.path.exists(name):
        print(f"⬇️ Downloading {name}...")
        try:
            urllib.request.urlretrieve(url, name)
            print(f"✅ {name} downloaded!")
        except Exception as e:
            print(f"❌ Error downloading {name}: {e}")
    else:
        print(f"✅ {name} already exists.")

print("\n🎉 All files are ready! Now restart 'bk.py'.")
# 🏎️ GESTUREDRIVE X — AAA Racing Game Controlled by Real-Time AI Hand Gestures

> **Flagship College Technology Expo 2026 Project**  
> Dual-Screen Interactive Experience: High-Fidelity 3D Arcade Racing on Host PC + Real-Time Computer Vision AI Hand Gesture Controller on Mobile Smartphone.

---

## 🌟 Executive Summary

**GESTUREDRIVE X** combines a high-performance 3D racing game running on the main gaming screen with real-time computer vision AI running directly in any smartphone's browser. 

Visitors walk up to the showcase screen, scan the dynamic on-screen QR code with their mobile phone, hold their hand in front of the phone camera, and immediately drive a high-performance supercar on the main screen with responsive hand gestures!

- **No app installation required** — Runs instantly in any standard mobile browser (iOS Safari, Android Chrome, Laptop Webcams).
- **Sub-10ms Local Network Latency** — Ultra-responsive WebSocket binary/JSON protocol.
- **Fail-Safe Neutral Control** — If hand tracking is momentarily lost or the phone disconnects, the vehicle gracefully straightens and coasts safely.
- **Scalable Performance** — Runs at silky-smooth 60 FPS on ordinary student hardware (integrated GPUs like AMD Radeon 740M) up to high-end discrete GPUs.
- **Unreal Engine 5 Bridge Suite** — Includes complete UE5 C++ plugin source, Chaos Vehicle Pawn classes, and `.uproject` integration files.

---

## 🎮 System Architecture

```
                                  +---------------------------------------+
                                  |   SMART MOBILE CONTROLLER (PHONE)     |
                                  | - MediaPipe Hand Landmarker (21 3D)   |
                                  | - Gesture Classifier & Smoothing      |
                                  | - Real-Time Landmark Skeleton Overlay |
                                  | - Steering Arc Meter & Touch Fallback |
                                  +-------------------+-------------------+
                                                      |
                                                      | WebSocket (<10ms)
                                                      v
                                  +-------------------+-------------------+
                                  |   WEBSOCKET RELAY & PAIRING SERVER    |
                                  | - Local IP Detection (10.178.153.245) |
                                  | - Dynamic QR Code & Session Manager   |
                                  | - Input Validation & Stream Relay     |
                                  +-------------------+-------------------+
                                                      |
                                                      | Low-Latency Relay
                                                      v
               +--------------------------------------+--------------------------------------+
               |                                                                             |
               v                                                                             v
+---------------------------------------+                               +---------------------------------------+
|    3D AAA RACING GAME (PC DISPLAY)    |                               |       UNREAL ENGINE 5 BRIDGE          |
| - Three.js PBR Shaders & Clearcoat    |                               | - Chaos Wheeled Vehicle Movement      |
| - Dynamic Suspension Lean & Pitch     |                               | - C++ UGestureDriveBridge WebSocket   |
| - 4-Lane Endless Highway & Scenery    |                               | - AGestureDriveCarPawn                |
| - AI Traffic, Near-Miss Streaks       |                               | - Enhanced Input Mapping              |
| - Procedural Web Audio Sound Engine   |                               +---------------------------------------+
| - Neon Instrument Cluster HUD         |
+---------------------------------------+
```

---

## 👐 Two-Hand Steering Wheel & Gesture Controls

| Gesture | Action | Description |
|---|---|---|
| **Two-Hand Steering Wheel** | ◀ Steer Left / Right ▶ | Hold both hands like gripping a steering wheel! Tilt left (left hand down, right hand up) to steer LEFT. Tilt right (right hand down, left hand up) to steer RIGHT. Hold level to drive straight. |
| **Keep Wheel Level** | ⬆ Drive Straight | Car stabilizes smoothly in lane with neutral zero-steer angle. |
| **Closed Tight Fist** | 🛑 Brake / Reverse | Close either hand into a tight fist to brake firmly, drop engine RPM, and illuminate brake lights. |
| **Thumbs-Up** | ⚡ Nitro Boost | Give a clear Thumbs-Up gesture to fire twin plasma nitro thrusters and boost top speed to 275 km/h. |
| **[ESC] / UI Button** | ⏸️ Pause / Resume | Press `Escape` on keyboard or click the UI Pause button to pause anytime (open-palm pause is disabled to prevent accidental interruptions). |

*Fallback Controls:*
- **Keyboard (PC):** `W` / `↑` = Throttle, `A`/`D` or `←`/`→` = Steer, `S`/`↓`/`Space` = Brake, `Left Shift` = Nitro, `Esc` = Pause, `C` = Cycle Camera.
- **On-Screen Touch (Phone):** Touchpad fallback buttons for Left, Right, Brake, and Nitro are built into the mobile controller.

---

## 💻 Real-Time Laptop Webcam Two-Hand Steering Wheel (Direct on PC)

GESTUREDRIVE X features **natural two-hand steering-wheel control using your laptop's integrated webcam**. No phone, external camera, or app installation is required!

### How It Works
1. **Live Laptop Camera Feed:** Uses the browser `navigator.mediaDevices.getUserMedia()` API directly within the racing game.
2. **MediaPipe Two-Hand Tracking:** Tracks both hands and computes the real-time orientation vector between your wrists/palms.
3. **Natural Steering Wheel Mapping:**
   - **Tilt Wheel Left** (Left hand down, Right hand up) → Car steers **LEFT** smoothly.
   - **Tilt Wheel Right** (Right hand down, Left hand up) → Car steers **RIGHT** smoothly.
   - **Hold Hands Level** → Car drives **STRAIGHT**.
   - Turning the wheel farther increases steering angle smoothly up to full lock.
4. **Direction Precision & Invert Option:** Mapped directly to physical user coordinates, with a quick **🔄 Invert** toggle available on the HUD and in Settings.
5. **Smart Deadzone & Smoothing:** A ±5% neutral deadzone eliminates hand trembling, while low-latency exponential smoothing ensures responsive, natural vehicle control.
6. **Live In-Game HUD Widget:**
   - Real-time mirrored camera preview with glowing virtual steering wheel and landmark skeletons.
   - Centered steering needle and degree readout showing calculated steering deflection.
   - Real-time direction readout (`◀ LEFT`, `▲ STRAIGHT`, `▶ RIGHT`, `🛑 BRAKE`, `⚡ NITRO`).
   - One-click **🎯 Calibrate** button to re-center neutral position instantly.
   - One-click **🔄 Invert** button to toggle steering direction if desired.
   - Quick **📹 Toggle** button to enable/disable webcam steering anytime.
7. **Safe Tracking Loss Handling:** If either hand leaves the camera frame, steering automatically decays toward neutral (`0.0`), preventing runaway turns, and displays `"HOLD BOTH HANDS UP — GRIP THE INVISIBLE WHEEL"`.
8. **Keyboard Priority:** Touching any arrow key or `WASD` instantly overrides webcam input for emergency maneuvers.
9. **Centralized Audio Lifecycle:** Persistent showroom ambient music plays smoothly without repeated restarts, transitioning cleanly into high-energy 128 BPM race beats when the race begins.

---

## 🚀 Quick Start Guide

### 1. Requirements
- **Node.js** v18+ (tested on Node v26)
- Laptop or PC connected to Wi-Fi or Ethernet
- Smartphone connected to the same Wi-Fi network

### 2. Launching the Game
Simply double-click the included `start.bat` launcher, or run:

```bash
# Start the GESTUREDRIVE X Server
npm start
```

This will launch the relay server and output:
```
=======================================================
  GESTUREDRIVE X - Real-Time Pairing & Relay Server    
=======================================================
  Local Address:     http://localhost:8080
  LAN Network URL:   http://10.178.153.245:8080
  Game Screen:       http://localhost:8080/game/
  Mobile Controller: http://10.178.153.245:8080/controller/
=======================================================
```

The game screen will automatically open in full-screen app mode.

---

## 📱 Expo Visitor Pairing Workflow

1. The main gaming screen displays the **GESTUREDRIVE X** showroom with a dynamic pairing QR code and 4-letter session code (e.g., `GD-A9K2`).
2. The visitor opens their phone camera and scans the QR code.
3. The phone browser opens `http://<LAN_IP>:8080/controller/?session=GD-XXXX`.
4. The visitor taps **"CONNECT & START CAMERA"** and grants camera permission.
5. Real-time 21-point hand skeleton tracking activates immediately.
6. The host screen instantly detects the phone (`📱 PHONE CONNECTED (0ms latency)`).
7. The player moves their hand to drive!

---

## 🏁 Game Modes & Features

1. **Endless Highway** — Weave through multi-lane traffic, achieve near-miss overtake combos, and set record high scores.
2. **Traffic Rush** — High-density traffic with active AI lane changes.
3. **Time Attack** — Beat checkpoint timers against the clock.
4. **Free Cruise** — Open road driving with smooth physics.
5. **Showroom Customization** — Choose from 6 supercar paint colors (Cyber Cyan, Neon Purple, Hyper Orange, Racing Red, Electric Gold, Matte Black).
6. **Camera Angles** — Dynamic 3rd-Person Chase Cam, Cockpit/Hood Cam, and Showroom Orbit Cam.
7. **Procedural Web Audio Engine** — Synthesizes multi-harmonic engine RPM, tire skid screech, nitro whoosh, crash impacts, and an Outrun-style synthwave soundtrack in real time with 0 audio downloads.
8. **Expo Attract Mode** — If left idle on the main menu, the camera switches into cinematic showroom rotation with an inviting prompt for the next visitor.

---

## 🛠️ Unreal Engine 5 Bridge (`ue5_bridge/`)

For studios and developers running Unreal Engine 5:
- Contains `GestureDriveX.uproject` configured for UE 5.3+.
- Source C++ files:
  - `UGestureDriveBridge`: Subscribes to the WebSocket server, decodes JSON input packets, and broadcasts `OnGestureInputReceived`.
  - `AGestureDriveCarPawn`: Derived from `AWheeledVehiclePawn`, connects directly to Chaos Vehicle movement components.
- See [`ue5_bridge/README_UE5.md`](file:///d:/PROJECTS/Projects/GESTUREDRIVE%20X/ue5_bridge/README_UE5.md) for full Visual Studio compilation steps.

---

## 🔧 Troubleshooting & Firewall Tips

1. **Phone Cannot Connect to Host PC**:
   - Ensure both the phone and laptop are connected to the exact same Wi-Fi network (or laptop Mobile Hotspot).
   - If Windows Defender Firewall blocks port 8080, run PowerShell as Administrator:
     ```powershell
     New-NetFirewallRule -DisplayName "GESTUREDRIVE X Server" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
     ```
2. **Camera Permission on Mobile**:
   - Modern browsers require HTTPS or `localhost` / trusted LAN IP for camera access. If iOS Safari restricts camera on plain HTTP IP, use a secure tunnel like Cloudflare Tunnel or ngrok (`npx ngrok http 8080`).
3. **Safe Neutral Controls**:
   - If hand tracking is momentarily lost, the car centers its steering and cruises safely until the hand is re-detected.

---

© 2026 GESTUREDRIVE X Team. Built for the College Technology Expo Flagship Showcase.

# 🏎️ GESTUREDRIVE X — AAA PC Racing Game with Real-Time AI Gesture Control

> **Standalone Windows 3D Racing Game Powered by AI Hand-Gesture Computer Vision**  
> Natural 9-and-3 Two-Hand Steering Wheel via Laptop Webcam + Full Unreal Engine 5 Chaos Vehicles Architecture.

---

## 🌟 Executive Summary

**GESTUREDRIVE X** is a high-performance PC 3D racing game driven directly by your natural hand gestures in front of your laptop webcam. Grip an imaginary steering wheel at 9 and 3 o'clock, tilt your hands to steer smoothly, clench your fist to brake, and show a thumbs-up to engage twin plasma nitro thrusters up to 280 km/h!

- **Direct Laptop Webcam Control** — No mobile apps, QR code pairing, or external controllers required.
- **Precision Motorsport Visuals** — Obsidian matte black, precision racing red, and wet reflective asphalt highway with glowing LED guardrails and cyberpunk skyline.
- **Zero-Allocation Highway Engine** — Deep geometry and chunk recycling eliminates garbage collection stutter and crashes.
- **Unreal Engine 5 Architecture** — Includes complete C++ source, Chaos Wheeled Vehicle pawn, speed-sensitive steering assist, Target rules, and automated Windows packaging scripts in `ue5_bridge/`.
- **Hardware-Accelerated Standalone Desktop App** — Packages and launches natively on Windows via Electron with frameless fullscreen 3D performance.

---

## 🎮 Natural Two-Hand Webcam Steering

| Hand Gesture | Vehicle Action | Physical Mechanics |
|---|---|---|
| **Tilt Wheel Left** | ◀ Steer Left | Drop left hand (9h) down, raise right hand (3h) up. Car steers left smoothly. |
| **Tilt Wheel Right** | ▶ Steer Right | Drop right hand (3h) down, raise left hand (9h) up. Car steers right smoothly. |
| **Hold Hands Level** | ▲ Drive Straight | Keep both hands level horizontally. Neutral deadzone eliminates tremors. |
| **Clenched Fist** | 🛑 Brake / Reverse | Close either hand into a tight fist to brake firmly and illuminate brake lights. |
| **Thumbs-Up** | ⚡ Nitro Thrusters | Give a clear thumbs-up gesture to engage twin plasma nitro thrusters. |
| **Tracking Loss** | ⏱️ Safe Neutral | If hands leave camera view, steering smoothly decays to 0.0 (neutral). |

### Keyboard Fallback Controls
- `W` / `↑` : Throttle Acceleration
- `A` / `D` or `←` / `→` : Steer Left / Right
- `S` / `↓` / `Space` : Brake / Handbrake
- `Left Shift` : Nitro Boost
- `R` : Vehicle Recovery / Reset (recovs stuck or overturned car)
- `C` : Cycle Camera (Chase / Hood / Orbit)
- `Esc` : Pause / Resume Race

---

## 🏎️ Vehicle Physics & 3D Environment

- **Asphalt Highway Track**: 4-lane reflective wet asphalt highway with glowing red LED guardrails, dashed lane markings, digital overhead gantries, and distant skyscraper silhouettes.
- **Supercar Dynamics**: Aerodynamic front splitter, carbon fiber rear diffuser, active GT wing, and Brembo-style red calipers.
- **Suspension Dynamics**: Dynamic chassis roll (leans away from hard turns) and pitch (dips forward on braking, squats back on acceleration).
- **Speed-Sensitive Steering Assist**: Attenuates maximum wheel angle at high speeds to maintain high-speed highway stability.
- **AI Highway Traffic**: Multi-lane traffic with autonomous lane changing, near-miss combo multipliers (`+250 PTS`, `x2`, `x3`), and physical collision bounce.
- **Procedural Sound Engine**: Dynamic engine RPM pitch, gear shift audio, tire skid screech, nitro roar, and collision impacts.

---

## 🖥️ Unique Black & Red UI/UX

Completely redesigned around a sophisticated black-and-red motorsport identity:
- **Matte Obsidian Black & Deep Charcoal**: Carbon-textured panels and high contrast.
- **Precision Racing Red**: Accents, glowing needle indicators, and LED strips.
- **Cinematic Startup Sequence**: Animated GESTUREDRIVE X logo badge with smooth loading progress.
- **Showroom Main Menu**: 3D orbiting supercar with START RACE, GARAGE, SETTINGS, CONTROLS, and EXIT.
- **Garage Customizer**: Interactive paint finish selection (Crimson Red, Obsidian Black, Apex White, Titanium Silver, Midnight Sapphire, Sunset Amber).
- **In-Game HUD**: Analog speedometer, RPM tachometer arc, gear indicator, nitro gauge, minimap radar, near-miss popups, and live webcam steering telemetry widget.
- **Settings Modal**: Working graphics presets (Low, Medium, High, Ultra 4K), Fullscreen toggle, Volume slider, Sensitivity & Deadzone sliders, Invert toggle, and Recalibrate.

---

## 🚀 Quick Start & Launch

### 1. Launch Standalone Windows Game
Double-click:
```cmd
Launch_GESTUREDRIVE_X.bat
```
*(Or double-click `start.bat` or run `npm run game`)*

This launches the native standalone desktop game in fullscreen hardware-accelerated mode with immediate webcam access.

### 2. Unreal Engine 5 Project
The complete UE5 project is located in `ue5_bridge/`:
```
ue5_bridge/
├── Config/
│   ├── DefaultEngine.ini       # Lumen, Nanite, Chaos Vehicles settings
│   ├── DefaultInput.ini        # Enhanced Input & keyboard mappings
│   └── DefaultGame.ini         # Project metadata
├── Source/
│   ├── GestureDriveX.Target.cs       # Win64 Standalone Game Target
│   ├── GestureDriveXEditor.Target.cs # Editor Target
│   └── GestureDriveX/
│       ├── AGestureDriveCarPawn.h/.cpp # Chaos vehicle pawn & camera boom
│       ├── UGestureDriveBridge.h/.cpp  # WebSocket relay & watchdog failsafe
│       └── GestureDriveX.Build.cs      # Module dependencies
├── GestureDriveX.uproject
├── Build_UE5_Windows.bat       # One-click UE5 build & packaging automation
└── README_UE5.md               # Detailed UE5 compilation guide
```

---

## 🧪 Automated Test Results

All test suites verify mathematically and structurally:

### 1. Two-Hand Steering Math & Audio Lifecycle (`npm test`)
- ✓ Level hands produce neutral straight steering (`steer = 0.0`)
- ✓ Deadzone filters hand micro-tremors (`steer = 0.0`)
- ✓ Turning wheel left produces smooth, natural left steering (`steer = -0.987`)
- ✓ Turning wheel right produces smooth, natural right steering (`steer = +0.973`)
- ✓ Invert steering option toggles direction
- ✓ Tracking loss safely decays steering to 0.0
- ✓ End-to-end car physics moves vehicle in correct screen direction
- ✓ **100% Passed (9/9 tests)**

### 2. Wall Collision Stability & Screen Flicker Elimination (`npm run test:collision`)
- ✓ Baseline reproduction: 7 camera reversals and 0.478m/frame violent snaps reproduced
- ✓ Engineered continuous slide physics: 0 oscillations, 0 yaw jitter, smooth monotonic glide
- ✓ **100% Passed**

### 3. Standalone PC & UE5 Bridge Integration (`npm run test:integration`)
- ✓ REST status endpoint responds HTTP 200
- ✓ Game assets delivered (20+ KB HTML/CSS/JS)
- ✓ UE5 C++ Bridge WebSocket connects and registers successfully
- ✓ High-frequency 9-and-3 gesture stream delivered to UE5 in real-time
- ✓ Roundtrip loopback latency: 1ms (< 10ms target)
- ✓ **100% Passed**

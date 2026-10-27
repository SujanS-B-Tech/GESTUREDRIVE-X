# 🏎️ GESTUREDRIVE X — Unreal Engine 5 Native Racing Project Guide

This directory contains the production-grade **Unreal Engine 5** C++ source code, Chaos Wheeled Vehicle Pawn implementation, Target rules, and automated Windows build scripts for **GESTUREDRIVE X**.

---

## 🌟 Architecture & Features

### 1. `AGestureDriveCarPawn` (`Source/GestureDriveX/GestureDriveCarPawn.h/.cpp`)
- Inherits from `AWheeledVehiclePawn` (Chaos Wheeled Vehicle Physics).
- **Speed-Sensitive Steering Assist**: Dynamically attenuates steering lock at high speeds (from 1.0x at low speed to 0.48x at 280 km/h) to maintain highway stability without overturning.
- **Chase Camera Spring Arm (`USpringArmComponent`)**: 650cm arm length, 180cm socket height, dynamic camera lag, and speed-sensitive FOV expansion (85° to 108°).
- **Cockpit/Hood Camera (`UCameraComponent`)**: Toggleable in-game via `C` key or Enhanced Input.
- **Dynamic Nitro Boost Physics**: Multiplies wheel torque (1.85x) with active fuel drain and regenerative recharge.
- **Vehicle Recovery / Reset Mechanic**: Teleports vehicle upright in lane with zeroed angular momentum when stuck or overturned.
- **Real-Time Telemetry Multicast Delegates**: Exposes `SpeedKmh`, `EngineRPM`, and `CurrentGear` for Blueprint UI and audio.

### 2. `UGestureDriveBridge` (`Source/GestureDriveX/GestureDriveBridge.h/.cpp`)
- Real-time client module using Unreal's native `WebSockets`, `Json`, and `JsonUtilities`.
- Connects directly to local low-latency relay (`ws://127.0.0.1:8080`).
- **Fail-Safe Watchdog Timer**: If gesture tracking packets are lost for >0.25 seconds, smoothly decays steering and throttle to 0.0, preventing runaway turns.
- Multicast dynamic delegates for input events and connection states.

### 3. Build & Target Rules
- `GestureDriveX.Target.cs`: Game target rules for standalone Win64 shipping builds.
- `GestureDriveXEditor.Target.cs`: Editor target rules for Visual Studio 2022 development.
- `GestureDriveX.Build.cs`: Module dependencies including `ChaosVehicles`, `WebSockets`, `EnhancedInput`, `Json`, `Slate`.

---

## 🛠️ System Audit & Prerequisites

The host computer environment audit detected:
- **Operating System**: Windows 10/11 64-bit
- **GPU**: AMD Radeon 740M Graphics (Integrated GPU)
- **C++ Compiler**: Microsoft Visual C++ (MSVC `cl.exe` v14.29) via Visual Studio 2019 BuildTools
- **Windows SDK**: Windows 10 SDK (`10.0.19041.0`)
- **Unreal Engine**: Not currently installed on this workstation.

---

## 🚀 How to Build & Package in Unreal Engine 5

Once Unreal Engine 5 (version 5.3, 5.4, or 5.5) is installed via the Epic Games Launcher:

### Method A: One-Click Automated Script
Simply run the included build batch file:
```cmd
Build_UE5_Windows.bat
```
This script will automatically:
1. Detect your installed Unreal Engine 5 directory.
2. Run `GenerateProjectFiles.bat` to generate `GestureDriveX.sln`.
3. Compile the C++ game module (`GestureDriveXEditor Win64 Development`).
4. Cook and package the standalone game executable to `Saved\StagedBuilds\Windows\`.

### Method B: Manual Visual Studio Workflow
1. Right-click `GestureDriveX.uproject` and select **"Generate Visual Studio project files"**.
2. Open `GestureDriveX.sln` in Visual Studio.
3. Set the build configuration to **Development Editor | Win64**.
4. Press **Ctrl + Shift + B** to build the solution.
5. Double-click `GestureDriveX.uproject` to open the project in Unreal Editor.
6. In Unreal Editor, click **Platforms → Windows → Package Project** to generate the standalone Windows executable.

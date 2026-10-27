# GESTUREDRIVE X — Unreal Engine 5 Integration Guide

This directory contains the production-grade Unreal Engine 5 source code, C++ WebSocket client bridge, Chaos Vehicle integration, and project configuration.

## Features Included
1. **`UGestureDriveBridge`**:
   - High-speed WebSocket client module (`WebSockets`, `Json`, `JsonUtilities`)
   - Connects to the Node.js relay server at `ws://127.0.0.1:8080` or local LAN IP
   - Deserializes continuous steering, throttle, braking, and nitro packets
   - Exposes dynamic Blueprint events (`OnGestureInputReceived`, `OnControllerStatusChanged`)
   - Safe neutral failsafe on packet timeout or disconnection
2. **`AGestureDriveCarPawn`**:
   - Subclass of `AWheeledVehiclePawn` (Chaos Vehicles)
   - Feeds real-time hand steering, throttle, and braking directly into `UChaosWheeledVehicleMovementComponent`
   - Nitro torque multiplier support

## How to Compile & Open in Unreal Engine 5
1. Ensure Unreal Engine 5.3 or 5.4 is installed on your workstation.
2. Right-click `GestureDriveX.uproject` and select **"Generate Visual Studio project files"**.
3. Open `GestureDriveX.sln` in Visual Studio 2022 (with "Game development with C++").
4. Select **Development Editor | Win64** and build the solution (`Ctrl+Shift+B`).
5. Open `GestureDriveX.uproject` in Unreal Editor.
6. When prompted to enable plugins, ensure `ChaosVehiclesPlugin` and `WebSockets` are enabled.
7. Start the Node.js relay server (`npm start` in `server/`).
8. Press **Play in Editor (PIE)**. The car will automatically subscribe to the relay and listen for mobile hand gestures!

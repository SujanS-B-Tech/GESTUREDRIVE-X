// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

#include "GestureDriveX.h"

#define LOCTEXT_NAMESPACE "FGestureDriveXModule"

void FGestureDriveXModule::StartupModule()
{
	UE_LOG(LogTemp, Log, TEXT("GESTUREDRIVE X Module Started"));
}

void FGestureDriveXModule::ShutdownModule()
{
	UE_LOG(LogTemp, Log, TEXT("GESTUREDRIVE X Module Shutdown"));
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_PRIMARY_GAME_MODULE(FGestureDriveXModule, GestureDriveX, "GestureDriveX");

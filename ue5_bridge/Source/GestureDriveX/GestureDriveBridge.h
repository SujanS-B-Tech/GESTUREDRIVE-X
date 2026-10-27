// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "IWebSocket.h"
#include "GestureDriveBridge.generated.h"

USTRUCT(BlueprintType)
struct FGestureDriveInput
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	float Steer = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	float Throttle = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	float Brake = 0.0f;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	bool bNitro = false;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	FString GestureName = TEXT("DRIVE_STRAIGHT");

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	bool bHandVisible = false;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	float Confidence = 1.0f;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	float LatencyMs = 0.0f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnGestureInputReceived, const FGestureDriveInput&, InputData);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnControllerStatusChanged, bool, bIsConnected);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnTrackingLossRecovered);

/**
 * UGestureDriveBridge
 * Unreal Engine 5 Real-Time AI Gesture Input Integration Bridge
 * Communicates with local high-performance computer vision pipeline via WebSocket/IPC
 */
UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class GESTUREDRIVEX_API UGestureDriveBridge : public UActorComponent
{
	GENERATED_BODY()

public:
	UGestureDriveBridge();

	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

	UFUNCTION(BlueprintCallable, Category = "GestureDrive")
	void ConnectToRelay(const FString& ServerUrl = TEXT("ws://127.0.0.1:8080"), const FString& TargetSession = TEXT(""));

	UFUNCTION(BlueprintCallable, Category = "GestureDrive")
	void DisconnectFromRelay();

	UFUNCTION(BlueprintCallable, Category = "GestureDrive")
	void ResetToSafeNeutral();

	UPROPERTY(BlueprintAssignable, Category = "GestureDrive")
	FOnGestureInputReceived OnGestureInputReceived;

	UPROPERTY(BlueprintAssignable, Category = "GestureDrive")
	FOnControllerStatusChanged OnControllerStatusChanged;

	UPROPERTY(BlueprintAssignable, Category = "GestureDrive")
	FOnTrackingLossRecovered OnTrackingLossRecovered;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	FGestureDriveInput CurrentInput;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	bool bIsConnected = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GestureDrive|Watchdog")
	float WatchdogTimeoutSeconds = 0.25f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GestureDrive|Watchdog")
	bool bEnableWatchdogNeutralDecay = true;

private:
	TSharedPtr<IWebSocket> WebSocket;
	FTimerHandle WatchdogTimerHandle;
	double LastPacketTimestamp = 0.0;

	void HandleMessage(const FString& MessageString);
	void CheckWatchdogTimeout();
};

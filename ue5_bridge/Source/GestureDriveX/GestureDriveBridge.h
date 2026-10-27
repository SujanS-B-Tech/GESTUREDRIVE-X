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
	FString GestureName = TEXT("NEUTRAL");

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	bool bHandVisible = false;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	float LatencyMs = 0.0f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnGestureInputReceived, const FGestureDriveInput&, InputData);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnControllerStatusChanged, bool, bIsConnected);

/**
 * UGestureDriveBridge
 * Unreal Engine 5 Real-Time WebSocket Input Integration Bridge
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

	UPROPERTY(BlueprintAssignable, Category = "GestureDrive")
	FOnGestureInputReceived OnGestureInputReceived;

	UPROPERTY(BlueprintAssignable, Category = "GestureDrive")
	FOnControllerStatusChanged OnControllerStatusChanged;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	FGestureDriveInput CurrentInput;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	bool bIsConnected = false;

	UPROPERTY(BlueprintReadOnly, Category = "GestureDrive")
	FString ActiveSessionCode;

private:
	TSharedPtr<IWebSocket> WebSocket;
	void HandleMessage(const FString& MessageString);
	void ResetToSafeNeutral();
};

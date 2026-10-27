// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "WheeledVehiclePawn.h"
#include "GestureDriveBridge.h"
#include "GameFramework/SpringArmComponent.h"
#include "Camera/CameraComponent.h"
#include "GestureDriveCarPawn.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnNitroBoostToggled, bool, bIsActive);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnVehicleTelemetryUpdated, float, SpeedKmh, float, EngineRPM, int32, CurrentGear);

/**
 * AGestureDriveCarPawn
 * Chaos Wheeled Vehicle Pawn directly driven by real-time AI hand gestures.
 * Features speed-sensitive steering assist, nitro thruster physics, chase/hood cameras, and recovery mechanics.
 */
UCLASS()
class GESTUREDRIVEX_API AGestureDriveCarPawn : public AWheeledVehiclePawn
{
	GENERATED_BODY()

public:
	AGestureDriveCarPawn();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaTime) override;
	virtual void SetupPlayerInputComponent(class UInputComponent* PlayerInputComponent) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "GestureDrive|Components")
	UGestureDriveBridge* GestureBridge;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "GestureDrive|Components")
	USpringArmComponent* CameraBoom;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "GestureDrive|Components")
	UCameraComponent* ChaseCamera;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "GestureDrive|Components")
	UCameraComponent* HoodCamera;

	UFUNCTION()
	void HandleGestureInput(const FGestureDriveInput& InputData);

	UFUNCTION(BlueprintCallable, Category = "GestureDrive|Recovery")
	void ResetVehiclePosition();

	UFUNCTION(BlueprintCallable, Category = "GestureDrive|Camera")
	void ToggleCameraMode();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GestureDrive|Physics")
	float NitroTorqueMultiplier = 1.85f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GestureDrive|Physics")
	float MaxSpeedKmh = 275.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GestureDrive|Physics")
	float NitroCharge = 100.0f;

	UPROPERTY(BlueprintAssignable, Category = "GestureDrive|Events")
	FOnNitroBoostToggled OnNitroBoostToggled;

	UPROPERTY(BlueprintAssignable, Category = "GestureDrive|Events")
	FOnVehicleTelemetryUpdated OnVehicleTelemetryUpdated;

	UFUNCTION(BlueprintPure, Category = "GestureDrive|Telemetry")
	float GetVehicleSpeedKmh() const;

	UFUNCTION(BlueprintPure, Category = "GestureDrive|Telemetry")
	float GetEngineRPM() const;

	UFUNCTION(BlueprintPure, Category = "GestureDrive|Telemetry")
	int32 GetCurrentGear() const;

protected:
	bool bIsBoosting = false;
	bool bIsHoodCameraActive = false;
	FTransform InitialSpawnTransform;

	void UpdateTelemetry(float DeltaTime);
	float CalculateSpeedSensitiveSteering(float RawSteer, float CurrentSpeedKmh) const;
};

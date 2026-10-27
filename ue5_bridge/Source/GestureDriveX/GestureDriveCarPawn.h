// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "WheeledVehiclePawn.h"
#include "GestureDriveBridge.h"
#include "GestureDriveCarPawn.generated.h"

/**
 * AGestureDriveCarPawn
 * Chaos Wheeled Vehicle Pawn directly driven by real-time AI hand gestures
 */
UCLASS()
class GESTUREDRIVEX_API AGestureDriveCarPawn : public AWheeledVehiclePawn
{
	GENERATED_BODY()

public:
	AGestureDriveCarPawn();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaTime) override;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "GestureDrive")
	UGestureDriveBridge* GestureBridge;

	UFUNCTION()
	void HandleGestureInput(const FGestureDriveInput& InputData);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "GestureDrive|Physics")
	float NitroTorqueMultiplier = 1.75f;

protected:
	bool bIsBoosting = false;
};

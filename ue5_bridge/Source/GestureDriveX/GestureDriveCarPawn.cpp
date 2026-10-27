// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

#include "GestureDriveCarPawn.h"
#include "ChaosWheeledVehicleMovementComponent.h"

AGestureDriveCarPawn::AGestureDriveCarPawn()
{
	PrimaryActorTick.bCanEverTick = true;

	GestureBridge = CreateDefaultSubobject<UGestureDriveBridge>(TEXT("GestureBridge"));
}

void AGestureDriveCarPawn::BeginPlay()
{
	Super::BeginPlay();

	if (GestureBridge)
	{
		GestureBridge->OnGestureInputReceived.AddDynamic(this, &AGestureDriveCarPawn::HandleGestureInput);
		GestureBridge->ConnectToRelay();
	}
}

void AGestureDriveCarPawn::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);
}

void AGestureDriveCarPawn::HandleGestureInput(const FGestureDriveInput& InputData)
{
	UChaosWheeledVehicleMovementComponent* VehicleMovement = Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovementComponent());
	if (!VehicleMovement) return;

	// 1. Steering (-1.0 to +1.0)
	VehicleMovement->SetSteeringInput(InputData.Steer);

	// 2. Throttle & Brake
	VehicleMovement->SetThrottleInput(InputData.Throttle);
	VehicleMovement->SetBrakeInput(InputData.Brake);

	// 3. Handbrake (Triggered on full brake)
	VehicleMovement->SetHandbrakeInput(InputData.Brake > 0.85f);

	// 4. Nitro Boost torque modifier
	bIsBoosting = InputData.bNitro;
}

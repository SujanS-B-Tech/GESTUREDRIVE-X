// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

#include "GestureDriveCarPawn.h"
#include "ChaosWheeledVehicleMovementComponent.h"
#include "Components/InputComponent.h"

AGestureDriveCarPawn::AGestureDriveCarPawn()
{
	PrimaryActorTick.bCanEverTick = true;

	// 1. Gesture Bridge Component
	GestureBridge = CreateDefaultSubobject<UGestureDriveBridge>(TEXT("GestureBridge"));

	// 2. Chase Camera Spring Arm Boom
	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->TargetArmLength = 650.0f;
	CameraBoom->SocketOffset = FVector(0.0f, 0.0f, 180.0f);
	CameraBoom->SetRelativeRotation(FRotator(-12.0f, 0.0f, 0.0f));
	CameraBoom->bInheritPitch = false;
	CameraBoom->bInheritRoll = false;
	CameraBoom->bEnableCameraLag = true;
	CameraBoom->CameraLagSpeed = 14.0f;
	CameraBoom->CameraLagMaxDistance = 150.0f;

	// 3. Chase Camera
	ChaseCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ChaseCamera"));
	ChaseCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
	ChaseCamera->bUsePawnControlRotation = false;
	ChaseCamera->FieldOfView = 85.0f;

	// 4. Hood Camera
	HoodCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("HoodCamera"));
	HoodCamera->SetupAttachment(RootComponent);
	HoodCamera->SetRelativeLocation(FVector(60.0f, 0.0f, 110.0f));
	HoodCamera->FieldOfView = 95.0f;
	HoodCamera->SetActive(false);
}

void AGestureDriveCarPawn::BeginPlay()
{
	Super::BeginPlay();

	InitialSpawnTransform = GetActorTransform();

	if (GestureBridge)
	{
		GestureBridge->OnGestureInputReceived.AddDynamic(this, &AGestureDriveCarPawn::HandleGestureInput);
		GestureBridge->ConnectToRelay();
	}
}

void AGestureDriveCarPawn::Tick(float DeltaTime)
{
	Super::Tick(DeltaTime);

	// Nitro Recharge/Drain
	if (bIsBoosting && NitroCharge > 0.0f)
	{
		NitroCharge = FMath::Max(0.0f, NitroCharge - 30.0f * DeltaTime);
		if (NitroCharge <= 0.0f)
		{
			bIsBoosting = false;
			OnNitroBoostToggled.Broadcast(false);
		}
	}
	else if (!bIsBoosting && NitroCharge < 100.0f)
	{
		NitroCharge = FMath::Min(100.0f, NitroCharge + 8.0f * DeltaTime);
	}

	UpdateTelemetry(DeltaTime);
}

void AGestureDriveCarPawn::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	if (PlayerInputComponent)
	{
		PlayerInputComponent->BindAction("ResetVehicle", IE_Pressed, this, &AGestureDriveCarPawn::ResetVehiclePosition);
		PlayerInputComponent->BindAction("ToggleCamera", IE_Pressed, this, &AGestureDriveCarPawn::ToggleCameraMode);
	}
}

void AGestureDriveCarPawn::HandleGestureInput(const FGestureDriveInput& InputData)
{
	UChaosWheeledVehicleMovementComponent* VehicleMovement = Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovementComponent());
	if (!VehicleMovement) return;

	float SpeedKmh = GetVehicleSpeedKmh();

	// 1. Speed-Sensitive Steering Assistance
	float FilteredSteer = CalculateSpeedSensitiveSteering(InputData.Steer, SpeedKmh);
	VehicleMovement->SetSteeringInput(FilteredSteer);

	// 2. Throttle & Brake
	VehicleMovement->SetThrottleInput(InputData.Throttle);
	VehicleMovement->SetBrakeInput(InputData.Brake);

	// 3. Handbrake on tight fist / full brake
	VehicleMovement->SetHandbrakeInput(InputData.Brake > 0.85f);

	// 4. Nitro Boost
	bool bWantsNitro = InputData.bNitro && NitroCharge > 5.0f && SpeedKmh > 30.0f;
	if (bWantsNitro != bIsBoosting)
	{
		bIsBoosting = bWantsNitro;
		OnNitroBoostToggled.Broadcast(bIsBoosting);
	}
}

float AGestureDriveCarPawn::CalculateSpeedSensitiveSteering(float RawSteer, float CurrentSpeedKmh) const
{
	// At high speeds, reduce steering sensitivity to maintain high-speed highway stability
	float SpeedFactor = FMath::Clamp(CurrentSpeedKmh / MaxSpeedKmh, 0.0f, 1.0f);
	float Attenuation = FMath::Lerp(1.0f, 0.48f, SpeedFactor);
	return FMath::Clamp(RawSteer * Attenuation, -1.0f, 1.0f);
}

void AGestureDriveCarPawn::ResetVehiclePosition()
{
	FVector ResetLoc = GetActorLocation() + FVector(0.0f, 0.0f, 100.0f);
	FRotator ResetRot = FRotator(0.0f, GetActorRotation().Yaw, 0.0f);

	SetActorLocationAndRotation(ResetLoc, ResetRot, false, nullptr, ETeleportType::TeleportPhysics);

	if (UChaosWheeledVehicleMovementComponent* VehicleMovement = Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovementComponent()))
	{
		VehicleMovement->SetSteeringInput(0.0f);
		VehicleMovement->SetThrottleInput(0.0f);
		VehicleMovement->SetBrakeInput(1.0f);
	}
}

void AGestureDriveCarPawn::ToggleCameraMode()
{
	bIsHoodCameraActive = !bIsHoodCameraActive;
	if (bIsHoodCameraActive)
	{
		ChaseCamera->SetActive(false);
		HoodCamera->SetActive(true);
	}
	else
	{
		HoodCamera->SetActive(false);
		ChaseCamera->SetActive(true);
	}
}

void AGestureDriveCarPawn::UpdateTelemetry(float DeltaTime)
{
	float Speed = GetVehicleSpeedKmh();
	float Rpm = GetEngineRPM();
	int32 Gear = GetCurrentGear();

	OnVehicleTelemetryUpdated.Broadcast(Speed, Rpm, Gear);

	// Speed-sensitive FOV expansion for exhilarating sensation of speed
	if (ChaseCamera && ChaseCamera->IsActive())
	{
		float TargetFov = FMath::Lerp(85.0f, 108.0f, FMath::Clamp(Speed / MaxSpeedKmh, 0.0f, 1.0f));
		if (bIsBoosting) TargetFov += 8.0f;
		ChaseCamera->FieldOfView = FMath::FInterpTo(ChaseCamera->FieldOfView, TargetFov, DeltaTime, 4.0f);
	}
}

float AGestureDriveCarPawn::GetVehicleSpeedKmh() const
{
	if (UChaosWheeledVehicleMovementComponent* VehicleMovement = Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovementComponent()))
	{
		return FMath::Abs(VehicleMovement->GetForwardSpeed()) * 0.036f; // cm/s to km/h
	}
	return 0.0f;
}

float AGestureDriveCarPawn::GetEngineRPM() const
{
	if (UChaosWheeledVehicleMovementComponent* VehicleMovement = Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovementComponent()))
	{
		return VehicleMovement->GetEngineRotationSpeed();
	}
	return 900.0f;
}

int32 AGestureDriveCarPawn::GetCurrentGear() const
{
	if (UChaosWheeledVehicleMovementComponent* VehicleMovement = Cast<UChaosWheeledVehicleMovementComponent>(GetVehicleMovementComponent()))
	{
		return VehicleMovement->GetCurrentGear();
	}
	return 1;
}

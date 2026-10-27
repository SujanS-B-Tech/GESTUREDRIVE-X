// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

#include "GestureDriveBridge.h"
#include "WebSocketsModule.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "TimerManager.h"
#include "Engine/World.h"

UGestureDriveBridge::UGestureDriveBridge()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UGestureDriveBridge::BeginPlay()
{
	Super::BeginPlay();
	ResetToSafeNeutral();

	if (UWorld* World = GetWorld())
	{
		World->GetTimerManager().SetTimer(
			WatchdogTimerHandle,
			this,
			&UGestureDriveBridge::CheckWatchdogTimeout,
			0.05f,
			true
		);
	}
}

void UGestureDriveBridge::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	if (UWorld* World = GetWorld())
	{
		World->GetTimerManager().ClearTimer(WatchdogTimerHandle);
	}

	DisconnectFromRelay();
	Super::EndPlay(EndPlayReason);
}

void UGestureDriveBridge::ConnectToRelay(const FString& ServerUrl, const FString& TargetSession)
{
	if (!FModuleManager::Get().IsModuleLoaded("WebSockets"))
	{
		FModuleManager::Get().LoadModule("WebSockets");
	}

	WebSocket = FWebSocketsModule::Get().CreateWebSocket(ServerUrl);

	WebSocket->OnConnected().AddLambda([this, TargetSession]()
	{
		UE_LOG(LogTemp, Log, TEXT("[GestureDriveUE5] Connected to local webcam relay server!"));
		bIsConnected = true;
		OnControllerStatusChanged.Broadcast(true);

		// Send subscription
		TSharedPtr<FJsonObject> JsonObj = MakeShareable(new FJsonObject());
		JsonObj->SetStringField(TEXT("type"), TEXT("create_session"));
		if (!TargetSession.IsEmpty())
		{
			JsonObj->SetStringField(TEXT("sessionCode"), TargetSession);
		}

		FString OutputString;
		TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&OutputString);
		FJsonSerializer::Serialize(JsonObj.ToSharedRef(), Writer);
		WebSocket->Send(OutputString);
	});

	WebSocket->OnConnectionError().AddLambda([this](const FString& Error)
	{
		UE_LOG(LogTemp, Error, TEXT("[GestureDriveUE5] Connection error: %s"), *Error);
		ResetToSafeNeutral();
		OnControllerStatusChanged.Broadcast(false);
	});

	WebSocket->OnClosed().AddLambda([this](int32 StatusCode, const FString& Reason, bool bWasClean)
	{
		UE_LOG(LogTemp, Warning, TEXT("[GestureDriveUE5] Connection closed. Reason: %s"), *Reason);
		ResetToSafeNeutral();
		OnControllerStatusChanged.Broadcast(false);
	});

	WebSocket->OnMessage().AddLambda([this](const FString& MessageString)
	{
		HandleMessage(MessageString);
	});

	WebSocket->Connect();
}

void UGestureDriveBridge::DisconnectFromRelay()
{
	if (WebSocket.IsValid() && WebSocket->IsConnected())
	{
		WebSocket->Close();
	}
	ResetToSafeNeutral();
}

void UGestureDriveBridge::HandleMessage(const FString& MessageString)
{
	TSharedPtr<FJsonObject> JsonObject;
	TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(MessageString);

	if (FJsonSerializer::Deserialize(Reader, JsonObject) && JsonObject.IsValid())
	{
		FString MsgType;
		if (JsonObject->TryGetStringField(TEXT("type"), MsgType))
		{
			if (MsgType == TEXT("input"))
			{
				LastPacketTimestamp = FPlatformTime::Seconds();

				CurrentInput.Steer = FMath::Clamp((float)JsonObject->GetNumberField(TEXT("steer")), -1.0f, 1.0f);
				CurrentInput.Throttle = FMath::Clamp((float)JsonObject->GetNumberField(TEXT("throttle")), 0.0f, 1.0f);
				CurrentInput.Brake = FMath::Clamp((float)JsonObject->GetNumberField(TEXT("brake")), 0.0f, 1.0f);
				CurrentInput.bNitro = JsonObject->GetBoolField(TEXT("nitro"));
				CurrentInput.GestureName = JsonObject->GetStringField(TEXT("gesture"));
				CurrentInput.bHandVisible = JsonObject->GetBoolField(TEXT("handVisible"));

				double Conf = 1.0;
				if (JsonObject->TryGetNumberField(TEXT("confidence"), Conf))
				{
					CurrentInput.Confidence = (float)Conf;
				}

				OnGestureInputReceived.Broadcast(CurrentInput);
			}
			else if (MsgType == TEXT("controller_disconnected"))
			{
				ResetToSafeNeutral();
			}
		}
	}
}

void UGestureDriveBridge::CheckWatchdogTimeout()
{
	if (!bEnableWatchdogNeutralDecay) return;

	double Now = FPlatformTime::Seconds();
	if (LastPacketTimestamp > 0.0 && (Now - LastPacketTimestamp) > WatchdogTimeoutSeconds)
	{
		// Smoothly decay steer toward zero to prevent stuck turn
		CurrentInput.Steer = FMath::FInterpTo(CurrentInput.Steer, 0.0f, 0.05f, 8.0f);
		CurrentInput.Throttle = FMath::FInterpTo(CurrentInput.Throttle, 0.0f, 0.05f, 6.0f);
		CurrentInput.Brake = 0.0f;
		CurrentInput.bNitro = false;
		CurrentInput.bHandVisible = false;
		CurrentInput.GestureName = TEXT("TRACKING_LOSS_NEUTRAL");

		OnGestureInputReceived.Broadcast(CurrentInput);
	}
}

void UGestureDriveBridge::ResetToSafeNeutral()
{
	CurrentInput.Steer = 0.0f;
	CurrentInput.Throttle = 0.0f;
	CurrentInput.Brake = 0.0f;
	CurrentInput.bNitro = false;
	CurrentInput.GestureName = TEXT("DRIVE_STRAIGHT");
	CurrentInput.bHandVisible = false;
	CurrentInput.Confidence = 0.0f;

	LastPacketTimestamp = 0.0;
	OnGestureInputReceived.Broadcast(CurrentInput);
}

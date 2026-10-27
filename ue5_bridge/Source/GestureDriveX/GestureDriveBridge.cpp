// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

#include "GestureDriveBridge.h"
#include "WebSocketsModule.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

UGestureDriveBridge::UGestureDriveBridge()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UGestureDriveBridge::BeginPlay()
{
	Super::BeginPlay();
	ResetToSafeNeutral();
}

void UGestureDriveBridge::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
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
		UE_LOG(LogTemp, Log, TEXT("[GestureDriveUE5] Connected to relay server!"));
		bIsConnected = true;

		// Send create_session or join session request
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
	});

	WebSocket->OnClosed().AddLambda([this](int32 StatusCode, const FString& Reason, bool bWasClean)
	{
		UE_LOG(LogTemp, Warning, TEXT("[GestureDriveUE5] Connection closed. Reason: %s"), *Reason);
		ResetToSafeNeutral();
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
			if (MsgType == TEXT("session_created"))
			{
				ActiveSessionCode = JsonObject->GetStringField(TEXT("sessionCode"));
				UE_LOG(LogTemp, Log, TEXT("[GestureDriveUE5] Session Created: %s"), *ActiveSessionCode);
			}
			else if (MsgType == TEXT("controller_connected"))
			{
				OnControllerStatusChanged.Broadcast(true);
			}
			else if (MsgType == TEXT("controller_disconnected"))
			{
				ResetToSafeNeutral();
				OnControllerStatusChanged.Broadcast(false);
			}
			else if (MsgType == TEXT("input"))
			{
				CurrentInput.Steer = JsonObject->GetNumberField(TEXT("steer"));
				CurrentInput.Throttle = JsonObject->GetNumberField(TEXT("throttle"));
				CurrentInput.Brake = JsonObject->GetNumberField(TEXT("brake"));
				CurrentInput.bNitro = JsonObject->GetBoolField(TEXT("nitro"));
				CurrentInput.GestureName = JsonObject->GetStringField(TEXT("gesture"));
				CurrentInput.bHandVisible = JsonObject->GetBoolField(TEXT("handVisible"));

				OnGestureInputReceived.Broadcast(CurrentInput);
			}
		}
	}
}

void UGestureDriveBridge::ResetToSafeNeutral()
{
	CurrentInput.Steer = 0.0f;
	CurrentInput.Throttle = 0.0f;
	CurrentInput.Brake = 0.0f;
	CurrentInput.bNitro = false;
	CurrentInput.GestureName = TEXT("NEUTRAL");
	CurrentInput.bHandVisible = false;
	bIsConnected = false;

	OnGestureInputReceived.Broadcast(CurrentInput);
}

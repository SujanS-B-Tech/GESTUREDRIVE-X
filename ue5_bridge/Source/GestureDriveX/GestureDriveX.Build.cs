// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

using UnrealBuildTool;

public class GestureDriveX : ModuleRules
{
	public GestureDriveX(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[] {
			"Core",
			"CoreUObject",
			"Engine",
			"InputCore",
			"EnhancedInput",
			"WebSockets",
			"Json",
			"JsonUtilities",
			"ChaosVehicles"
		});

		PrivateDependencyModuleNames.AddRange(new string[] {
			"Slate",
			"SlateCore"
		});
	}
}

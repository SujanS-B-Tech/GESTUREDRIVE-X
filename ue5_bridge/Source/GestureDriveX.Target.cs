// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

using UnrealBuildTool;
using System.Collections.Generic;

public class GestureDriveXTarget : TargetRules
{
	public GestureDriveXTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.V4;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_3;
		ExtraModuleNames.Add("GestureDriveX");
	}
}

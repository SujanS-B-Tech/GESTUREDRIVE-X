// Copyright (c) 2026 GESTUREDRIVE X Team. All Rights Reserved.

using UnrealBuildTool;
using System.Collections.Generic;

public class GestureDriveXEditorTarget : TargetRules
{
	public GestureDriveXEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.V4;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_3;
		ExtraModuleNames.Add("GestureDriveX");
	}
}

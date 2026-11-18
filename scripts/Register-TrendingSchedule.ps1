[CmdletBinding(SupportsShouldProcess)]
param(
    [string]$TaskName = "Antigravity-GitHub-Trending-Radar-Sync",
    [string]$TriggerTime = "08:00"
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = $PSScriptRoot }
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location -Path $ProjectRoot

$ActionCmd = "Set-Location '$ProjectRoot'; node scripts/sync-trending.mjs; node build.mjs"
$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"$ActionCmd`""
$Trigger = New-ScheduledTaskTrigger -Daily -At $TriggerTime
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

if ($PSCmdlet.ShouldProcess($TaskName, "Register daily scheduled sync at $TriggerTime")) {
    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null
    Write-Output "Registered scheduled task '$TaskName' daily at $TriggerTime in '$ProjectRoot'."
}

[CmdletBinding()]
param(
    [int]$Port = 3847,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = $PSScriptRoot }
Set-Location -Path $ScriptDir

$env:PORT = "$Port"
$Url = "http://127.0.0.1:$Port"

if (-not $NoBrowser) {
    Start-Job -ScriptBlock {
        param($TargetUrl)
        Start-Sleep -Milliseconds 900
        Start-Process $TargetUrl
    } -ArgumentList $Url | Out-Null
}

Write-Output "Starting GitHub Trending Radar on $Url ..."
& node server.mjs

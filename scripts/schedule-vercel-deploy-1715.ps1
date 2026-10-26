$ErrorActionPreference = "Stop"
$target = Get-Date "17:15:00"
if ($target -lt (Get-Date)) { $target = $target.AddDays(1) }
$secs = [math]::Max(1, [math]::Ceiling(($target - (Get-Date)).TotalSeconds))
Write-Output ("SCHEDULED_DEPLOY_WAIT target={0} sleep={1}s" -f $target.ToString("o"), $secs)
Start-Sleep -Seconds $secs
Write-Output 'AGENT_LOOP_WAKE_vercel_deploy'

param([string]$ControlPath = (Join-Path $env:USERPROFILE '.dsh\profiles\desktop\.sidebar-browser-control\control.json'))
$ErrorActionPreference='Stop'
$dshControl=Get-Content -LiteralPath $ControlPath | ConvertFrom-Json
$dshHeaders=@{Authorization='Bearer '+$dshControl.token}
$dshBase='http://127.0.0.1:'+$dshControl.port
$dshTestUrl=$dshBase+'/test'
function Invoke-Sidebar([string]$Operation,$Arguments=@{}) {
  $dshPayload=@{operation=$Operation;args=$Arguments}|ConvertTo-Json -Depth 8 -Compress
  Invoke-RestMethod -Uri ('http://127.0.0.1:'+$dshControl.port+'/call') -Method Post -Headers $dshHeaders -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($dshPayload)) -TimeoutSec 25
}
$dshBefore=Invoke-Sidebar 'list'
$dshOpened=Invoke-Sidebar 'open' @{url=$dshTestUrl}
if (-not $dshOpened.created -or $dshOpened.tabId -in @($dshBefore.pages.tabId)) { throw '没有创建独立的新标签。' }
$dshId=$dshOpened.tabId
$dshRead=Invoke-Sidebar 'read' @{tabId=$dshId}
if ($dshRead.text -notmatch 'SIDEBAR_BROWSER_TEST_20261004') { throw '新标签未打开验证页。' }
Invoke-Sidebar 'navigate' @{tabId=$dshId;url=$dshTestUrl+'?next=1'} | Out-Null
$dshBack=Invoke-Sidebar 'back' @{tabId=$dshId}
if ($dshBack.url -ne $dshTestUrl) { throw '后退验证失败。' }
$dshForward=Invoke-Sidebar 'forward' @{tabId=$dshId}
if ($dshForward.url -ne $dshTestUrl+'?next=1') { throw '前进验证失败。' }
$dshReload=Invoke-Sidebar 'reload' @{tabId=$dshId}
$dshAfterReload=Invoke-Sidebar 'read' @{tabId=$dshId}
if ($dshAfterReload.text -notmatch 'SIDEBAR_BROWSER_TEST_20261004') { throw '刷新后读取验证失败。' }
Invoke-Sidebar 'navigate' @{tabId=$dshId;url=$dshTestUrl} | Out-Null
@{at=(Get-Date).ToString('o');before=$dshBefore;opened=$dshOpened;read=$dshRead;back=$dshBack;forward=$dshForward;reload=$dshReload} | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'open-verification.json') -Encoding utf8
'自动新建标签、打开网页、后退、前进、刷新全部通过。'
'新标签：'+$dshId

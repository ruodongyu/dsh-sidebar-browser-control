param([string]$ControlPath = (Join-Path $env:USERPROFILE '.dsh\profiles\desktop\.sidebar-browser-control\control.json'))
$ErrorActionPreference = 'Stop'
$dshControl = Get-Content -LiteralPath $ControlPath | ConvertFrom-Json
$dshHeaders = @{Authorization = 'Bearer ' + $dshControl.token}
$dshBase = 'http://127.0.0.1:' + $dshControl.port
$dshTestUrl = $dshBase + '/test'
$dshRegistered = Invoke-RestMethod -Uri ($dshBase + '/tools') -Headers $dshHeaders -TimeoutSec 5
if ($dshRegistered.tools.Count -ne 11) { throw '十一个侧栏工具尚未全部注册。' }
function Invoke-Sidebar([string]$Operation, $Arguments = @{}) {
  $dshPayload = @{operation = $Operation; args = $Arguments} | ConvertTo-Json -Depth 8 -Compress
  Invoke-RestMethod -Uri ('http://127.0.0.1:' + $dshControl.port + '/call') -Method Post -Headers $dshHeaders -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($dshPayload)) -TimeoutSec 25
}
$dshTabs = Invoke-Sidebar 'list'
$dshPages = @($dshTabs.pages | Where-Object { $_.url -in @($dshTestUrl,$dshTestUrl+'?readonly=1') })
if ($dshPages.Count -ne 1) { throw '请在 DSH 原生侧栏打开唯一的本地验证页。' }
$dshTabId = $dshPages[0].tabId
if ($dshPages[0].url -ne $dshTestUrl) { Invoke-Sidebar 'navigate' @{tabId=$dshTabId; url=$dshTestUrl} | Out-Null }
$dshInitial = Invoke-Sidebar 'read' @{tabId=$dshTabId}
if ($dshInitial.text -notmatch 'SIDEBAR_BROWSER_TEST_20261004') { throw '验证页标识不符。' }
$dshInput = @($dshInitial.elements | Where-Object tag -EQ 'input')[0]
$dshFill = Invoke-Sidebar 'fill' @{tabId=$dshTabId; ref=$dshInput.ref; text='DSH 可以操作自己的侧边栏'}
$dshStaleBlocked = $false
try { Invoke-Sidebar 'fill' @{tabId=$dshTabId; ref=$dshInput.ref; text='旧编号不应写入'} | Out-Null }
catch { $dshError = ($_.ErrorDetails.Message | ConvertFrom-Json).error; if ($dshError -notmatch '快照已失效|Script failed to execute') { throw }; $dshStaleBlocked = $true }
if (-not $dshStaleBlocked) { throw '旧元素编号没有被拦截。' }
$dshFresh = Invoke-Sidebar 'read' @{tabId=$dshTabId}
$dshButton = @($dshFresh.elements | Where-Object tag -EQ 'button')[0]
$dshClick = Invoke-Sidebar 'click' @{tabId=$dshTabId; ref=$dshButton.ref}
$dshFinal = Invoke-Sidebar 'read' @{tabId=$dshTabId}
if ($dshFinal.text -notmatch '点击成功：DSH 可以操作自己的侧边栏') { throw '输入或点击验证失败。' }
$dshScreenshot = Invoke-Sidebar 'screenshot' @{tabId=$dshTabId}
Invoke-Sidebar 'navigate' @{tabId=$dshTabId; url=$dshTestUrl+'?readonly=1'} | Out-Null
$dshReadOnly = Invoke-Sidebar 'read' @{tabId=$dshTabId}
Invoke-Sidebar 'scroll' @{tabId=$dshTabId; pixels=50} | Out-Null
$dshReadOnlyBlocked = $false
try { Invoke-Sidebar 'click' @{tabId=$dshTabId; ref=@($dshReadOnly.elements | Where-Object tag -EQ 'button')[0].ref} | Out-Null }
catch { $dshError = ($_.ErrorDetails.Message | ConvertFrom-Json).error; if ($dshError -notmatch '仅允许读取') { throw }; $dshReadOnlyBlocked = $true }
if (-not $dshReadOnlyBlocked) { throw '未授权页面没有被拦截。' }
Invoke-Sidebar 'navigate' @{tabId=$dshTabId; url=$dshTestUrl} | Out-Null
$dshRestore = Invoke-Sidebar 'read' @{tabId=$dshTabId}
Invoke-Sidebar 'fill' @{tabId=$dshTabId; ref=@($dshRestore.elements | Where-Object tag -EQ 'input')[0].ref; text='DSH 可以操作自己的侧边栏'} | Out-Null
$dshRestore = Invoke-Sidebar 'read' @{tabId=$dshTabId}
Invoke-Sidebar 'click' @{tabId=$dshTabId; ref=@($dshRestore.elements | Where-Object tag -EQ 'button')[0].ref} | Out-Null
$dshEvidence = @{at=(Get-Date).ToString('o'); tools=$dshRegistered; tabs=$dshTabs; before=$dshInitial; fill=$dshFill; click=$dshClick; after=$dshFinal; screenshot=$dshScreenshot; staleRefBlocked=$dshStaleBlocked; unauthorizedInteractionBlocked=$dshReadOnlyBlocked; navigationAndScrollPassed=$true}
$dshEvidence | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'verification.json') -Encoding utf8
$dshFinal.text
'截图：' + $dshScreenshot.path
'读取、输入、点击、截图全部通过。'

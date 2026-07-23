param(
  [string]$Owner = "xiaoxiaoqian1217",
  [string]$Repo = "generative-ui-platform",
  [ValidateSet("private", "public")]
  [string]$Visibility = "private"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI is required. Install it with: winget install --id GitHub.cli"
}

gh auth status

$fullName = "$Owner/$Repo"
$visibilityFlag = if ($Visibility -eq "private") { "--private" } else { "--public" }

& gh repo create $fullName $visibilityFlag --source . --remote origin --push
& gh workflow run seed-issues.yml --repo $fullName

Write-Host "Repository created: https://github.com/$fullName"
Write-Host "Next: review docs/operations/REPOSITORY_SETUP.md and configure optional AI secrets."

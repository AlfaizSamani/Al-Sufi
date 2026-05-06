# Deployment Script for Azure App Service (PaaS)
$ResourceGroup = "al-sufi-rg"
$PlanName = "al-sufi-plan"
$WebAppName = "al-sufi-supabase-paas" # Change if name is taken
$Location = "eastus"

# 1. Parse supabase.env
$envFilePath = "supabase\docker\supabase.env"
if (-not (Test-Path $envFilePath)) {
    # Try .env if supabase.env isn't there
    $envFilePath = "supabase\docker\.env"
}

if (-not (Test-Path $envFilePath)) {
    Write-Host "Please ensure supabase.env exists!" -ForegroundColor Red
    exit 1
}

$settings = @{}
Get-Content $envFilePath | Where-Object { $_ -match '=' -and $_ -notmatch '^#' } | ForEach-Object {
    $parts = $_ -split '=', 2
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    $settings[$key] = $value
}

# 2. Read kong.yml for KONG_CONFIG
$kongFilePath = "supabase\docker\volumes\api\kong.yml"
if (Test-Path $kongFilePath) {
    $kongConfig = Get-Content $kongFilePath -Raw
    $settings["KONG_CONFIG"] = $kongConfig
}

# 3. Create Resource Group & Plan
Write-Host "Creating Resource Group..."
az group create --name $ResourceGroup --location $Location

Write-Host "Creating App Service Plan (Linux Premium V3 for Multi-Container)..."
az appservice plan create --name $PlanName --resource-group $ResourceGroup --is-linux --sku P1V3

# 4. Create Web App for Containers (Multi-container via docker-compose)
Write-Host "Creating Web App with Docker Compose..."
az webapp create --resource-group $ResourceGroup `
                 --plan $PlanName `
                 --name $WebAppName `
                 --multicontainer-config-type compose `
                 --multicontainer-config-file "supabase\docker\docker-compose.yml"

# 5. Inject App Settings
Write-Host "Applying App Settings (this might take a moment)..."
# Convert settings hashtable to JSON format required by Azure CLI
$jsonSettings = @()
foreach ($key in $settings.Keys) {
    $jsonSettings += @{ name = $key; value = $settings[$key]; slotSetting = $false }
}
$jsonSettings | ConvertTo-Json -Depth 10 | Out-File -FilePath "settings.json" -Encoding utf8

az webapp config appsettings set --resource-group $ResourceGroup --name $WebAppName --settings "@settings.json"

Write-Host "Deployment Initiated! It will take a few minutes for the containers to pull and start." -ForegroundColor Green
Write-Host "Your API URL will be: https://$WebAppName.azurewebsites.net" -ForegroundColor Cyan
Remove-Item "settings.json"

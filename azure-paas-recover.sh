#!/bin/bash
# Azure PaaS Credentials Recovery Script — Al-Sufi Connect
# Run this from the IT Admin's laptop (either in Cloud Shell or Azure CLI).
# This retrieves all secrets from the existing resources in 'al-sufi-rg' and prints them for GitHub.

RG="al-sufi-rg"
REPO="AlfaizSamani/Al-Sufi"
ACR_NAME="alsufiacr"
SWA_NAME="al-sufi-web"
ACS_NAME="al-sufi-comms"
ACS_EMAIL_NAME="al-sufi-email"

echo "=========================================================="
echo "🔍 Recovering Al-Sufi Azure Infrastructure Credentials..."
echo "=========================================================="

# 1. Subscription & Tenant ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv 2>/dev/null)
TENANT_ID=$(az account show --query tenantId -o tsv 2>/dev/null)

if [ -z "$SUBSCRIPTION_ID" ]; then
  echo "❌ Error: Not logged in to Azure. Please run 'az login' first."
  exit 1
fi

echo "✓ Subscription: $SUBSCRIPTION_ID"
echo "✓ Tenant: $TENANT_ID"

# 2. Find Storage Account in the Resource Group
STORAGE_ACCOUNT=$(az storage account list --resource-group $RG --query "[?contains(name, 'alsufistorage')].name" -o tsv | head -n 1)
if [ -n "$STORAGE_ACCOUNT" ]; then
  STORAGE_KEY=$(az storage account keys list --account-name $STORAGE_ACCOUNT --resource-group $RG --query '[0].value' -o tsv 2>/dev/null)
  echo "✓ Storage Account: $STORAGE_ACCOUNT"
else
  echo "⚠️ Warning: Storage account starting with 'alsufistorage' not found in group $RG"
fi

# 3. Container Registry Credentials
ACR_EXISTS=$(az acr show --name $ACR_NAME --resource-group $RG --query "name" -o tsv 2>/dev/null)
if [ -n "$ACR_EXISTS" ]; then
  # Enable Admin user if not enabled
  az acr update --name $ACR_NAME --resource-group $RG --admin-enabled true --output none 2>/dev/null
  ACR_USER=$(az acr credential show --name $ACR_NAME --resource-group $RG --query username -o tsv 2>/dev/null)
  ACR_PASS=$(az acr credential show --name $ACR_NAME --resource-group $RG --query "passwords[0].value" -o tsv 2>/dev/null)
  echo "✓ Container Registry: $ACR_NAME"
else
  echo "⚠️ Warning: Container Registry '$ACR_NAME' not found in group $RG"
fi

# 4. Static Web App Deploy Token
SWA_EXISTS=$(az staticwebapp show --name $SWA_NAME --resource-group $RG --query "name" -o tsv 2>/dev/null)
if [ -n "$SWA_EXISTS" ]; then
  SWA_URL=$(az staticwebapp show --name $SWA_NAME --resource-group $RG --query 'defaultHostname' -o tsv 2>/dev/null)
  SWA_TOKEN=$(az staticwebapp secrets list --name $SWA_NAME --resource-group $RG --query 'properties.apiKey' -o tsv 2>/dev/null)
  echo "✓ Static Web App: $SWA_NAME ($SWA_URL)"
else
  echo "⚠️ Warning: Static Web App '$SWA_NAME' not found in group $RG"
fi

# 5. Azure Communication Services (Email)
ACS_EXISTS=$(az communication show --name $ACS_NAME --resource-group $RG --query "name" -o tsv 2>/dev/null)
if [ -n "$ACS_EXISTS" ]; then
  ACS_ENDPOINT="https://$(az communication show --name $ACS_NAME --resource-group $RG --query 'hostName' -o tsv 2>/dev/null)"
  ACS_KEY=$(az communication list-key --name $ACS_NAME --resource-group $RG --query 'primaryKey' -o tsv 2>/dev/null)
  ACS_SENDER_DOMAIN=$(az communication email domain list --email-service-name $ACS_EMAIL_NAME --resource-group $RG --query "[0].mailFromSenderDomain" -o tsv 2>/dev/null)
  ACS_FROM="DoNotReply@${ACS_SENDER_DOMAIN}"
  echo "✓ Email Communication Services: $ACS_NAME"
else
  echo "⚠️ Warning: Communication Service '$ACS_NAME' not found in group $RG"
fi

# 6. Service Principal (OIDC) Setup/Retrieval
echo "⚙️ Checking/Creating Service Principal for GitHub Actions..."
CLIENT_ID=$(az ad app list --display-name "al-sufi-github-actions" --query "[0].appId" -o tsv 2>/dev/null)

if [ -z "$CLIENT_ID" ]; then
  echo "Creating new Service Principal..."
  SP=$(az ad sp create-for-rbac \
    --name "al-sufi-github-actions" \
    --role contributor \
    --scopes "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG" \
    --sdk-auth 2>/dev/null)
  
  if [ -n "$SP" ]; then
    CLIENT_ID=$(echo $SP | python3 -c "import sys, json; print(json.load(sys.stdin)['clientId'])")
    
    # Create Federated Credential for OIDC login from GitHub Actions
    az ad app federated-credential create \
      --id $CLIENT_ID \
      --parameters "{
        \"name\": \"al-sufi-github\",
        \"issuer\": \"https://token.actions.githubusercontent.com\",
        \"subject\": \"repo:$REPO:ref:refs/heads/main\",
        \"audiences\": [\"api://AzureADTokenExchange\"]
      }" --output none 2>/dev/null
    echo "✓ Created Service Principal: $CLIENT_ID"
  else
    echo "❌ Failed to create Service Principal automatically. Please ensure you have Owner/Contributor and User Access Administrator roles."
  fi
else
  echo "✓ Found existing Service Principal: $CLIENT_ID"
  # Refresh federated credentials just in case
  az ad app federated-credential create \
    --id $CLIENT_ID \
    --parameters "{
      \"name\": \"al-sufi-github\",
      \"issuer\": \"https://token.actions.githubusercontent.com\",
      \"subject\": \"repo:$REPO:ref:refs/heads/main\",
      \"audiences\": [\"api://AzureADTokenExchange\"]
    }" --output none 2>/dev/null 2>&1
fi

echo ""
echo "================================================================"
echo " COPY ALL THESE INTO GITHUB → Settings → Secrets → Actions"
echo "================================================================"
echo "AZURE_CLIENT_ID:                  $CLIENT_ID"
echo "AZURE_TENANT_ID:                  $TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID:            $SUBSCRIPTION_ID"
echo "ACR_LOGIN_SERVER:                 ${ACR_NAME}.azurecr.io"
echo "ACR_USERNAME:                     $ACR_USER"
echo "ACR_PASSWORD:                     $ACR_PASS"
echo "AZURE_STORAGE_ACCOUNT:            $STORAGE_ACCOUNT"
echo "AZURE_STORAGE_KEY:                $STORAGE_KEY"
echo "AZURE_BLOB_CONTAINER:             al-sufi-storage"
echo "AZURE_STATIC_WEB_APPS_API_TOKEN:  $SWA_TOKEN"
echo "ACS_EMAIL_ENDPOINT:               $ACS_ENDPOINT"
echo "ACS_EMAIL_ACCESS_KEY:             $ACS_KEY"
echo "ACS_EMAIL_FROM:                   $ACS_FROM"
echo "ACS_SMTP_USER:                    $ACS_NAME"
echo "ACS_SMTP_PASS:                    $ACS_KEY"
echo "SITE_URL:                         https://$SWA_URL"
echo "================================================================"
echo ""
echo "All done! Copy these values to GitHub Secrets and trigger your workflows!"

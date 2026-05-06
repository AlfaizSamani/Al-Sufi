# Azure PaaS Setup — Al-Sufi Connect
# Run these commands ONCE from Azure Cloud Shell (https://shell.azure.com)
# This provisions all infrastructure. After this, GitHub Actions handles deployments.

# ─────────────────────────────────────────────────────────────
# 0. VARIABLES — Edit these before running
# ─────────────────────────────────────────────────────────────
RG="al-sufi-rg"
LOCATION="eastus"
ACR_NAME="alsufiacr"           # Must be globally unique, lowercase
ACA_ENV="al-sufi-env"
STORAGE_ACCOUNT="alsufistorage$(shuf -i 1000-9999 -n 1)"  # Unique name
SWA_NAME="al-sufi-web"
ACS_NAME="al-sufi-comms"
ACS_EMAIL_NAME="al-sufi-email"

# ─────────────────────────────────────────────────────────────
# 1. Create Resource Group
# ─────────────────────────────────────────────────────────────
az group create --name $RG --location $LOCATION

# ─────────────────────────────────────────────────────────────
# 2. Create Azure Container Registry (stores Docker images)
# ─────────────────────────────────────────────────────────────
az acr create \
  --name $ACR_NAME \
  --resource-group $RG \
  --sku Basic \
  --admin-enabled true

# ─────────────────────────────────────────────────────────────
# 3. Create Container Apps Environment
# ─────────────────────────────────────────────────────────────
az containerapp env create \
  --name $ACA_ENV \
  --resource-group $RG \
  --location $LOCATION

# ─────────────────────────────────────────────────────────────
# 4. Create Azure Storage Account (PostgreSQL data + file uploads)
# ─────────────────────────────────────────────────────────────
az storage account create \
  --name $STORAGE_ACCOUNT \
  --resource-group $RG \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2

STORAGE_KEY=$(az storage account keys list --account-name $STORAGE_ACCOUNT --query '[0].value' -o tsv)

# File share for PostgreSQL persistent data
az storage share create \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --name supabase-db-data \
  --quota 32

# Blob container for product images / file uploads
az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --name al-sufi-storage \
  --public-access blob

# ─────────────────────────────────────────────────────────────
# 5. Create Azure Static Web App (PaaS frontend hosting)
# ─────────────────────────────────────────────────────────────
az staticwebapp create \
  --name $SWA_NAME \
  --resource-group $RG \
  --location "eastus2" \
  --sku Free

SWA_URL=$(az staticwebapp show --name $SWA_NAME --query 'defaultHostname' -o tsv)
SWA_TOKEN=$(az staticwebapp secrets list --name $SWA_NAME --query 'properties.apiKey' -o tsv)

# ─────────────────────────────────────────────────────────────
# 6. Create Azure Communication Services (Email — 100% Azure, no Resend/Gmail)
# ─────────────────────────────────────────────────────────────
# Create ACS resource
az communication create \
  --name $ACS_NAME \
  --resource-group $RG \
  --data-location "United States" \
  --location global

# Create Email Communication Services resource
az communication email create \
  --name $ACS_EMAIL_NAME \
  --resource-group $RG \
  --data-location "United States" \
  --location global

# Add a free Azure-managed domain (gives you a noreply@<id>.azurecomm.net address)
az communication email domain create \
  --domain-name AzureManagedDomain \
  --email-service-name $ACS_EMAIL_NAME \
  --resource-group $RG \
  --location global \
  --domain-management AzureManaged

# Get ACS credentials
ACS_ENDPOINT="https://$(az communication show --name $ACS_NAME --resource-group $RG --query 'hostName' -o tsv)"
ACS_KEY=$(az communication list-key --name $ACS_NAME --resource-group $RG --query 'primaryKey' -o tsv)
ACS_SENDER_DOMAIN=$(az communication email domain list \
  --email-service-name $ACS_EMAIL_NAME \
  --resource-group $RG \
  --query "[0].mailFromSenderDomain" -o tsv)
ACS_FROM="DoNotReply@${ACS_SENDER_DOMAIN}"

# ─────────────────────────────────────────────────────────────
# 7. Create Service Principal for GitHub Actions OIDC
# ─────────────────────────────────────────────────────────────
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

SP=$(az ad sp create-for-rbac \
  --name "al-sufi-github-actions" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG \
  --sdk-auth)

CLIENT_ID=$(echo $SP | python3 -c "import sys, json; print(json.load(sys.stdin)['clientId'])")

az ad app federated-credential create \
  --id $CLIENT_ID \
  --parameters "{
    \"name\": \"al-sufi-github\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:AlfaizSamani/Al-Sufi:ref:refs/heads/main\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }"

# ─────────────────────────────────────────────────────────────
# 8. Print ALL GitHub Secrets
# ─────────────────────────────────────────────────────────────
echo ""
echo "================================================================"
echo " COPY ALL THESE INTO GITHUB → Settings → Secrets → Actions"
echo "================================================================"
echo "AZURE_CLIENT_ID:                  $CLIENT_ID"
echo "AZURE_TENANT_ID:                  $TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID:            $SUBSCRIPTION_ID"
echo "ACR_LOGIN_SERVER:                 ${ACR_NAME}.azurecr.io"
echo "ACR_USERNAME:                     $(az acr credential show --name $ACR_NAME --query username -o tsv)"
echo "ACR_PASSWORD:                     $(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)"
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
echo "SMTP_ADMIN_EMAIL:                 (your admin email address)"
echo ""
echo "--- Generate these manually and add as secrets too: ---"
echo "POSTGRES_PASSWORD:      (strong password, e.g: openssl rand -base64 24)"
echo "JWT_SECRET:             (openssl rand -base64 32)"
echo "ANON_KEY:               (see walkthrough.md for JWT generation)"
echo "SERVICE_ROLE_KEY:       (see walkthrough.md for JWT generation)"
echo "OPERATOR_TOKEN:         (openssl rand -hex 20)"
echo "VITE_SUPABASE_URL:      (set AFTER first backend deploy - Kong URL)"
echo "VITE_SUPABASE_PUBLISHABLE_KEY: (same value as ANON_KEY)"
echo "VITE_SUPABASE_PROJECT_ID: al-sufi-azure"
echo "================================================================"
echo ""
echo "✅ Infrastructure ready! Now:"
echo "   1. Add all secrets to GitHub"
echo "   2. Run the 'Deploy Backend to Azure Container Apps' workflow"
echo "   3. Copy the Kong URL from workflow logs"
echo "   4. Set VITE_SUPABASE_URL = Kong URL"
echo "   5. Run the 'Deploy Frontend to Azure Static Web Apps' workflow"
echo "================================================================"

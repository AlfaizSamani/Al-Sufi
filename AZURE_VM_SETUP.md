# 🏗️ Azure VM Setup Guide — Al-Sufi Connect

Follow these steps to prepare your Azure Virtual Machine for the Supabase backend.

## Step 1: Create the Virtual Machine
1.  Go to [Azure Portal](https://portal.azure.com).
2.  Click **Create a resource** -> **Virtual Machine**.
3.  **Basics Tab:**
    *   **Resource Group:** Create new (e.g., `AlSufi_Group`).
    *   **VM Name:** `AlSufi-Backend`.
    *   **Region:** Select your closest region (e.g., `South India`).
    *   **Image:** `Ubuntu Server 22.04 LTS - Gen2`.
    *   **Size:** Recommended `Standard_B2s` or `Standard_B2ms` (2 vCPUs, 4-8 GB RAM).
    *   **Authentication:** `SSH public key`.
    *   **Username:** `azureuser`.
4.  **Networking Tab:**
    *   Ensure **Public IP** is created.
5.  **Review + Create.** Download your `.pem` key file when prompted.

## Step 2: Open Ports (Firewall)
1.  Go to your VM resource in Azure.
    *   Go to **Networking** -> **Inbound port rules**.
2.  Add rules for the following ports:
    *   **80** (HTTP)
    *   **443** (HTTPS)
    *   **5432** (PostgreSQL)
    *   **3000** (Studio Dashboard)

## Step 3: Install Docker on the VM
Connect to your VM via SSH and run these commands:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install -y docker-compose-plugin

# Check versions
docker --version
docker compose version
```

## Step 4: Setup GitHub Secrets
Go to your GitHub repo -> **Settings** -> **Secrets and variables** -> **Actions**.
Add these **New repository secrets**:

*   `AZURE_VM_IP`: Your VM's Public IP address.
*   `AZURE_VM_USER`: `azureuser`
*   `AZURE_VM_SSH_KEY`: The contents of your `.pem` key file.
*   `POSTGRES_PASSWORD`: A strong password for your database.
*   `JWT_SECRET`: A random 32+ character string.
*   `ANON_KEY`: A random string (used for public API access).
*   `SERVICE_ROLE_KEY`: A random string (used for admin API access).
*   `SITE_URL`: Your final website URL (or your VM IP for now).

---

Once you've done these steps, **push your code to GitHub**, and the automatic deployment will start!

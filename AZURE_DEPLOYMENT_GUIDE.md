# 🚀 Al-Sufi Connect: Ultimate Azure Deployment Guide

This guide provides the exact step-by-step instructions to deploy your **Backend (Supabase)** and **Frontend (React)** safely on your own Azure account.

---

## 🛠️ Step 1: Preparation (GitHub Secrets)

Before anything else, you must add these secrets to your GitHub Repository:
1. Go to your GitHub Repo -> **Settings** -> **Secrets and variables** -> **Actions**.
2. Add the following **Repository secrets**:

| Secret Name | Description |
| :--- | :--- |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | (Optional if using OIDC) The XML content from Azure Web App "Get Publish Profile". |
| `VITE_SUPABASE_URL` | The Public IP of your Azure VM (e.g., `http://20.xx.xx.xx:8000`). |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase `anon` key (found in your VM after setup). |
| `AZURE_VM_IP` | The Public IP of your Azure Virtual Machine. |
| `AZURE_VM_SSH_KEY` | Your private SSH key (`.pem`) to access the VM. |

---

## ☁️ Step 2: The Backend (Supabase on Azure VM)

We are hosting the "Brain" of your app on a Linux VM.

1. **Create the VM:**
   * Create a **Virtual Machine** in Azure (Ubuntu 22.04 LTS).
   * Size: **Standard_B2s** (2 vCPUs, 4GB RAM) is recommended.
   * **Networking:** Open ports `22` (SSH), `8000` (API), and `3000` (Studio).

2. **Run the Deployment:**
   * Simply push your code to GitHub.
   * The `deploy-supabase.yml` workflow will automatically log into your VM, install Docker, and start the Supabase stack.

3. **Initialize Database:**
   * Once the VM is running, log into your Supabase dashboard at `http://YOUR_VM_IP:3000`.
   * Run the contents of `database.sql` in the SQL Editor to create your tables.

---

## 🖥️ Step 3: The Frontend (Azure Web App)

We are hosting your website UI as a Docker container.

1. **Create the Web App:**
   * Create a **Web App** in Azure.
   * **Publish:** Docker Container.
   * **Operating System:** Linux.
   * **Plan:** Basic (B1) or higher.

2. **🚨 CRITICAL: The "Disconnect" Fix:**
   * Go to your Web App -> **Deployment Center**.
   * Click **"Disconnect"** at the top and confirm. 
   * *Required to stop Azure from re-creating bad .NET files.*

3. **Configure Scaling (Optional):**
   * If your site gets busy, you can scale the app service easily in the portal.

---

## 🔄 Step 4: Ongoing Updates

Whenever you want to update your site:
1. Make your changes in VS Code.
2. `git add .`
3. `git commit -m "Your update message"`
4. `git push origin main`

GitHub will automatically:
* Re-build your Docker image.
* Deploy the new version to your Azure Web App.
* update your Backend if any Docker configs changed.

---

## 🆘 Troubleshooting

* **"Build Failed":** Check if you have capital letters in your Repo name (I've fixed this with a lowercase script, but double check).
* **"Connection Refused":** Ensure your Azure VM Network Security Group (NSG) has port `8000` open.
* **"No Credentials Found":** ensure your `AZUREAPPSERVICE_CLIENTID` etc. are correctly set in GitHub (created automatically by Azure during initial setup).

---

> [!IMPORTANT]
> Your app is now a professional-grade distribution. Everything is hosted on **your** Azure account, giving you 100% ownership of your data and zero dependency on Supabase Cloud.

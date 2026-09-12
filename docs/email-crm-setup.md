# Microsoft 365 / Outlook Email CRM — Setup & Deployment Guide

This guide provides step-by-step instructions for configuring Microsoft 365 / Exchange Online integration for the Fortline-Pvt Executive Sales Operations CRM.

---

## 1. Prerequisites

1. Access to **Microsoft Entra admin center** (`https://entra.microsoft.com`) with **Global Administrator** or **Privileged Role Administrator** rights.
2. A Microsoft 365 tenant with Exchange Online licenses for your sales team mailboxes (e.g., `@fortline.net`).
3. Your Fortline CRM deployment URL (e.g. `https://fortline-pvt.vercel.app`).

---

## 2. Microsoft Entra ID App Registration

### Step 2.1: Register New Application
1. Navigate to **Microsoft Entra admin center** &rarr; **Applications** &rarr; **App registrations**.
2. Click **New registration**.
3. Name: `Fortline Sales Operations CRM`.
4. Supported account types: **Accounts in this organizational directory only (Single tenant)**.
5. Redirect URI: Select **Web** and enter:
   `https://fortline-pvt.vercel.app/api/email/auth/callback`
6. Click **Register**.

### Step 2.2: Note App Identifiers
From the **Overview** tab of the registered application, copy:
- **Application (client) ID** &rarr; `MICROSOFT_CLIENT_ID`
- **Directory (tenant) ID** &rarr; `MICROSOFT_TENANT_ID`

### Step 2.3: Generate Client Secret
1. In the app registration, navigate to **Certificates & secrets** &rarr; **Client secrets**.
2. Click **New client secret**.
3. Description: `Fortline CRM Production Secret`.
4. Expires: Choose 12 or 24 months.
5. Click **Add**.
6. **Immediately copy the Value** (not the Secret ID) &rarr; `MICROSOFT_CLIENT_SECRET`.

---

## 3. Microsoft Graph API Permissions

The Fortline Email CRM utilizes server-to-server daemon synchronization (Client Credentials flow) to monitor the 30 sales mailboxes without requiring individual employee passwords.

### Step 3.1: Add Application Permissions
1. In your App Registration, navigate to **API permissions**.
2. Click **Add a permission** &rarr; select **Microsoft Graph**.
3. Select **Application permissions** (NOT Delegated permissions).
4. Add the following permissions:
   - `Mail.ReadWrite` — To synchronize email messages and update read states.
   - `Mail.Send` — To allow CEO authorized send-as on behalf of monitored mailboxes.
   - `User.Read.All` — To read mailbox profiles and user IDs.
5. Click **Add permissions**.

### Step 3.2: Grant Admin Consent
1. Click the button: **Grant admin consent for [Your Organization]**.
2. Confirm by clicking **Yes**.
3. Verify that all permissions show a green checkmark under **Status**.

---

## 4. Scoping Mailbox Access with Exchange Online RBAC (Crucial Security)

By default, `Mail.ReadWrite` allows an application to access all mailboxes in the tenant. To restrict access **ONLY** to the 30 Fortline sales members (Principle of Least Privilege):

1. Connect to Exchange Online PowerShell:
   ```powershell
   Connect-ExchangeOnline -UserPrincipalName admin@fortline.net
   ```
2. Create a Mail-Enabled Security Group containing the 30 monitored sales mailboxes:
   ```powershell
   New-DistributionGroup -Name "FortlineMonitoredSalesMailboxes" -Type "Security"
   ```
3. Add the 30 sales members to this group:
   ```powershell
   Add-DistributionGroupMember -Identity "FortlineMonitoredSalesMailboxes" -Member "rep1@fortline.net"
   # Repeat for all 30 members
   ```
4. Create an Application Access Policy restricting the Entra App ID to this group:
   ```powershell
   New-ApplicationAccessPolicy -AppId "<YOUR_MICROSOFT_CLIENT_ID>" -PolicyScopeGroupId "FortlineMonitoredSalesMailboxes@fortline.net" -AccessRight RestrictAccess -Description "Restrict Fortline CRM to monitored sales mailboxes only"
   ```
5. Test the policy:
   ```powershell
   Test-ApplicationAccessPolicy -AppId "<YOUR_MICROSOFT_CLIENT_ID>" -Identity "rep1@fortline.net"
   # Should return: AccessCheckResult: Granted
   ```

---

## 5. Environment Variables Configuration

Add the following variables to your `.env` locally and in **Vercel Project Settings &rarr; Environment Variables**:

```env
# Microsoft 365 / Outlook Email CRM
MICROSOFT_CLIENT_ID=your-entra-client-id
MICROSOFT_CLIENT_SECRET=your-entra-client-secret
MICROSOFT_TENANT_ID=your-entra-tenant-id
MICROSOFT_REDIRECT_URI=https://fortline-pvt.vercel.app/api/email/auth/callback
EMAIL_ENCRYPTION_KEY=b2e1fe20ce707497f2bb58fa771352c01fcc6fb710173db5a674b4ea1f3c7423
```

---

## 6. Webhook Change Notifications & Initial Sync

1. Once the application is deployed to Vercel, navigate to **Mailboxes** in the CRM: `/email/accounts`.
2. Click **Sync All Mailboxes** to trigger the initial historical message pull (default 30 days).
3. Click **Renew Webhooks** to establish Microsoft Graph change notification subscriptions.
4. Microsoft Graph change notifications will automatically ping `https://fortline-pvt.vercel.app/api/email/webhook` whenever a sales member receives or sends an email.

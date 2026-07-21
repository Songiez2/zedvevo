# GitHub Actions + Vercel Deployment Setup

This repository now has GitHub Actions workflows configured for automatic deployment to Vercel.

## Workflows Created

### 1. Production Deployment (`.github/workflows/vercel-deploy.yml`)
- **Triggers**: Push to `main` branch, manual workflow dispatch
- **Action**: Builds and deploys to Vercel production environment

### 2. Preview Deployment (`.github/workflows/vercel-preview.yml`)
- **Triggers**: Pull requests to `main` branch, manual workflow dispatch
- **Action**: Creates preview deployments and comments PR with preview URL

## Required GitHub Secrets

To enable these workflows, you need to add the following secrets to your GitHub repository:

### Step 1: Get Vercel Token
1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Create a new token with "Full Access" scope
3. Copy the token

### Step 2: Get Vercel Project IDs
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **General**
3. Copy **Project ID**
4. For **Organization ID**, either:
   - Get it from Vercel dashboard URL: `https://vercel.com/[org-id]/[project-name]`
   - Or run: `vercel whoami` in your project directory

### Step 3: Add Secrets to GitHub
1. Go to your GitHub repository: `https://github.com/Songiez2/zedvevo`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | Your Vercel token from Step 1 |
| `VERCEL_ORG_ID` | Your Vercel organization ID from Step 2 |
| `VERCEL_PROJECT_ID` | Your Vercel project ID from Step 2 |

## Environment Variables

Make sure your Vercel project has these environment variables configured:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- Any other required environment variables from your `.env.production` file

## Usage

### Automatic Production Deployment
```bash
git add .
git commit -m "Your changes"
git push origin main
```
This will automatically trigger the production deployment workflow.

### Automatic Preview Deployment
Create a pull request to `main` branch - a preview deployment will be created automatically.

### Manual Deployment
You can manually trigger either workflow from the **Actions** tab in GitHub.

## Troubleshooting

### "Project not found" error
- Verify your `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct
- Ensure the Vercel project is linked to your account

### Build failures
- Check that `npm run build` works locally
- Verify all dependencies are properly installed
- Check the workflow logs in GitHub Actions

### Permission errors
- Ensure your Vercel token has "Full Access" scope
- Verify the token hasn't expired

## Next Steps

1. Add the required GitHub secrets
2. Configure environment variables in Vercel dashboard
3. Test by pushing a commit to `main`
4. Verify deployment in Vercel dashboard
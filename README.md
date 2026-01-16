# Calculator Web App

A modern, responsive calculator built with HTML, CSS, and JavaScript.

## Features

- Clean, modern design with gradient background
- Responsive layout for all screen sizes
- Basic arithmetic operations (+, -, ×, ÷)
- Decimal point support
- Keyboard support
- Error handling

## Local Development

Simply open `index.html` in your web browser. No build process required.

## Keyboard Shortcuts

- Numbers: 0-9
- Operators: +, -, *, /
- Calculate: Enter or =
- Clear: Escape, C, or c
- Decimal: .

## Deployment Setup

### Step 1: Configure Git (if not already done)

Run these commands in your terminal:

```bash
git config user.email "your-github-email@example.com"
git config user.name "Ariel"
```

### Step 2: Create Initial Commit

```bash
git add .
git commit -m "Initial commit: Add calculator web app"
```

### Step 3: Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `calculator-app`
3. Do NOT initialize with README, .gitignore, or license
4. Click "Create repository"

### Step 4: Push to GitHub

Run these commands (replace `YOUR-USERNAME` with your GitHub username):

```bash
git remote add origin https://github.com/YOUR-USERNAME/calculator-app.git
git branch -M main
git push -u origin main
```

### Step 5: Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - Login to your Vercel account
   - Link to existing project or create new one
   - Accept default settings
   - Deploy!

4. Enable automatic deployments:
   ```bash
   vercel --prod
   ```

#### Option B: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Click "Import Project"
3. Import your GitHub repository
4. Vercel will auto-detect the settings
5. Click "Deploy"

### Step 6: Enable Auto-Deploy

Once connected to Vercel:

- Every push to `main` branch will automatically deploy to production
- Pull requests will generate preview deployments
- You can view deployment status in the Vercel dashboard

## Auto-Deploy Workflow

After the initial setup, your workflow is:

1. Make changes to your code
2. Commit changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```
3. Push to GitHub:
   ```bash
   git push
   ```
4. Vercel automatically deploys your changes!

## Project Structure

```
calculator-app/
├── index.html          # Main app file (HTML, CSS, JS)
├── vercel.json         # Vercel configuration
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## Technologies Used

- HTML5
- CSS3 (Flexbox, Grid, Gradients)
- Vanilla JavaScript
- Vercel (Hosting)

## License

MIT

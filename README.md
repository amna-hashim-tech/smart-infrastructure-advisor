# Smart Infrastructure Advisor

An AI-powered tool that generates Azure architecture recommendations with real-time pricing and Terraform code.

**Live Demo:** https://smart-infrastructure-advisor-zepn.vercel.app

## What It Does

Describe your project requirements, and this tool will:
- Recommend the right Azure services for your needs
- Show you real pricing from Azure's API
- Generate production-ready Terraform code
- Create architecture diagrams
- Export everything to PDF

## Tech Stack

**Backend:** Node.js, Express  
**AI:** Anthropic Claude API (Sonnet 4)  
**APIs:** Azure Retail Prices API  
**Frontend:** JavaScript, HTML, CSS  
**Deployment:** Vercel with GitHub Actions

## Run It Locally
```bash
git clone https://github.com/amna-hashim-tech/smart-infrastructure-advisor.git
cd smart-infrastructure-advisor
npm install
```

Create a `.env` file:
```
ANTHROPIC_API_KEY=your_key_here
PORT=3000
```

Start the server:
```bash
node server.js
```

Open http://localhost:3000

## How I Built It

The app uses Claude AI to analyze project requirements and recommend Azure architectures. It then fetches real-time pricing from Microsoft's public API and generates Terraform code for deployment.

GitHub Actions handles automatic deployment to Vercel whenever I push new code.

## API Endpoints

- `/api/analyze` - Get architecture recommendations
- `/api/generate-diagram` - Create Mermaid diagrams  
- `/api/generate-terraform` - Generate IaC code
- `/api/get-pricing` - Fetch Azure pricing
- `/api/question` - Ask follow-up questions

## Why I Built This

As a cloud engineer, I wanted a faster way to prototype Azure architectures with accurate cost estimates. This tool combines AI recommendations with real Azure pricing to help make better infrastructure decisions.

## Feedback Welcome

Try it out and let me know what you think! Open to suggestions and improvements.


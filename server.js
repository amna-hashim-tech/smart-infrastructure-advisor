require('dotenv').config();
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Main endpoint: Analyze requirements and recommend architecture
app.post('/api/analyze', async (req, res) => {
  try {
    const { requirements, includeTerraform } = req.body;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `You are an Azure Cloud Solutions Architect. Analyze these project requirements and provide a comprehensive infrastructure recommendation.

PROJECT REQUIREMENTS:
${requirements}

Provide your response in this exact JSON format:
{
  "summary": "Brief project summary (2-3 sentences)",
  "architecture": {
    "core_services": ["service1", "service2"],
    "compute": "recommended compute option",
    "storage": "recommended storage solution",
    "networking": "networking approach",
    "security": "security measures"
  },
  "cost_estimate": {
    "monthly_range": "$X - $Y USD",
    "breakdown": ["item1: $X", "item2: $Y"]
  },
  "deployment_steps": ["step1", "step2", "step3"],
  "considerations": ["consideration1", "consideration2"]
}

CRITICAL: Return ONLY valid JSON. No markdown, no backticks, no explanations. Just pure JSON that can be parsed directly.`
      }]
    });

    let responseText = message.content[0].text.trim();
    
    // Clean up markdown formatting if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to parse JSON
    let architecture;
    try {
      architecture = JSON.parse(responseText);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response Text:', responseText);
      
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        architecture = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse architecture response as JSON');
      }
    }
    
    res.json({ success: true, architecture });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate architecture diagram
app.post('/api/generate-diagram', async (req, res) => {
  try {
    const { architecture } = req.body;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are an Azure architect. Generate a Mermaid diagram for this architecture:

${JSON.stringify(architecture, null, 2)}

Create a professional Mermaid flowchart showing:
- Use "graph TB" (top to bottom)
- Start with Users/Clients
- Show all core Azure services
- Include data flow arrows with labels
- Group related services
- Use clear, professional Azure service names

IMPORTANT RULES:
- Use only standard Mermaid syntax (graph TB, arrows, boxes)
- Keep it simple and readable
- No special styling or subgraphs
- Each service in its own box

Example format:
graph TB
    A[Users] --> B[Azure Front Door]
    B --> C[Azure App Service]
    C --> D[Azure SQL Database]

Return ONLY the Mermaid code starting with "graph TB", no explanations, no markdown backticks.`
      }]
    });

    let diagramCode = message.content[0].text.trim();
    
    // Clean up any markdown formatting
    diagramCode = diagramCode.replace(/```mermaid\n?/g, '').replace(/```\n?/g, '');
    
    res.json({ success: true, diagramCode });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate Terraform code
app.post('/api/generate-terraform', async (req, res) => {
  try {
    const { architecture } = req.body;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `You are an Azure DevOps engineer. Generate Terraform code for this architecture:

${JSON.stringify(architecture, null, 2)}

Generate complete, production-ready Terraform code including:
- Provider configuration
- Resource group
- All core services mentioned
- Networking components
- Security configurations
- Variables and outputs

Return ONLY the Terraform code, no explanations or markdown formatting.`
      }]
    });

    const terraformCode = message.content[0].text;
    res.json({ success: true, terraformCode });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get real Azure pricing
app.post('/api/get-pricing', async (req, res) => {
  try {
    const { services } = req.body;
    
    const pricing = {};
    
    for (const service of services) {
      try {
        // Map common service names to Azure API service names
        const serviceMap = {
          'Azure App Service': 'Virtual Machines',
          'Azure Functions': 'Functions',
          'Azure SQL Database': 'SQL Database',
          'Azure Cosmos DB': 'Azure Cosmos DB',
          'Azure Storage': 'Storage',
          'Azure Blob Storage': 'Storage',
          'Azure CDN': 'Content Delivery Network',
          'Azure Media Services': 'Media Services',
          'Azure SignalR Service': 'SignalR Service',
          'Azure Communication Services': 'Communication Services',
          'Azure Key Vault': 'Key Vault',
          'Azure Application Gateway': 'Application Gateway',
          'Azure Logic Apps': 'Logic Apps',
          'Azure API Management': 'API Management'
        };
        
        const mappedService = serviceMap[service] || service;
        
        // Azure Retail Prices API
        const filter = encodeURIComponent(`serviceName eq '${mappedService}' and priceType eq 'Consumption' and currencyCode eq 'USD'`);
        const url = `https://prices.azure.com/api/retail/prices?$filter=${filter}&$top=5`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.Items && data.Items.length > 0) {
          pricing[service] = {
            price: data.Items[0].retailPrice || 0,
            unit: data.Items[0].unitOfMeasure || 'Hour',
            region: data.Items[0].armRegionName || 'eastus',
            skuName: data.Items[0].skuName || 'Standard'
          };
        } else {
          pricing[service] = {
            price: 0,
            unit: 'N/A',
            region: 'eastus',
            skuName: 'Contact Azure'
          };
        }
      } catch (error) {
        console.error(`Error fetching pricing for ${service}:`, error);
        pricing[service] = {
          price: 0,
          unit: 'N/A',
          region: 'eastus',
          skuName: 'Error'
        };
      }
    }
    
    res.json({ success: true, pricing });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Follow-up Q&A endpoint
app.post('/api/question', async (req, res) => {
  try {
    const { question, context } = req.body;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are an Azure Cloud Solutions Architect. 

PREVIOUS RECOMMENDATION:
${JSON.stringify(context, null, 2)}

USER QUESTION:
${question}

Provide a clear, concise answer focused on Azure best practices. Keep response under 300 words.`
      }]
    });

    const answer = message.content[0].text;
    res.json({ success: true, answer });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
let currentArchitecture = null;
let currentTerraform = null;
let currentDiagram = null;
let currentRequirements = null;

// Load saved analyses on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSavedAnalyses();
    
    const questionInput = document.getElementById('question');
    if (questionInput) {
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                askQuestion();
            }
        });
    }
});

function loadSavedAnalyses() {
    const saved = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    const savedList = document.getElementById('savedList');
    
    if (saved.length === 0) {
        savedList.innerHTML = '<p class="empty-state">No saved analyses yet</p>';
        return;
    }
    
    savedList.innerHTML = saved.map((item, index) => `
        <div class="saved-item" onclick="loadAnalysis(${index})">
            <div class="saved-item-text">
                <div class="saved-item-name">${item.name}</div>
                <div class="saved-item-date">${new Date(item.date).toLocaleDateString()}</div>
            </div>
            <button class="delete-saved" onclick="event.stopPropagation(); deleteAnalysis(${index})">×</button>
        </div>
    `).join('');
}

function saveAnalysis() {
    if (!currentArchitecture) return;
    
    const name = prompt('Name this analysis:', `Analysis ${new Date().toLocaleDateString()}`);
    if (!name) return;
    
    const saved = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    saved.push({
        name,
        date: new Date().toISOString(),
        requirements: currentRequirements,
        architecture: currentArchitecture,
        terraform: currentTerraform,
        diagram: currentDiagram
    });
    
    localStorage.setItem('savedAnalyses', JSON.stringify(saved));
    loadSavedAnalyses();
    alert('Analysis saved successfully!');
}

function loadAnalysis(index) {
    const saved = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    const analysis = saved[index];
    
    if (!analysis) return;
    
    currentRequirements = analysis.requirements;
    currentArchitecture = analysis.architecture;
    currentTerraform = analysis.terraform;
    currentDiagram = analysis.diagram;
    
    document.getElementById('requirements').value = analysis.requirements;
    displayResults(analysis.architecture);
    
    if (analysis.terraform) {
        document.getElementById('terraformCode').textContent = analysis.terraform;
        document.getElementById('terraformSection').style.display = 'block';
    }
    
    if (analysis.diagram) {
        displayDiagram(analysis.diagram);
    }
    
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function deleteAnalysis(index) {
    if (!confirm('Delete this analysis?')) return;
    
    const saved = JSON.parse(localStorage.getItem('savedAnalyses') || '[]');
    saved.splice(index, 1);
    localStorage.setItem('savedAnalyses', JSON.stringify(saved));
    loadSavedAnalyses();
}

function clearAllSaved() {
    if (!confirm('Delete all saved analyses?')) return;
    
    localStorage.removeItem('savedAnalyses');
    loadSavedAnalyses();
}

async function analyzeRequirements() {
    const requirements = document.getElementById('requirements').value.trim();
    const includeTerraform = document.getElementById('includeTerraform').checked;
    const includeDiagram = document.getElementById('includeDiagram').checked;
    
    if (!requirements) {
        alert('Please describe your project requirements');
        return;
    }

    currentRequirements = requirements;

    const btn = document.getElementById('analyzeBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    
    btn.disabled = true;
    btnText.textContent = 'Analyzing...';
    btnLoader.style.display = 'inline-block';

    try {
        // Get architecture recommendation
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requirements, includeTerraform })
        });

        const data = await response.json();
        
        if (data.success) {
            currentArchitecture = data.architecture;
            displayResults(data.architecture);

            // Generate diagram if requested
            if (includeDiagram) {
                btnText.textContent = 'Generating diagram...';
                await generateDiagram(data.architecture);
            }

            // Generate Terraform if requested
            if (includeTerraform) {
                btnText.textContent = 'Generating Terraform...';
                await generateTerraform(data.architecture);
            }
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error analyzing requirements: ' + error.message);
    } finally {
        btn.disabled = false;
        btnText.textContent = 'Analyze & Generate Architecture';
        btnLoader.style.display = 'none';
    }
}

async function generateDiagram(architecture) {
    try {
        const response = await fetch('/api/generate-diagram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ architecture })
        });

        const data = await response.json();
        
        if (data.success) {
            currentDiagram = data.diagramCode;
            displayDiagram(data.diagramCode);
        }
    } catch (error) {
        console.error('Error generating diagram:', error);
    }
}

function displayDiagram(diagramCode) {
    const diagramContainer = document.getElementById('architectureDiagram');
    diagramContainer.innerHTML = `<pre class="mermaid">${diagramCode}</pre>`;
    document.getElementById('diagramSection').style.display = 'block';
    
    if (window.mermaid) {
        window.mermaid.run({
            querySelector: '.mermaid'
        });
    }
}

async function generateTerraform(architecture) {
    try {
        const response = await fetch('/api/generate-terraform', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ architecture })
        });

        const data = await response.json();
        
        if (data.success) {
            currentTerraform = data.terraformCode;
            document.getElementById('terraformCode').textContent = data.terraformCode;
            document.getElementById('terraformSection').style.display = 'block';
        }
    } catch (error) {
        console.error('Error generating Terraform:', error);
    }
}

function displayResults(arch) {
    document.getElementById('summary').textContent = arch.summary;

    // Architecture components
    const archDiv = document.getElementById('architecture');
    archDiv.innerHTML = `
        <div class="arch-item"><strong>Core Services:</strong> ${arch.architecture.core_services.join(', ')}</div>
        <div class="arch-item"><strong>Compute:</strong> ${arch.architecture.compute}</div>
        <div class="arch-item"><strong>Storage:</strong> ${arch.architecture.storage}</div>
        <div class="arch-item"><strong>Networking:</strong> ${arch.architecture.networking}</div>
        <div class="arch-item"><strong>Security:</strong> ${arch.architecture.security}</div>
    `;

    // Cost estimate with real pricing button
    const costDiv = document.getElementById('cost');
    costDiv.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <p style="font-size:1.3em; font-weight:bold; color:#212529; margin:0;">
                ${arch.cost_estimate.monthly_range}
            </p>
            <button onclick="fetchRealPricing()" style="padding:8px 16px; background:#28a745; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:600; font-size:0.9em;">
                💰 Get Real-Time Pricing
            </button>
        </div>
        <div style="margin-top:12px;">
            ${arch.cost_estimate.breakdown.map(item => `<div style="margin:8px 0;">• ${item}</div>`).join('')}
        </div>
    `;

    // Deployment steps
    const deployList = document.getElementById('deployment');
    deployList.innerHTML = arch.deployment_steps.map(step => `<li>${step}</li>`).join('');

    // Considerations
    const considerList = document.getElementById('considerations');
    considerList.innerHTML = arch.considerations.map(item => `<li>${item}</li>`).join('');

    // Clear previous Q&A
    document.getElementById('qaHistory').innerHTML = '';
    
    // Hide sections initially
    document.getElementById('terraformSection').style.display = 'none';
    document.getElementById('diagramSection').style.display = 'none';
    
    document.getElementById('results').style.display = 'block';
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

async function fetchRealPricing() {
    if (!currentArchitecture) return;
    
    const services = currentArchitecture.architecture.core_services;
    
    const costDiv = document.getElementById('cost');
    costDiv.innerHTML = '<p style="text-align:center; padding:20px;">⏳ Fetching real-time Azure pricing...</p>';
    
    try {
        const response = await fetch('/api/get-pricing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ services })
        });

        const data = await response.json();
        
        if (data.success) {
            displayRealPricing(data.pricing);
        } else {
            alert('Error fetching pricing');
        }
    } catch (error) {
        console.error('Error fetching pricing:', error);
        alert('Error fetching real-time pricing');
    }
}

function displayRealPricing(pricing) {
    const costDiv = document.getElementById('cost');
    
    let pricingHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
            <h4 style="color:#28a745; margin:0;">📊 Real-Time Azure Pricing</h4>
            <button onclick="fetchRealPricing()" style="padding:6px 12px; background:#6c757d; color:white; border:none; border-radius:6px; cursor:pointer; font-size:0.85em;">
                🔄 Refresh
            </button>
        </div>
    `;
    
    for (const [service, data] of Object.entries(pricing)) {
        pricingHTML += `
            <div class="pricing-item" style="background:white; padding:12px; margin:8px 0; border-radius:6px; border:1px solid #dee2e6;">
                <strong style="color:#212529;">${service}</strong><br>
                <span style="color:#6c757d; font-size:0.9em;">
                    $${data.price.toFixed(4)} per ${data.unit} | ${data.skuName} | ${data.region}
                </span>
            </div>
        `;
    }
    
    pricingHTML += '<p style="margin-top:12px; font-size:0.85em; color:#6c757d;">💡 Prices shown are base rates. Actual costs depend on usage, region, and configuration.</p>';
    
    costDiv.innerHTML = pricingHTML;
}

function copyTerraform() {
    if (!currentTerraform) return;
    
    navigator.clipboard.writeText(currentTerraform).then(() => {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

async function exportToPDF() {
    if (!currentArchitecture) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let y = 20;
    const pageHeight = 280;
    
    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Azure Architecture Recommendation', 20, y);
    y += 15;
    
    // Summary
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Executive Summary', 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const summaryLines = doc.splitTextToSize(currentArchitecture.summary, 170);
    doc.text(summaryLines, 20, y);
    y += summaryLines.length * 5 + 10;
    
    // Architecture Diagram
    if (currentDiagram) {
        const diagramElement = document.querySelector('#architectureDiagram .mermaid');
        if (diagramElement) {
            try {
                const canvas = await html2canvas(diagramElement, {
                    backgroundColor: '#ffffff',
                    scale: 2
                });
                const imgData = canvas.toDataURL('image/png');
                
                doc.addPage();
                y = 20;
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Architecture Diagram', 20, y);
                y += 10;
                
                const imgWidth = 170;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                doc.addImage(imgData, 'PNG', 20, y, imgWidth, imgHeight);
                
                doc.addPage();
                y = 20;
            } catch (error) {
                console.error('Error adding diagram to PDF:', error);
            }
        }
    }
    
    // Architecture Components
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Architecture Components', 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    const coreServices = doc.splitTextToSize(`Core Services: ${currentArchitecture.architecture.core_services.join(', ')}`, 170);
    doc.text(coreServices, 20, y);
    y += coreServices.length * 5 + 2;
    
    const compute = doc.splitTextToSize(`Compute: ${currentArchitecture.architecture.compute}`, 170);
    doc.text(compute, 20, y);
    y += compute.length * 5 + 2;
    
    const storage = doc.splitTextToSize(`Storage: ${currentArchitecture.architecture.storage}`, 170);
    doc.text(storage, 20, y);
    y += storage.length * 5 + 2;
    
    const networking = doc.splitTextToSize(`Networking: ${currentArchitecture.architecture.networking}`, 170);
    doc.text(networking, 20, y);
    y += networking.length * 5 + 2;
    
    const security = doc.splitTextToSize(`Security: ${currentArchitecture.architecture.security}`, 170);
    doc.text(security, 20, y);
    y += security.length * 5 + 10;
    
    // Cost - Check if real-time pricing is displayed
    if (y > 250) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');

    // Check if the cost div contains real-time pricing
    const costDiv = document.getElementById('cost');
    const hasRealPricing = costDiv.innerHTML.includes('Real-Time Azure Pricing');

    if (hasRealPricing) {
        doc.text('Real-Time Azure Pricing', 20, y);
        y += 7;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        
        // Extract pricing from the page
        const pricingItems = costDiv.querySelectorAll('.pricing-item');
        pricingItems.forEach(item => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            const serviceName = item.querySelector('strong').textContent;
            const priceInfo = item.querySelector('span').textContent;
            
            doc.setFont(undefined, 'bold');
            doc.text(serviceName, 20, y);
            y += 5;
            doc.setFont(undefined, 'normal');
            const priceLines = doc.splitTextToSize(priceInfo, 170);
            doc.text(priceLines, 20, y);
            y += priceLines.length * 4 + 3;
        });
        y += 5;
    } else {
        doc.text('Cost Estimate', 20, y);
        y += 7;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(currentArchitecture.cost_estimate.monthly_range, 20, y);
        y += 6;
        currentArchitecture.cost_estimate.breakdown.forEach(item => {
            doc.text(`• ${item}`, 20, y);
            y += 5;
        });
    }
    y += 10;
    
    // Deployment Steps
    if (y > 230) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Deployment Checklist', 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    currentArchitecture.deployment_steps.forEach((step, idx) => {
        const stepLines = doc.splitTextToSize(`${idx + 1}. ${step}`, 170);
        doc.text(stepLines, 20, y);
        y += stepLines.length * 5 + 2;
        if (y > pageHeight) {
            doc.addPage();
            y = 20;
        }
    });
    y += 10;
    
    // Considerations
    if (y > 230) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Key Considerations', 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    currentArchitecture.considerations.forEach(item => {
        const itemLines = doc.splitTextToSize(`• ${item}`, 170);
        doc.text(itemLines, 20, y);
        y += itemLines.length * 5 + 2;
        if (y > pageHeight) {
            doc.addPage();
            y = 20;
        }
    });
    
    // Terraform Code
    if (currentTerraform) {
        doc.addPage();
        y = 20;
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Terraform Infrastructure Code', 20, y);
        y += 10;
        
        doc.setFontSize(8);
        doc.setFont('courier', 'normal');
        
        const terraformLines = currentTerraform.split('\n');
        
        terraformLines.forEach(line => {
            if (y > pageHeight) {
                doc.addPage();
                y = 20;
            }
            
            if (line.length > 90) {
                const wrappedLines = doc.splitTextToSize(line, 170);
                wrappedLines.forEach(wrappedLine => {
                    doc.text(wrappedLine, 20, y);
                    y += 4;
                });
            } else {
                doc.text(line, 20, y);
                y += 4;
            }
        });
    }
    
    doc.save('azure-architecture-recommendation.pdf');
}

async function askQuestion() {
    const questionInput = document.getElementById('question');
    const question = questionInput.value.trim();
    
    if (!question) {
        alert('Please enter a question');
        return;
    }

    if (!currentArchitecture) {
        alert('Please analyze requirements first');
        return;
    }

    try {
        const response = await fetch('/api/question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                question, 
                context: currentArchitecture 
            })
        });

        const data = await response.json();
        
        if (data.success) {
            const qaHistory = document.getElementById('qaHistory');
            const qaItem = document.createElement('div');
            qaItem.className = 'qa-item';
            qaItem.innerHTML = `
                <div class="qa-question">Q: ${question}</div>
                <div class="qa-answer">${data.answer.replace(/\n/g, '<br>')}</div>
            `;
            qaHistory.appendChild(qaItem);
            questionInput.value = '';
            qaItem.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
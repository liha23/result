#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

/**
 * Generate PDF from FLOWCHART.md
 * This script converts the flowchart markdown to a formatted PDF
 */

async function generatePDF() {
    console.log('📄 Reading FLOWCHART.md...');
    
    // Read the markdown file
    const markdownPath = path.join(__dirname, 'FLOWCHART.md');
    const markdownContent = fs.readFileSync(markdownPath, 'utf8');
    
    console.log('✅ Markdown file read successfully');
    console.log('📝 Creating PDF document...');
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Embed fonts
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
    
    // Page settings
    const pageWidth = 612; // Letter size width in points
    const pageHeight = 792; // Letter size height in points
    const margin = 50;
    const maxWidth = pageWidth - (2 * margin);
    
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPosition = pageHeight - margin;
    const lineHeight = 14;
    const paragraphSpacing = 8;
    
    // Helper function to add a new page
    function addNewPage() {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
    }
    
    // Helper function to check if we need a new page
    function checkPageBreak(requiredHeight = lineHeight) {
        if (yPosition - requiredHeight < margin) {
            addNewPage();
            return true;
        }
        return false;
    }
    
    // Helper function to draw text with word wrapping
    function drawText(text, fontSize, font, color = rgb(0, 0, 0)) {
        const words = text.split(' ');
        let line = '';
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const testWidth = font.widthOfTextAtSize(testLine, fontSize);
            
            if (testWidth > maxWidth && line !== '') {
                // Draw the current line
                checkPageBreak();
                currentPage.drawText(line.trim(), {
                    x: margin,
                    y: yPosition,
                    size: fontSize,
                    font: font,
                    color: color,
                });
                yPosition -= lineHeight;
                line = words[i] + ' ';
            } else {
                line = testLine;
            }
        }
        
        // Draw the last line
        if (line.trim()) {
            checkPageBreak();
            currentPage.drawText(line.trim(), {
                x: margin,
                y: yPosition,
                size: fontSize,
                font: font,
                color: color,
            });
            yPosition -= lineHeight;
        }
    }
    
    // Helper function to replace Unicode characters with ASCII equivalents
    function normalizeText(text) {
        return text
            .replace(/↓/g, '|')
            .replace(/↑/g, '^')
            .replace(/→/g, '->')
            .replace(/←/g, '<-')
            .replace(/↔/g, '<->')
            .replace(/├─/g, '|-')
            .replace(/└─/g, '+-')
            .replace(/─/g, '-')
            .replace(/│/g, '|')
            .replace(/═/g, '=')
            .replace(/║/g, '||')
            .replace(/╔/g, '+')
            .replace(/╗/g, '+')
            .replace(/╚/g, '+')
            .replace(/╝/g, '+')
            .replace(/"/g, '"')
            .replace(/"/g, '"')
            .replace(/'/g, "'")
            .replace(/'/g, "'")
            .replace(/—/g, '--')
            .replace(/–/g, '-')
            .replace(/…/g, '...')
            .replace(/•/g, '*');
    }
    
    // Parse markdown and format for PDF
    const lines = markdownContent.split('\n');
    let inCodeBlock = false;
    let inList = false;
    
    console.log('✍️  Processing content...');
    
    for (let i = 0; i < lines.length; i++) {
        let line = normalizeText(lines[i]);
        
        // Check for code blocks
        if (line.startsWith('```')) {
            inCodeBlock = !inCodeBlock;
            yPosition -= paragraphSpacing;
            continue;
        }
        
        if (inCodeBlock) {
            // Draw code block lines in monospace
            checkPageBreak();
            const codeText = line.substring(0, 90); // Truncate if too long
            currentPage.drawText(codeText, {
                x: margin + 10,
                y: yPosition,
                size: 9,
                font: courierFont,
                color: rgb(0.2, 0.2, 0.4),
            });
            yPosition -= 11;
            continue;
        }
        
        // Skip mermaid blocks (we can't render these in simple PDF)
        if (line.includes('mermaid') || line.includes('graph') || line.includes('flowchart')) {
            // Skip until we find the end of the code block
            while (i < lines.length && !lines[i].startsWith('```')) {
                i++;
            }
            continue;
        }
        
        // Handle headers
        if (line.startsWith('# ')) {
            yPosition -= paragraphSpacing * 2;
            checkPageBreak(30);
            drawText(line.substring(2), 20, timesRomanBoldFont, rgb(0, 0, 0.5));
            yPosition -= paragraphSpacing;
            continue;
        }
        
        if (line.startsWith('## ')) {
            yPosition -= paragraphSpacing * 1.5;
            checkPageBreak(25);
            drawText(line.substring(3), 16, timesRomanBoldFont, rgb(0.1, 0.1, 0.6));
            yPosition -= paragraphSpacing / 2;
            continue;
        }
        
        if (line.startsWith('### ')) {
            yPosition -= paragraphSpacing;
            checkPageBreak(20);
            drawText(line.substring(4), 14, timesRomanBoldFont, rgb(0.2, 0.2, 0.7));
            yPosition -= paragraphSpacing / 2;
            continue;
        }
        
        // Handle horizontal rules
        if (line.trim() === '---') {
            yPosition -= paragraphSpacing;
            checkPageBreak(5);
            currentPage.drawLine({
                start: { x: margin, y: yPosition },
                end: { x: pageWidth - margin, y: yPosition },
                thickness: 1,
                color: rgb(0.7, 0.7, 0.7),
            });
            yPosition -= paragraphSpacing;
            continue;
        }
        
        // Handle lists
        if (line.match(/^\d+\.\s/) || line.match(/^[-*]\s/)) {
            checkPageBreak();
            const indent = line.match(/^\s*/)[0].length;
            const bulletText = line.trim();
            currentPage.drawText(bulletText.substring(0, 100), {
                x: margin + (indent * 5),
                y: yPosition,
                size: 11,
                font: timesRomanFont,
                color: rgb(0, 0, 0),
            });
            yPosition -= lineHeight;
            continue;
        }
        
        // Handle regular paragraphs
        if (line.trim()) {
            // Remove markdown formatting
            let cleanLine = line
                .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
                .replace(/\*(.+?)\*/g, '$1')     // Italic
                .replace(/`(.+?)`/g, '$1')       // Code
                .replace(/\[(.+?)\]\(.+?\)/g, '$1'); // Links
            
            drawText(cleanLine, 11, timesRomanFont);
        } else {
            // Empty line - add spacing
            yPosition -= paragraphSpacing / 2;
        }
    }
    
    console.log('💾 Saving PDF...');
    
    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    const outputPath = path.join(__dirname, 'FLOWCHART.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log(`✅ PDF generated successfully: ${outputPath}`);
    console.log(`📊 Total pages: ${pdfDoc.getPageCount()}`);
    console.log(`📦 File size: ${(pdfBytes.length / 1024).toFixed(2)} KB`);
}

// Run the generator
generatePDF().catch(error => {
    console.error('❌ Error generating PDF:', error);
    process.exit(1);
});

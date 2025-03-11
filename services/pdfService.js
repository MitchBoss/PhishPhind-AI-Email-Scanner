/**
 * pdfService.js - PDF generation
 */

const PdfService = (function() {
    /**
     * Initialize PDF service
     */
    function init() {
      console.log('PdfService initialized');
    }
    
    /**
     * Generate PDF from analysis results
     * @param {string} tabContentSelector - Selector for tab content
     * @returns {jsPDF} - PDF document
     */
    function generatePDF(tabContentSelector = '#resultTabsContent') {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const title = "PhishPhind Analysis Results";
      
      // Add title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(title, 105, 10, { align: "center" });
      
      // Add date
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Generated: " + new Date().toLocaleString(), 105, 18, { align: "center" });
      
      let yPos = 25;
      let currentPage = 1;
      
      // Create footer with pagination
      const addFooter = () => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Page ${currentPage} of ${pageCount}`, 105, 290, { align: "center" });
        currentPage++;
      };
      
      // Add each tab's content
      const tabPanes = document.querySelectorAll(`${tabContentSelector} .tab-pane`);
      tabPanes.forEach((tabPane, i) => {
        // Get section heading
        const heading = tabPane.querySelector("h3").textContent;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(heading, 10, yPos);
        yPos += 8;
        
        // Add summary section
        const summaryDiv = tabPane.querySelector(".result-summary");
        if (summaryDiv) {
          doc.setFont("helvetica", "bold");
          doc.text("Summary", 10, yPos);
          yPos += 6;
          
          doc.setFont("helvetica", "normal");
          
          // Process the summary content with proper formatting
          const summaryContent = extractFormattedContent(summaryDiv);
          yPos = renderFormattedContent(doc, summaryContent, yPos);
          
          yPos += 4;
        }
        
        // Add details section
        const contentDiv = tabPane.querySelector(".result-content");
        if (contentDiv) {
          doc.setFont("helvetica", "bold");
          doc.text("Details", 10, yPos);
          yPos += 6;
          
          doc.setFont("helvetica", "normal");
          
          // Process the content with proper formatting
          const formattedContent = extractFormattedContent(contentDiv);
          yPos = renderFormattedContent(doc, formattedContent, yPos);
        }
        
        // Add separator and footer
        addFooter();
        
        // Add new page for next section if not the last one
        if (i < tabPanes.length - 1) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      return doc;
    }
    
    /**
     * Extract formatted content from an HTML element
     * @param {Element} element - HTML element
     * @returns {Array} - Array of formatted text objects
     */
    function extractFormattedContent(element) {
      const result = [];
      
      // Process paragraphs and other block elements
      const paragraphs = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, pre, blockquote');
      
      if (paragraphs.length > 0) {
        // Element has structured content
        paragraphs.forEach(p => {
          const type = p.tagName.toLowerCase();
          let content = p.textContent.trim();
          
          if (type === 'ul' || type === 'ol') {
            // Process list items
            const items = p.querySelectorAll('li');
            content = Array.from(items).map(li => `• ${li.textContent.trim()}`).join('\n');
          }
          
          result.push({
            type,
            content,
            isBold: type.startsWith('h'),
            isItalic: p.closest('em, i') !== null,
            isCode: p.closest('pre, code') !== null || type === 'pre'
          });
        });
      } else {
        // Element has simple content, process text nodes directly
        const content = element.textContent.trim();
        
        // Split by line breaks to preserve some formatting
        const lines = content.split(/\n/);
        lines.forEach(line => {
          if (line.trim()) {
            result.push({
              type: 'p',
              content: line.trim(),
              isBold: false,
              isItalic: false,
              isCode: false
            });
          }
        });
      }
      
      return result;
    }
    
    /**
     * Render formatted content to PDF
     * @param {jsPDF} doc - PDF document
     * @param {Array} formattedContent - Array of formatted text objects
     * @param {number} startY - Starting Y position
     * @returns {number} - New Y position
     */
    function renderFormattedContent(doc, formattedContent, startY) {
      let yPos = startY;
      
      formattedContent.forEach(item => {
        // Set font based on formatting
        const fontStyle = item.isBold ? "bold" : item.isItalic ? "italic" : "normal";
        doc.setFont("helvetica", fontStyle);
        
        // Set font size based on element type
        let fontSize = 10;
        if (item.type === 'h1') fontSize = 16;
        else if (item.type === 'h2') fontSize = 14;
        else if (item.type === 'h3') fontSize = 12;
        else if (item.type === 'h4') fontSize = 11;
        else if (item.type === 'pre' || item.isCode) fontSize = 9;
        
        doc.setFontSize(fontSize);
        
        // Indent lists
        const indent = item.type === 'ul' || item.type === 'ol' ? 5 : 0;
        
        // Split text to fit page width (accounting for indentation)
        const maxWidth = 190 - indent;
        const lines = doc.splitTextToSize(item.content, maxWidth);
        
        // Render each line
        lines.forEach(line => {
          // Check if we need a new page
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.text(line, 10 + indent, yPos);
          yPos += fontSize * 0.5;
        });
        
        // Add spacing between items
        yPos += 4;
      });
      
      return yPos;
    }
    
    // Register service
    Services.register('PdfService', {
      init,
      generatePDF
    });
    
    return {
      init,
      generatePDF
    };
})();
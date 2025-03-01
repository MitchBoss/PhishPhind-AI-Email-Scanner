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
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      
      // Add each tab's content
      const tabPanes = document.querySelectorAll(`${tabContentSelector} .tab-pane`);
      tabPanes.forEach((tabPane, i) => {
        const heading = tabPane.querySelector("h3").textContent;
        const summaryDiv = tabPane.querySelector(".result-summary");
        const contentDiv = tabPane.querySelector(".result-content");
        
        // Add section heading
        doc.setFont("helvetica", "bold");
        doc.text(heading, 10, yPos);
        yPos += 8;
        
        // Add summary section
        doc.setFont("helvetica", "bold");
        doc.text("Summary", 10, yPos);
        yPos += 6;
        
        doc.setFont("helvetica", "normal");
        const summaryText = summaryDiv.textContent.replace(/\s+/g, ' ').trim();
        const summaryLines = doc.splitTextToSize(summaryText, 180);
        
        summaryLines.forEach(line => {
          doc.text(line, 10, yPos);
          yPos += 6;
          
          // Add new page if needed
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
        });
        
        yPos += 4;
        
        // Add details section
        doc.setFont("helvetica", "bold");
        doc.text("Details", 10, yPos);
        yPos += 6;
        
        doc.setFont("helvetica", "normal");
        const contentText = contentDiv.textContent.replace(/\s+/g, ' ').trim();
        const contentLines = doc.splitTextToSize(contentText, 180);
        
        contentLines.forEach(line => {
          doc.text(line, 10, yPos);
          yPos += 6;
          
          // Add new page if needed
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
        });
        
        // Add separator
        yPos += 10;
        
        // Add new page for next section
        if (i < tabPanes.length - 1) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      // Save the PDF
      doc.save('phishphind-analysis.pdf');
      
      return doc;
    }
    
    // Register service
    Services.register('PdfService', {
      init,
      generatePDF
    });
    
    // Return public API
    return {
      init,
      generatePDF
    };
  })();
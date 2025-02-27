// pdf.js - PDF generation utilities
const PdfGenerator = (function() {
    /* Generate PDF using jsPDF */
    function generatePDF(tabsContentSelector) {
      const doc = new jsPDF();
      const title = "Analysis Results";
      
      // Add title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(title, 105, 10, { align: "center" });
      
      let yPos = 20;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      
      // Add each tab's content
      $(tabsContentSelector + " .tab-pane").each((i, el) => {
        const $el = $(el);
        const heading = $el.find("h3").text();
        const summaryHtml = $el.find("div:nth-of-type(1)").html();
        const contentHtml = $el.find("div:nth-of-type(2)").html();
        
        // Add section heading
        doc.setFont("helvetica", "bold");
        doc.text(heading, 10, yPos);
        yPos += 8;
        
        // Add summary
        doc.setFont("helvetica", "normal");
        const summaryText = $("<div>").html(summaryHtml).text();
        const lines = doc.splitTextToSize(summaryText, 180);
        lines.forEach(line => {
          doc.text(line, 10, yPos);
          yPos += 6;
          
          // Add new page if we reach the bottom
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
        });
        
        yPos += 4;
        
        // Add content
        const outputText = $("<div>").html(contentHtml).text();
        const outLines = doc.splitTextToSize(outputText, 180);
        outLines.forEach(line => {
          doc.text(line, 10, yPos);
          yPos += 6;
          
          // Add new page if we reach the bottom
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
        });
        
        yPos += 10;
        
        // Add new page for next section
        if (i < $(tabsContentSelector + " .tab-pane").length - 1) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      doc.save("analysis_results.pdf");
    }
    
    // Public API
    return {
      generatePDF
    };
  })();
  
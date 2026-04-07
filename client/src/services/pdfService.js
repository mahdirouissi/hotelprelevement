import jsPDF from 'jspdf';

export const downloadPdf = (request) => {
  try {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text('ORDRE DE PRÉLÈVEMENT', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`N°: ORD-${String(request.id).padStart(6, '0')}`, 20, 35);
    
    // Date box
    doc.setFillColor(220, 230, 241);
    doc.rect(150, 25, 40, 15, 'F');
    doc.setFontSize(10);
    doc.text('Économat', 155, 32);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 155, 38);
    
    // Request info
    doc.setFillColor(240, 240, 240);
    doc.rect(20, 45, 170, 25, 'F');
    
    const serviceName = request.serviceName || '-';
    const requestDate = request.requestDate ? new Date(request.requestDate).toLocaleString('fr-FR') : '-';
    
    doc.setFontSize(10);
    doc.text('Service demandeur:', 25, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(serviceName, 25, 62);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Date de la demande:', 80, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(requestDate, 80, 62);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Statut:', 135, 55);
    doc.setFontSize(11);
    doc.setTextColor(0, 100, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('FINALISÉ', 135, 62);
    doc.setTextColor(0, 0, 0);
    
    // Table with all columns: Article, Code Produit, Désignation, Quantité
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Articles:', 20, 82);
    
    let yPos = 90;
    doc.setFillColor(0, 51, 102);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Article', 22, yPos + 5);
    doc.text('Code', 75, yPos + 5);
    doc.text('Désignation', 105, yPos + 5);
    doc.text('Qté', 175, yPos + 5);
    
    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    
    const items = request.items || [];
    items.forEach((item, index) => {
      const bgColor = index % 2 === 0 ? 245 : 255;
      doc.setFillColor(bgColor, bgColor, bgColor);
      doc.rect(20, yPos - 2, 170, 8, 'F');
      
      const article = item.productName || '-';
      const code = item.productCode || item.product?.code_Produit || '-';
      const designation = item.productDesignation || item.product?.designation || '-';
      const quantite = `${item.quantity || 0} ${item.unit || ''}`;
      
      doc.text(String(article).substring(0, 20), 22, yPos + 3);
      doc.text(String(code).substring(0, 12), 75, yPos + 3);
      doc.text(String(designation).substring(0, 30), 105, yPos + 3);
      doc.text(quantite, 175, yPos + 3);
      
      yPos += 8;
    });
    
    // Signatures in a table
    yPos += 15;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Signatures:', 20, yPos);
    
    yPos += 8;
    doc.setFillColor(0, 51, 102);
    doc.rect(20, yPos, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('Demandeur', 35, yPos + 5);
    doc.text('Control', 75, yPos + 5);
    doc.text('Directeur', 115, yPos + 5);
    doc.text('Economat', 155, yPos + 5);
    
    yPos += 10;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setFillColor(245, 245, 245);
    doc.rect(20, yPos - 2, 170, 15, 'F');
    
    doc.text('Signé', 35, yPos + 3);
    doc.text('Signé', 75, yPos + 3);
    doc.text('Signé', 115, yPos + 3);
    doc.text('Signé', 155, yPos + 3);
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 20, 280);
    
    // Save
    doc.save(`OrdrePrelevement_${request.id}.pdf`);
  } catch (err) {
    console.error('PDF generation error:', err);
    throw err;
  }
};
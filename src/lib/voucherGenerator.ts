import jsPDF from 'jspdf';
import { Reservation, Boat } from '@/types';

// Função para gerar QR code usando API online
const generateQRCodeImage = async (value: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Usar API online para gerar QR code
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Erro ao criar canvas'));
      }
    };
    
    img.onerror = () => {
      // Fallback: retornar URL direta se não conseguir converter
      resolve(qrUrl);
    };
    
    img.src = qrUrl;
  });
};

export const generateVoucherPDF = async (reservation: Reservation, boat: Boat) => {
  try {
    // Criar URL do voucher (será escaneada pelo admin)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const voucherUrl = `${baseUrl}/admin/voucher/${reservation.id}`;
    
    // Gerar QR code
    let qrCodeImage: string;
    try {
      qrCodeImage = await generateQRCodeImage(voucherUrl);
    } catch (error) {
      console.error('Erro ao gerar QR code, usando fallback:', error);
      // Fallback: usar API online diretamente
      qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(voucherUrl)}`;
    }

    // Criar PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Cabeçalho
    pdf.setFillColor(33, 150, 243); // viva-blue
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VIVA LA VIDA', pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Voucher de Embarque', pageWidth / 2, 30, { align: 'center' });

    // Informações do Cliente
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Dados do Passageiro', margin, 55);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${reservation.customerName}`, margin, 65);
    pdf.text(`Telefone: ${reservation.phone}`, margin, 72);
    pdf.text(`Assento: #${reservation.seatNumber}`, margin, 79);

    // Informações do Passeio
    const boatDate = new Date(boat.date).toLocaleDateString('pt-BR');
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Informações do Passeio', margin, 95);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Barco: ${boat.name}`, margin, 105);
    pdf.text(`Data: ${boatDate}`, margin, 112);
    pdf.text(`Tipo: ${boat.boatType === 'escuna' ? 'Escuna' : 'Lancha'}`, margin, 119);

    // Valores
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Valores', margin, 135);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total: R$ ${reservation.totalAmount.toFixed(2)}`, margin, 145);
    pdf.text(`Pago: R$ ${reservation.amountPaid.toFixed(2)}`, margin, 152);
    
    if (reservation.amountDue > 0) {
      pdf.setTextColor(255, 87, 34); // laranja
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Pendente: R$ ${reservation.amountDue.toFixed(2)}`, margin, 159);
      pdf.setTextColor(0, 0, 0);
    } else {
      pdf.setTextColor(76, 175, 80); // verde
      pdf.setFont('helvetica', 'bold');
      pdf.text('Pagamento Completo', margin, 159);
      pdf.setTextColor(0, 0, 0);
    }

    // QR Code
    try {
      // Adicionar QR code no centro inferior
      const qrSize = 50; // mm
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = pageHeight - qrSize - margin - 20;

      // Carregar imagem do QR code
      pdf.addImage(qrCodeImage, 'PNG', qrX, qrY, qrSize, qrSize);

      // Texto abaixo do QR code
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Escaneie este QR code no embarque', pageWidth / 2, qrY + qrSize + 5, { align: 'center' });
    } catch (error) {
      console.error('Erro ao adicionar QR code ao PDF:', error);
    }

    // Rodapé
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Este voucher deve ser apresentado no embarque', pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text(`ID: ${reservation.id}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Salvar PDF
    const fileName = `Voucher_${reservation.customerName.replace(/\s+/g, '_')}_${reservation.seatNumber}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Erro ao gerar voucher PDF:', error);
    throw error;
  }
};


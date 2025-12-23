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
    // Verificar se está no cliente
    if (typeof window === 'undefined') {
      throw new Error('Esta função só pode ser executada no navegador');
    }

    // Importar jsPDF dinamicamente
    const { default: jsPDF } = await import('jspdf');

    // Criar URL do voucher (será escaneada pelo admin)
    const baseUrl = window.location.origin;
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

    // Cabeçalho com gradiente (simulado)
    pdf.setFillColor(33, 150, 243); // viva-blue
    pdf.rect(0, 0, pageWidth, 55, 'F');
    
    // Linha decorativa
    pdf.setFillColor(21, 101, 192); // viva-blue-dark
    pdf.rect(0, 50, pageWidth, 5, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VIVA LA VIDA', pageWidth / 2, 25, { align: 'center' });
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Voucher de Embarque', pageWidth / 2, 35, { align: 'center' });

    // Informações do cliente (sem box)
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Dados do Passageiro', margin, 68);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Nome: ${reservation.customerName}`, margin, 76);
    pdf.text(`Telefone: ${reservation.phone}`, margin, 83);
    pdf.text(`Assento: #${reservation.seatNumber}`, margin, 90);

    // Informações do Passeio
    // Formatar data sem problemas de timezone (mesma lógica do checkin)
    const formatDateForPDF = (dateString: string) => {
      if (!dateString) return '';
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      if (!year || !month || !day) return dateString;
      // Criar a data ao meio-dia para evitar problemas de timezone
      const date = new Date(year, month - 1, day, 12, 0, 0);
      return date.toLocaleDateString('pt-BR');
    };
    const boatDate = formatDateForPDF(boat.date);
    
    // Informações do passeio (sem box)
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Informações do Passeio', margin, 105);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Barco: ${boat.name}`, margin, 115);
    pdf.text(`Data: ${boatDate}`, margin, 123);
    pdf.text(`Tipo: ${boat.boatType === 'escuna' ? 'Escuna' : 'Lancha'}`, margin, 131);
    
    // Tipo de serviço se disponível
    if (reservation.escunaType) {
      const serviceType = reservation.escunaType === 'com-desembarque' 
        ? 'Com Desembarque na Ilha' 
        : 'Sem Desembarque (Panorâmico)';
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 150, 243);
      pdf.text(`Serviço: ${serviceType}`, margin, 139);
      pdf.setTextColor(0, 0, 0);
    }

    // Valores (sem boxes, apenas texto organizado)
    const valuesY = 150;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Valores', margin, valuesY);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total: R$ ${reservation.totalAmount.toFixed(2)}`, margin, valuesY + 10);
    pdf.setTextColor(27, 94, 32);
    pdf.text(`Pago: R$ ${reservation.amountPaid.toFixed(2)}`, margin, valuesY + 18);
    
    if (reservation.amountDue > 0) {
      pdf.setTextColor(191, 54, 12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Pendente: R$ ${reservation.amountDue.toFixed(2)}`, margin, valuesY + 26);
    } else {
      pdf.setTextColor(27, 94, 32);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Pagamento Completo', margin, valuesY + 26);
    }
    pdf.setTextColor(0, 0, 0);

    // QR Code com box decorativo
    try {
      const qrSize = 55; // mm
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = pageHeight - qrSize - margin - 30;
      
      // Sem box ao redor do QR code

      // Carregar imagem do QR code
      pdf.addImage(qrCodeImage, 'PNG', qrX, qrY, qrSize, qrSize);

      // Texto abaixo do QR code
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 150, 243);
      pdf.text('Escaneie no embarque', pageWidth / 2, qrY + qrSize + 8, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('para processar pagamento', pageWidth / 2, qrY + qrSize + 13, { align: 'center' });
    } catch (error) {
      console.error('Erro ao adicionar QR code ao PDF:', error);
    }

    // Rodapé
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('Este voucher deve ser apresentado no embarque', pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text(`ID: ${reservation.id}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Gerar nome do arquivo
    const fileName = `voucher-${reservation.customerName.replace(/\s+/g, '-').toLowerCase()}-${reservation.seatNumber}.pdf`;
    
    // Método compatível com celular: criar blob e forçar download
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    // Criar link invisível e simular clique para download
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    
    // Forçar clique para iniciar download
    link.click();
    
    // Limpar após pequeno delay
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    }, 100);
    
  } catch (error) {
    console.error('Erro ao gerar voucher PDF:', error);
    throw error;
  }
};


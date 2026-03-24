import { Reservation, Boat } from '@/types';
import { receiptTranslations, receiptDateLocales, type ReceiptLanguage } from './receiptTranslations';

export type { ReceiptLanguage } from './receiptTranslations';

export interface GroupMember {
  name: string;
  document?: string;
  isChild?: boolean;
  amount: number;
}

export interface ReceiptData {
  reservation: Reservation;
  boat: Boat;
  vendorName: string;
  pagantes: number;
  cortesias: number;
  valorPorPessoa: number;
  valorReserva: number;
  valorRestante: number;
  formaPagamento: string;
  groupMembers?: GroupMember[];
  language?: ReceiptLanguage;
}

const t = (key: string, lang: ReceiptLanguage) =>
  receiptTranslations[lang]?.[key] || receiptTranslations['pt-BR']?.[key] || key;

export const generateReceiptPDF = async (data: ReceiptData) => {
  try {
    if (typeof window === 'undefined') {
      throw new Error('Esta função só pode ser executada no navegador');
    }

    const { default: jsPDF } = await import('jspdf');

    const { reservation, boat, vendorName, pagantes, cortesias, valorPorPessoa, valorReserva, valorRestante, formaPagamento, groupMembers, language = 'pt-BR' } = data;
    const tr = (key: string) => t(key, language);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    const vivaBlue = { r: 33, g: 150, b: 243 };
    const vivaBlueDark = { r: 21, g: 101, b: 192 };

    // ==========================================
    // CABEÇALHO - Mais compacto
    // ==========================================
    
    pdf.setFillColor(vivaBlue.r, vivaBlue.g, vivaBlue.b);
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    pdf.setFillColor(vivaBlueDark.r, vivaBlueDark.g, vivaBlueDark.b);
    pdf.rect(0, 32, pageWidth, 3, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VIVA LA VIDA', pageWidth / 2, 18, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(tr('title'), pageWidth / 2, 27, { align: 'center' });

    // ==========================================
    // DADOS DO PASSAGEIRO
    // ==========================================
    
    let currentY = 48;
    
    pdf.setTextColor(vivaBlue.r, vivaBlue.g, vivaBlue.b);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('responsiblePassenger'), margin, currentY);
    
    currentY += 6;
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(reservation.customerName, margin, currentY);
    
    currentY += 5;
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Tel: ${reservation.phone}`, margin, currentY);

    // Lista de membros do grupo (se houver)
    if (groupMembers && groupMembers.length > 1) {
      currentY += 8;
      pdf.setTextColor(vivaBlue.r, vivaBlue.g, vivaBlue.b);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(tr('groupMembers'), margin, currentY);
      
      currentY += 5;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      
      groupMembers.forEach((member, index) => {
        pdf.setTextColor(60, 60, 60);
        const memberInfo = `${index + 1}. ${member.name}${member.isChild ? ` ${tr('child')}` : ''}`;
        pdf.text(memberInfo, margin, currentY);
        
        // Valor ao lado direito
        pdf.setTextColor(100, 100, 100);
        const valorText = member.amount === 0 ? tr('free') : `R$ ${member.amount.toFixed(2).replace('.', ',')}`;
        pdf.text(valorText, pageWidth - margin - 25, currentY);
        
        currentY += 4;
      });
    }

    // Linha separadora
    currentY += 4;
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.3);
    pdf.line(margin, currentY, pageWidth - margin, currentY);

    // ==========================================
    // INFORMAÇÕES DO PASSEIO
    // ==========================================
    
    currentY += 8;
    
    pdf.setTextColor(vivaBlue.r, vivaBlue.g, vivaBlue.b);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('tourDetails'), margin, currentY);
    
    currentY += 7;
    
    const formatDateForReceipt = (dateString: string) => {
      if (!dateString) return '';
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      const dias = tr('dayNames').split(',');
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year} (${dias[date.getDay()]})`;
    };

    const rideDate = formatDateForReceipt(boat.date);
    
    // Layout em 2 colunas compacto
    const col1X = margin;
    const col2X = pageWidth / 2;
    const labelSize = 8;
    const valueSize = 10;
    const lineHeight = 12;
    
    // Linha 1: Destino + Data
    pdf.setFontSize(labelSize);
    pdf.setTextColor(120, 120, 120);
    pdf.text(tr('destination'), col1X, currentY);
    pdf.text(tr('tourDate'), col2X, currentY);
    
    currentY += 4;
    pdf.setFontSize(valueSize);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('destinationValue'), col1X, currentY);
    pdf.text(rideDate, col2X, currentY);
    
    currentY += lineHeight;
    
    // Linha 2: Check-in + Local
    pdf.setFontSize(labelSize);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text('Check-in', col1X, currentY);
    pdf.text(tr('boardingLocation'), col2X, currentY);
    
    currentY += 4;
    pdf.setFontSize(valueSize);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text('08:00h', col1X, currentY);
    pdf.text(tr('boardingValue'), col2X, currentY);
    
    currentY += lineHeight;
    
    // Linha 3: Pagantes + Cortesias
    pdf.setFontSize(labelSize);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text(tr('passengers'), col1X, currentY);
    if (cortesias > 0) {
      pdf.text(tr('freeTickets'), col2X, currentY);
    }
    
    currentY += 4;
    pdf.setFontSize(valueSize);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${pagantes} ${pagantes !== 1 ? tr('payingPlural') : tr('payingSingular')}`, col1X, currentY);
    if (cortesias > 0) {
      pdf.text(`${cortesias} ${cortesias !== 1 ? tr('freePlural') : tr('freeSingular')}`, col2X, currentY);
    }

    // Linha separadora
    currentY += 10;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, currentY, pageWidth - margin, currentY);

    // ==========================================
    // VALORES - Compacto
    // ==========================================
    
    currentY += 8;
    
    pdf.setTextColor(vivaBlue.r, vivaBlue.g, vivaBlue.b);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('values'), margin, currentY);
    
    currentY += 7;
    
    // Tabela de valores simples
    const valorCol1 = margin;
    const valorCol2 = margin + 55;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text(tr('pricePerPerson'), valorCol1, currentY);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`R$ ${valorPorPessoa.toFixed(2).replace('.', ',')}`, valorCol2, currentY);
    
    currentY += 5;
    pdf.setTextColor(80, 80, 80);
    pdf.text(tr('amountPaid'), valorCol1, currentY);
    pdf.setTextColor(34, 139, 34);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`R$ ${valorReserva.toFixed(2).replace('.', ',')}`, valorCol2, currentY);
    
    currentY += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text(tr('remainingAmount'), valorCol1, currentY);
    pdf.setTextColor(200, 80, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`R$ ${valorRestante.toFixed(2).replace('.', ',')}`, valorCol2, currentY);
    
    currentY += 7;
    
    const formasPagamentoLabel: Record<string, string> = {
      'pix': tr('pix'),
      'dinheiro': tr('cash'),
      'cartao': tr('card'),
    };
    const paymentLabel = formasPagamentoLabel[formaPagamento] ?? formaPagamento;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text(tr('paymentMethod'), valorCol1, currentY);
    pdf.setTextColor(0, 0, 0);
    pdf.text(paymentLabel, valorCol2, currentY);
    
    currentY += 5;
    pdf.setTextColor(80, 80, 80);
    pdf.text(tr('vendor'), valorCol1, currentY);
    pdf.setTextColor(0, 0, 0);
    pdf.text(vendorName, valorCol2, currentY);

    // Linha separadora
    currentY += 10;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, currentY, pageWidth - margin, currentY);

    // ==========================================
    // TERMOS - Condiciones (español)
    // ==========================================
    
    currentY += 8;
    
    pdf.setTextColor(vivaBlue.r, vivaBlue.g, vivaBlue.b);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('termsTitle'), margin, currentY);
    
    currentY += 7;
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('conditionsTitle'), margin, currentY);
    
    currentY += 4.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const condicionesSalida = tr('conditionsText');
    const condicionesSalidaLines = pdf.splitTextToSize(condicionesSalida, contentWidth);
    pdf.text(condicionesSalidaLines, margin, currentY);
    currentY += condicionesSalidaLines.length * 3.2;
    
    currentY += 4;
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('policyTitle'), margin, currentY);
    
    currentY += 4.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const politicaDevolucion = tr('policyText');
    const politicaDevolucionLines = pdf.splitTextToSize(politicaDevolucion, contentWidth);
    pdf.text(politicaDevolucionLines, margin, currentY);
    currentY += politicaDevolucionLines.length * 3.2;
    
    currentY += 4;
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('safetyTitle'), margin, currentY);
    
    currentY += 4.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const seguridad = tr('safetyText');
    const seguridadLines = pdf.splitTextToSize(seguridad, contentWidth);
    pdf.text(seguridadLines, margin, currentY);
    currentY += seguridadLines.length * 3.2;
    
    currentY += 4;
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('imageTitle'), margin, currentY);
    
    currentY += 4.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const usoImagen = tr('imageText');
    const usoImagenLines = pdf.splitTextToSize(usoImagen, contentWidth);
    pdf.text(usoImagenLines, margin, currentY);
    currentY += usoImagenLines.length * 3.2;

    // ==========================================
    // RODAPÉ - Fixo no final
    // ==========================================
    
    const footerY = pageHeight - 20;
    
    pdf.setDrawColor(vivaBlue.r, vivaBlue.g, vivaBlue.b);
    pdf.setLineWidth(0.3);
    pdf.line(margin, footerY, pageWidth - margin, footerY);
    
    pdf.setFontSize(8);
    pdf.setTextColor(vivaBlue.r, vivaBlue.g, vivaBlue.b);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tr('footerInfo'), pageWidth / 2, footerY + 5, { align: 'center' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(7);
    pdf.text(tr('footerDoc'), pageWidth / 2, footerY + 10, { align: 'center' });
    
    pdf.setFontSize(6);
    pdf.setTextColor(160, 160, 160);
    pdf.text(`ID: ${reservation.id.substring(0, 20)}...  •  ${new Date().toLocaleDateString(receiptDateLocales[language])}`, pageWidth / 2, footerY + 14, { align: 'center' });

    // Gerar e abrir PDF
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    const newWindow = window.open(blobUrl, '_blank');
    
    if (!newWindow) {
      const fileName = `recibo-${reservation.customerName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } else {
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 5000);
    }
    
  } catch (error) {
    console.error('Erro ao gerar recibo PDF:', error);
    throw error;
  }
};

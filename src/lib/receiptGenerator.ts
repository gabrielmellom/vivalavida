import { Reservation, Boat } from '@/types';

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
}

export const generateReceiptPDF = async (data: ReceiptData) => {
  try {
    if (typeof window === 'undefined') {
      throw new Error('Esta função só pode ser executada no navegador');
    }

    const { default: jsPDF } = await import('jspdf');

    const { reservation, boat, vendorName, pagantes, cortesias, valorPorPessoa, valorReserva, valorRestante, formaPagamento } = data;

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
    pdf.text('Comprovante de Reserva', pageWidth / 2, 27, { align: 'center' });

    // ==========================================
    // DADOS DO PASSAGEIRO
    // ==========================================
    
    let currentY = 48;
    
    pdf.setTextColor(vivaBlue.r, vivaBlue.g, vivaBlue.b);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PASSAGEIRO RESPONSÁVEL', margin, currentY);
    
    currentY += 6;
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text(reservation.customerName, margin, currentY);
    
    currentY += 5;
    pdf.setFontSize(10);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Tel: ${reservation.phone}`, margin, currentY);

    // Linha separadora
    currentY += 8;
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
    pdf.text('DETALHES DO PASSEIO', margin, currentY);
    
    currentY += 7;
    
    const formatDateForReceipt = (dateString: string) => {
      if (!dateString) return '';
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
      const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
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
    pdf.text('Destino', col1X, currentY);
    pdf.text('Data do Passeio', col2X, currentY);
    
    currentY += 4;
    pdf.setFontSize(valueSize);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Ilha do Campeche', col1X, currentY);
    pdf.text(rideDate, col2X, currentY);
    
    currentY += lineHeight;
    
    // Linha 2: Check-in + Local
    pdf.setFontSize(labelSize);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text('Check-in', col1X, currentY);
    pdf.text('Local de Embarque', col2X, currentY);
    
    currentY += 4;
    pdf.setFontSize(valueSize);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text('08:00h', col1X, currentY);
    pdf.text('Trapiche Barra da Lagoa', col2X, currentY);
    
    currentY += lineHeight;
    
    // Linha 3: Pagantes + Cortesias
    pdf.setFontSize(labelSize);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.text('Passageiros', col1X, currentY);
    if (cortesias > 0) {
      pdf.text('Cortesias', col2X, currentY);
    }
    
    currentY += 4;
    pdf.setFontSize(valueSize);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${pagantes} pagante${pagantes !== 1 ? 's' : ''}`, col1X, currentY);
    if (cortesias > 0) {
      pdf.text(`${cortesias} cortesia${cortesias !== 1 ? 's' : ''}`, col2X, currentY);
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
    pdf.text('VALORES', margin, currentY);
    
    currentY += 7;
    
    // Tabela de valores simples
    const valorCol1 = margin;
    const valorCol2 = margin + 55;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Valor por pessoa:', valorCol1, currentY);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`R$ ${valorPorPessoa.toFixed(2).replace('.', ',')}`, valorCol2, currentY);
    
    currentY += 5;
    pdf.setTextColor(80, 80, 80);
    pdf.text('Valor pago (reserva):', valorCol1, currentY);
    pdf.setTextColor(34, 139, 34);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`R$ ${valorReserva.toFixed(2).replace('.', ',')}`, valorCol2, currentY);
    
    currentY += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Valor restante:', valorCol1, currentY);
    pdf.setTextColor(200, 80, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`R$ ${valorRestante.toFixed(2).replace('.', ',')}`, valorCol2, currentY);
    
    currentY += 7;
    
    const formasPagamentoLabel: Record<string, string> = {
      'pix': 'PIX',
      'dinheiro': 'Dinheiro',
      'cartao': 'Cartão/Link',
    };
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    pdf.text('Forma de pagamento:', valorCol1, currentY);
    pdf.setTextColor(0, 0, 0);
    pdf.text(formasPagamentoLabel[formaPagamento] || formaPagamento, valorCol2, currentY);
    
    currentY += 5;
    pdf.setTextColor(80, 80, 80);
    pdf.text('Vendedora:', valorCol1, currentY);
    pdf.setTextColor(0, 0, 0);
    pdf.text(vendorName, valorCol2, currentY);

    // Linha separadora
    currentY += 10;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(margin, currentY, pageWidth - margin, currentY);

    // ==========================================
    // TERMOS - Regras completas
    // ==========================================
    
    currentY += 8;
    
    pdf.setTextColor(vivaBlue.r, vivaBlue.g, vivaBlue.b);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TERMOS E CONDIÇÕES', margin, currentY);
    
    // Regra 1 - Remarcações
    currentY += 7;
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('1. REGRAS PARA REMARCAÇÕES POR SOLICITAÇÃO DO CLIENTE', margin, currentY);
    
    currentY += 4.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const regra1a = `A remarcação do passeio por solicitação do cliente deverá ser realizada com no mínimo 48 (quarenta e oito) horas de antecedência da data agendada, estando sujeita à disponibilidade da empresa.`;
    const regra1aLines = pdf.splitTextToSize(regra1a, contentWidth);
    pdf.text(regra1aLines, margin, currentY);
    currentY += regra1aLines.length * 3.2;
    
    currentY += 1;
    const regra1b = `Solicitações fora desse prazo implicam perda do valor pago a título de sinal, em razão da reserva de vaga e logística previamente organizada.`;
    const regra1bLines = pdf.splitTextToSize(regra1b, contentWidth);
    pdf.text(regra1bLines, margin, currentY);
    currentY += regra1bLines.length * 3.2;
    
    currentY += 2;
    pdf.setFont('helvetica', 'bold');
    pdf.text('O passeio NÃO será cancelado em casos de:', margin, currentY);
    
    currentY += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(80, 80, 80);
    const bulletItems = ['• Tempo nublado', '• Frio', '• Chuva fraca', '• Chuva com previsão de cessar'];
    bulletItems.forEach((item) => {
      pdf.text(item, margin + 3, currentY);
      currentY += 3.5;
    });
    
    // Regra 2 - Doença
    currentY += 2;
    pdf.setTextColor(60, 60, 60);
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('2. DOENÇA E IMPOSSIBILIDADE JUSTIFICADA', margin, currentY);
    
    currentY += 4.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    const regra2 = `Em caso de impossibilidade de comparecimento por motivo de saúde, o passeio poderá ser remarcado uma única vez, mediante apresentação de atestado médico, respeitando a disponibilidade da empresa.`;
    const regra2Lines = pdf.splitTextToSize(regra2, contentWidth);
    pdf.text(regra2Lines, margin, currentY);
    currentY += regra2Lines.length * 3.2;
    
    // Regra 3 - Informações
    currentY += 2;
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('3. INFORMAÇÕES DO PASSEIO', margin, currentY);
    
    currentY += 4.5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('Um dia antes do passeio a empresa envia todas as informações detalhadas do passeio.', margin, currentY);

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
    pdf.text('Informações: (48) 98449-2552', pageWidth / 2, footerY + 5, { align: 'center' });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(120, 120, 120);
    pdf.setFontSize(7);
    pdf.text('Este documento é um comprovante de reserva.', pageWidth / 2, footerY + 10, { align: 'center' });
    
    pdf.setFontSize(6);
    pdf.setTextColor(160, 160, 160);
    pdf.text(`ID: ${reservation.id.substring(0, 20)}...  •  ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, footerY + 14, { align: 'center' });

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

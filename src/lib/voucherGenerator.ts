import { Reservation, Boat } from '@/types';
import { translations as ptBR } from './translations/pt-BR';
import { translations as en } from './translations/en';
import { translations as es } from './translations/es';
import { translations as de } from './translations/de';
import { translations as fr } from './translations/fr';

// Mapa de traduções
const translationsMap: Record<string, Record<string, string>> = {
  'pt-BR': ptBR,
  'en': en,
  'es': es,
  'de': de,
  'fr': fr,
};

// Função para obter tradução
const t = (key: string, lang: string = 'pt-BR'): string => {
  return translationsMap[lang]?.[key] || translationsMap['pt-BR']?.[key] || key;
};

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

export type SupportedLanguage = 'pt-BR' | 'en' | 'es' | 'de' | 'fr';

export const generateVoucherPDF = async (reservation: Reservation, boat: Boat, language: SupportedLanguage = 'pt-BR') => {
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
    pdf.text(t('voucher.title', language), pageWidth / 2, 35, { align: 'center' });

    // Informações do cliente (sem box)
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t('voucher.passenger', language), margin, 68);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${reservation.customerName}`, margin, 76);
    pdf.text(`${t('voucher.phone', language)}: ${reservation.phone}`, margin, 83);
    pdf.text(`#${reservation.seatNumber}`, margin, 90);

    // Informações do Passeio
    // Formatar data sem problemas de timezone (mesma lógica do checkin)
    const formatDateForPDF = (dateString: string) => {
      if (!dateString) return '';
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      if (!year || !month || !day) return dateString;
      // Criar a data ao meio-dia para evitar problemas de timezone
      const date = new Date(year, month - 1, day, 12, 0, 0);
      // Usar locale baseado no idioma
      const locale = language === 'pt-BR' ? 'pt-BR' : language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : 'en-US';
      return date.toLocaleDateString(locale);
    };
    const boatDate = formatDateForPDF(boat.date);
    
    // Informações do passeio (sem box)
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t('voucher.tour', language), margin, 105);

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${t('voucher.boat', language)}: ${boat.name}`, margin, 115);
    pdf.text(`${t('voucher.date', language)}: ${boatDate}`, margin, 123);
    const boatTypeText = boat.boatType === 'escuna' ? 'Escuna' : 'Lancha';
    pdf.text(`${boatTypeText}`, margin, 131);
    
    // Tipo de serviço se disponível
    if (reservation.escunaType) {
      const serviceTypeMap: Record<string, Record<string, string>> = {
        'pt-BR': { 'com-desembarque': 'Com Desembarque na Ilha', 'sem-desembarque': 'Sem Desembarque (Panorâmico)' },
        'en': { 'com-desembarque': 'With Island Landing', 'sem-desembarque': 'No Landing (Panoramic)' },
        'es': { 'com-desembarque': 'Con Desembarque en la Isla', 'sem-desembarque': 'Sin Desembarque (Panorámico)' },
        'de': { 'com-desembarque': 'Mit Insellandung', 'sem-desembarque': 'Ohne Landung (Panorama)' },
        'fr': { 'com-desembarque': 'Avec Débarquement sur l\'Île', 'sem-desembarque': 'Sans Débarquement (Panoramique)' },
      };
      const serviceType = serviceTypeMap[language]?.[reservation.escunaType] || serviceTypeMap['pt-BR'][reservation.escunaType];
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 150, 243);
      pdf.text(serviceType, margin, 139);
      pdf.setTextColor(0, 0, 0);
    }

    // Valores (sem boxes, apenas texto organizado)
    const valuesY = 150;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Total', margin, valuesY);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`R$ ${reservation.totalAmount.toFixed(2)}`, margin, valuesY + 10);
    pdf.setTextColor(27, 94, 32);
    pdf.text(`${t('voucher.paid', language)}: R$ ${reservation.amountPaid.toFixed(2)}`, margin, valuesY + 18);
    
    if (reservation.amountDue > 0) {
      pdf.setTextColor(191, 54, 12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${t('voucher.pending', language)}: R$ ${reservation.amountDue.toFixed(2)}`, margin, valuesY + 26);
    } else {
      pdf.setTextColor(27, 94, 32);
      pdf.setFont('helvetica', 'bold');
      const completeMap: Record<string, string> = {
        'pt-BR': 'Pagamento Completo',
        'en': 'Payment Complete',
        'es': 'Pago Completo',
        'de': 'Zahlung Abgeschlossen',
        'fr': 'Paiement Complet',
      };
      pdf.text(completeMap[language] || completeMap['pt-BR'], margin, valuesY + 26);
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
      const scanTextMap: Record<string, string> = {
        'pt-BR': 'Escaneie no embarque',
        'en': 'Scan at check-in',
        'es': 'Escanear en el embarque',
        'de': 'Beim Check-in scannen',
        'fr': 'Scanner à l\'embarquement',
      };
      pdf.text(scanTextMap[language] || scanTextMap['pt-BR'], pageWidth / 2, qrY + qrSize + 8, { align: 'center' });
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      const paymentTextMap: Record<string, string> = {
        'pt-BR': 'para processar pagamento',
        'en': 'to process payment',
        'es': 'para procesar el pago',
        'de': 'zur Zahlungsabwicklung',
        'fr': 'pour traiter le paiement',
      };
      pdf.text(paymentTextMap[language] || paymentTextMap['pt-BR'], pageWidth / 2, qrY + qrSize + 13, { align: 'center' });
    } catch (error) {
      console.error('Erro ao adicionar QR code ao PDF:', error);
    }

    // Rodapé
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    const footerTextMap: Record<string, string> = {
      'pt-BR': 'Este voucher deve ser apresentado no embarque',
      'en': 'This voucher must be presented at boarding',
      'es': 'Este voucher debe presentarse en el embarque',
      'de': 'Dieser Gutschein muss beim Einsteigen vorgezeigt werden',
      'fr': 'Ce bon doit être présenté à l\'embarquement',
    };
    pdf.text(footerTextMap[language] || footerTextMap['pt-BR'], pageWidth / 2, pageHeight - 10, { align: 'center' });
    pdf.text(`ID: ${reservation.id}`, pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Gerar blob do PDF
    const pdfBlob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    
    // Abrir em nova aba
    const newWindow = window.open(blobUrl, '_blank');
    
    // Se não conseguiu abrir (pop-up bloqueado), fazer download
    if (!newWindow) {
      const fileName = `voucher-${reservation.customerName.replace(/\s+/g, '-').toLowerCase()}-${reservation.seatNumber}.pdf`;
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
      // Limpar URL após um tempo quando abrir em nova aba
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 5000);
    }
    
  } catch (error) {
    console.error('Erro ao gerar voucher PDF:', error);
    throw error;
  }
};


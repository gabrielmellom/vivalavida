export interface Boat {
  id: string;
  name: string;
  date: string; // ISO date string
  seatsTotal: number;
  seatsTaken: number;
  status: 'active' | 'inactive' | 'completed';
  boatType: 'escuna' | 'lancha';
  escunaType?: 'sem-desembarque' | 'com-desembarque'; // apenas para escuna (legacy)
  // Vagas por tipo de serviço (para escunas)
  seatsWithLanding?: number; // Vagas com desembarque na ilha
  seatsWithLandingTaken?: number; // Vagas com desembarque ocupadas
  seatsWithoutLanding?: number; // Vagas sem desembarque (panorâmico)
  seatsWithoutLandingTaken?: number; // Vagas sem desembarque ocupadas
  ticketPrice: number; // Preço do ingresso por pessoa (adulto)
  createdBy: string; // admin uid
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  boatId: string;
  seatNumber: number;
  status: 'pending' | 'approved' | 'cancelled' | 'pre_reserved' | 'no_show';
  customerName: string;
  phone: string;
  whatsapp?: string;
  address: string;
  document?: string; // CPF/RG
  birthDate?: string; // ISO date string
  email?: string;
  groupId?: string; // Para reservas em grupo (mesma família)
  isGroupLeader?: boolean; // Se é o responsável/líder do grupo
  paymentMethod: 'pix' | 'cartao' | 'dinheiro';
  amountPaid: number;
  amountDue: number;
  totalAmount: number;
  discountAmount?: number; // valor de desconto aplicado
  discountReason?: string; // motivo do desconto
  vendorId: string; // vendedor uid
  rideDate: string; // ISO date string
  escunaType?: 'sem-desembarque' | 'com-desembarque'; // apenas para escunas
  bankId?: string; // banco de recebimento
  bankName?: string; // nome do banco
  isChild?: boolean; // se é criança (menor de 7 anos)
  isHalfPrice?: boolean; // se paga meia entrada
  createdAt: Date;
  updatedAt: Date;
  checkedIn?: boolean; // para check-in no dia do passeio
  voucherSent?: boolean; // se o voucher foi enviado para o cliente
  confirmationSent?: boolean; // se a confirmação de reserva foi enviada
  confirmationSentAt?: Date; // quando a confirmação foi enviada
  noShowReason?: string; // motivo de não comparecimento
  cancelledAt?: Date; // quando foi cancelado
  cancelledReason?: string; // motivo do cancelamento
  // Campos de aceite de termos
  acceptedTerms?: boolean; // aceitou os termos de uso do barco
  acceptedTermsAt?: Date; // data/hora do aceite dos termos
  acceptedImageRights?: boolean; // aceitou o uso de imagem
  acceptedImageRightsAt?: Date; // data/hora do aceite de imagem
  acceptedFromIP?: string; // IP do dispositivo que aceitou
  acceptedUserAgent?: string; // browser/dispositivo usado
  termsLinkSent?: boolean; // se o link de termos foi enviado
  termsLinkSentAt?: Date; // quando o link foi enviado
  receiptSent?: boolean; // se o recibo foi enviado
  receiptSentAt?: Date; // quando o recibo foi enviado
}

export interface UserRole {
  uid: string;
  email: string;
  role: 'admin' | 'vendor' | 'post_sale';
  name?: string;
  createdAt: Date;
}

export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro';

export interface Payment {
  id: string;
  reservationId: string;
  amount: number;
  method: PaymentMethod;
  bankId?: string; // banco onde foi recebido o pagamento
  bankName?: string; // nome do banco (para facilitar exibição)
  source: 'entrada' | 'checkin' | 'vendedor' | 'admin'; // origem do pagamento
  vendorId?: string; // se foi pago pelo vendedor
  groupPayment?: boolean; // se é parte de um pagamento de grupo
  createdAt: Date;
  createdBy: string; // uid de quem registrou
}

// Interface para múltiplas formas de pagamento
export interface PaymentEntry {
  id: string;
  amount: number;
  method: PaymentMethod;
  bankId?: string;
  bankName?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  dueDate: string; // ISO date string
  paid: boolean;
  paidDate?: string; // ISO date string
  category: string; // ex: 'combustivel', 'manutencao', 'salario', etc
  boatId?: string; // referência opcional ao barco
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // admin uid
}

// Configurações do Site
export interface TourPricing {
  id: string;
  label: string; // ex: "Até 25/12", "Alta Temporada"
  startDate?: string; // ISO date string - opcional para período atual
  endDate?: string; // ISO date string
  adultPrice: number;
  childPrice: number; // crianças de 5-7 anos
  freeAgeLimit: number; // idade limite para gratuidade (ex: 4 anos)
  halfPriceAgeLimit: number; // idade limite para meia (ex: 7 anos)
  isActive: boolean;
  isCurrent: boolean; // se é o preço atual em vigor
}

export interface TourFeature {
  icon: string; // emoji
  label: string;
}

export interface TourConfig {
  id: string;
  name: string; // ex: "Tour Panorâmico"
  slug: string; // ex: "tour-panoramico"
  subtitle: string; // ex: "VIVA LA VIDA"
  description: string;
  duration: string; // ex: "5 horas"
  durationDetail: string; // ex: "3h na água"
  type: 'panoramico' | 'desembarque' | 'lancha' | 'outro'; // tipo do passeio
  emoji: string; // ex: "🚤"
  features: TourFeature[]; // itens inclusos
  checkInTime: string; // ex: "8:00h"
  departureTime: string; // ex: "9:15h"
  pricing: TourPricing[];
  isHighlighted: boolean; // se é o passeio em destaque
  highlightLabel?: string; // ex: "⭐ MAIS VENDIDO"
  order: number; // ordem de exibição
  isActive: boolean;
  images: string[]; // URLs das imagens
  whatsappMessage: string; // mensagem personalizada para WhatsApp
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccount {
  id: string;
  name: string; // Nome do banco ou descrição
  isActive: boolean;
}

export interface SiteConfig {
  id: string;
  whatsappNumber: string; // número do WhatsApp principal
  instagramUrl: string;
  facebookUrl: string;
  email: string;
  phone: string;
  address: string;
  googleReviews: number; // número de avaliações
  googleRating: number; // nota média
  heroTitle: string;
  heroSubtitle: string;
  banks?: BankAccount[]; // Lista de bancos configurados
  updatedAt: Date;
}


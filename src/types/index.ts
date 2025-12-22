export interface Boat {
  id: string;
  name: string;
  date: string; // ISO date string
  seatsTotal: number;
  seatsTaken: number;
  status: 'active' | 'inactive' | 'completed';
  boatType: 'escuna' | 'lancha';
  escunaType?: 'sem-desembarque' | 'com-desembarque'; // apenas para escuna
  ticketPrice: number; // Preço do ingresso por pessoa (adulto)
  createdBy: string; // admin uid
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  boatId: string;
  seatNumber: number;
  status: 'pending' | 'approved' | 'cancelled' | 'pre_reserved';
  customerName: string;
  phone: string;
  whatsapp?: string;
  address: string;
  document?: string; // CPF/RG
  birthDate?: string; // ISO date string
  email?: string;
  groupId?: string; // Para reservas em grupo (mesma família)
  paymentMethod: 'pix' | 'cartao' | 'dinheiro';
  amountPaid: number;
  amountDue: number;
  totalAmount: number;
  vendorId: string; // vendedor uid
  rideDate: string; // ISO date string
  escunaType?: 'sem-desembarque' | 'com-desembarque'; // apenas para escunas
  createdAt: Date;
  updatedAt: Date;
  checkedIn?: boolean; // para check-in no dia do passeio
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
  source: 'entrada' | 'checkin' | 'vendedor' | 'admin'; // origem do pagamento
  vendorId?: string; // se foi pago pelo vendedor
  createdAt: Date;
  createdBy: string; // uid de quem registrou
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
  type: 'panoramico' | 'desembarque'; // tipo do passeio
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
  updatedAt: Date;
}


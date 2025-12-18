export interface Boat {
  id: string;
  name: string;
  date: string; // ISO date string
  seatsTotal: number;
  seatsTaken: number;
  status: 'active' | 'inactive' | 'completed';
  boatType: 'escuna' | 'lancha';
  escunaType?: 'sem-desembarque' | 'com-desembarque'; // apenas para escuna
  createdBy: string; // admin uid
  createdAt: Date;
  updatedAt: Date;
}

export interface Reservation {
  id: string;
  boatId: string;
  seatNumber: number;
  status: 'pending' | 'approved' | 'cancelled';
  customerName: string;
  phone: string;
  whatsapp?: string;
  address: string;
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
  role: 'admin' | 'vendor';
  name?: string;
  createdAt: Date;
}

export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro';


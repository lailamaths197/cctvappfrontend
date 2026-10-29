export type Role = 'customer' | 'technician' | 'admin';

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone_number: string;
  role: Role;
  profile_image: string | null;
}

/** Admin's view of any account (GET /auth/admin/users/). */
export interface AdminUser extends User {
  is_active: boolean;
  date_joined: string;
  /** customer: bookings made; technician: jobs assigned */
  job_count: number;
}

/** POST /auth/technicians/ - the temporary password is shown once, only if it was generated. */
export interface CreatedTechnician extends User {
  temporary_password: string | null;
}

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type ServiceType = 'installation' | 'service_complaint';

export interface Service {
  id: number;
  name: string;
  description: string;
  base_price: string;
  service_type: ServiceType;
  icon: string;
  /** only present on the admin catalog endpoint */
  is_active?: boolean;
}

export interface Address {
  id: number;
  house_no: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  full_address: string;
}

export interface Person {
  id: number;
  full_name: string;
  phone_number: string;
}

export interface CheckoutPayload {
  key_id: string;
  order_id: string;
  amount: number; // paise
  currency: string;
  booking_id: number;
  extra_service_charge?: string;
}

export type ImageKind = 'complaint' | 'before' | 'after' | 'installation';

export interface BookingImage {
  id: number;
  kind: ImageKind;
  image: string; // absolute URL
  created_at: string;
}

export interface Booking {
  id: number;
  service: Service;
  customer: Person;
  technician: Person | null;
  address: Address;
  date: string; // YYYY-MM-DD
  time_slot: string;
  time_slot_label: string;
  issue_description: string;
  images: BookingImage[];
  status: BookingStatus;
  status_label: string;
  amount: string;
  is_paid: boolean;
  created_at: string;
  // ==========================================================
  // 👇 INJECT THESE 5 DYNAMIC APP FIELDS FOR ON-SITE WORK 👇
  // ==========================================================
  extra_service_title?: string | null;
  extra_service_description?: string | null;
  extra_service_charge?: string;
  technician_incentive?: string;
  total_payable_amount?: string;
  // ==========================================================
  review?: {
    id: number;
    rating: number;
    comment: string;
  } | null;
}

/** Response of POST /bookings/ = booking + Razorpay checkout info (or an error). */
export interface CreatedBooking extends Booking {
  payment: CheckoutPayload | null;
  payment_error?: string;
}

export interface Payment {
  id: number;
  receipt_no: string;
  booking_id: number;
  service_name: string;
  customer_name: string;
  booking_date: string;
  time_slot_label: string;
  address: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount: string;
  currency: string;
  status: 'created' | 'paid' | 'failed';
  created_at: string;
  paid_at: string | null;
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  booking: number | null;
  is_read: boolean;
  created_at: string;
}

export interface AdminStats {
  total_bookings: number;
  bookings_by_status: Record<BookingStatus, number>;
  unassigned_pending: number;
  total_revenue: string | number;
  paid_payments: number;
  unpaid_bookings: number;
  technicians: number;
  customers: number;
  // 👇 INJECT THIS MISSING PROPERTY FIELD TO UNLOCK THE ADMIN GRID COUNTER 👇
  total_technician_incentives?: string | number;
}


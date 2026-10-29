import { appendImages, PickedImage } from '../utils/upload';
import { api } from './client';
import type {
  AdminStats,
  AdminUser,
  AppNotification,
  Booking,
  BookingStatus,
  CheckoutPayload,
  CreatedBooking,
  CreatedTechnician,
  Payment,
  Person,
  Role,
  Service,
  ServiceType,
  User,
} from '../types';

export interface RegisterPayload {
  full_name: string;
  email: string;
  phone_number: string;
  password: string;
  confirm_password: string;
}

export interface TechnicianPayload {
  full_name: string;
  email: string;
  phone_number: string;
  /** leave undefined to let the server generate a temporary password */
  password?: string;
}

export interface ServicePayload {
  name: string;
  description: string;
  base_price: string;
  service_type: ServiceType;
  icon: string;
  is_active?: boolean;
}
// 👇 ADD THIS INTERFACE HERE SO THE ENDPOINT KNOWS WHAT IT RETURNS 👇
export interface BackendAvailableSlot {
  id: string;                    // 🟢 ADD THIS LINE
  time_slot_label?: string; 
  value: string;
  label: string;
  available_technicians: number;
}

export const AuthApi = {
  register: (payload: RegisterPayload) => api.post<User>('/auth/register/', payload).then((r) => r.data),
  login: (email: string, password: string) =>
    api
      .post<{ access: string; refresh: string; user: User }>('/auth/login/', { email, password })
      .then((r) => r.data),
  me: () => api.get<User>('/auth/me/').then((r) => r.data),
};

export const BookingApi = {
  /** Active services only (what customers may book). */
  services: () => api.get<Service[]>('/services/').then((r) => r.data),
  list: () => api.get<Booking[]>('/bookings/').then((r) => r.data),
  /** `form` is multipart/form-data: text fields + repeated `images` files. */
  getAvailableSlots: (serviceId: number | string, dateStr: string) => 
    api.get<{ slots: BackendAvailableSlot[] }>('/bookings/slots/', {
      params: { service: serviceId, date: dateStr }
    }).then((r) => r.data),
  initiateSecureCall: (bookingId: number | string) =>
    api
      .post<{ proxy_number: string }>(`/bookings/${bookingId}/secure-call/`)
      .then((r) => r.data),
  submitReview: (bookingId: number | string, rating: number, comment: string) =>
    api
      .post(`/bookings/${bookingId}/submit-review/`, { rating, comment })
      .then((r) => r.data),
  create: (form: FormData) =>
    api
      .post<CreatedBooking>('/bookings/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data),
      
  /** 
   * Technician: change status and upload the evidence photos for that step.
   * Hybrid signatures: supports standard multi-arguments or direct raw FormData pipelines.
   */
  updateStatus: async (
    id: number,
    statusOrForm: Extract<BookingStatus, 'in_progress' | 'completed'> | FormData,
    images?: PickedImage[]
  ) => {
    let form: FormData;

    if (statusOrForm instanceof FormData) {
      form = statusOrForm;
    } else {
      form = new FormData();
      form.append('status', statusOrForm);
      if (images) {
        await appendImages(form, 'images', images);
      }
    }

    return api
      .patch<Booking>(`/bookings/${id}/status/`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
  
  assign: (id: number, technicianId: number) =>
    api.post<Booking>(`/bookings/${id}/assign/`, { technician_id: technicianId }).then((r) => r.data),
  createOrder: (id: number) => api.post<CheckoutPayload>(`/bookings/${id}/pay/`).then((r) => r.data),

  /** Technician: appends an out-of-scope/extra service to an active job from the field. */
  addExtraService: (id: number, form: FormData) =>
    api
      .post<{ message: string; updated_total_payable: number; allocated_incentive: number }>(
        `/bookings/${id}/add-extra/`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      .then((r) => r.data),
};

export const PaymentApi = {
  history: () => api.get<Payment[]>('/payments/').then((r) => r.data),
  verify: (body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    api.post<Payment>('/payments/verify/', body).then((r) => r.data),
};

export const NotificationApi = {
  list: () => api.get<{ unread: number; results: AppNotification[] }>('/notifications/').then((r) => r.data),
  markAllRead: () => api.post('/notifications/read/').then((r) => r.data),
};

export const AdminApi = {
  stats: () => api.get<AdminStats>('/admin/stats/').then((r) => r.data),

  technicians: () => api.get<Person[]>('/auth/technicians/').then((r) => r.data),
  createTechnician: (payload: TechnicianPayload) =>
    api.post<CreatedTechnician>('/auth/technicians/', payload).then((r) => r.data),

  users: (role?: Role) => api.get<AdminUser[]>('/auth/admin/users/', { params: role ? { role } : {} }).then((r) => r.data),
  setUserActive: (id: number, isActive: boolean) =>
    api.patch(`/auth/admin/users/${id}/`, { is_active: isActive }).then((r) => r.data),

  /** Every service, including inactive ones. */
  services: () => api.get<Service[]>('/admin/services/').then((r) => r.data),
  createService: (payload: ServicePayload) => api.post<Service>('/admin/services/', payload).then((r) => r.data),
  updateService: (id: number, payload: Partial<ServicePayload>) =>
    api.patch<Service>(`/admin/services/${id}/`, payload).then((r) => r.data),
};

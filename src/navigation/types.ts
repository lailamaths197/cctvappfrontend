export type RootStackParamList = {
  // signed-out
  Login: undefined;
  Register: undefined;
  // customer
  CustomerHome: undefined;
  Booking: { serviceId?: number } | undefined;
  // technician
  TechnicianHome: undefined;
  // admin
  AdminHome: undefined;
};

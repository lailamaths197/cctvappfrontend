import { useCallback, useState } from 'react';

import { errorMessage } from '../api/client';
import { BookingApi, PaymentApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { openRazorpay } from '../payments/razorpay';
import type { Booking } from '../types';
import { Alert } from '../utils/dialog';

/**
 * Full payment flow for one booking:
 *   1. Get a fresh Razorpay order from the server containing the accurate runtime balance.
 *   2. Open the simulated Razorpay Checkout module.
 *   3. Send the mock transaction keys back to the server to securely unlock the technician's complete actions.
 */
export function usePayBooking(onDone: () => void) {
  const { user } = useAuth();
  const [payingId, setPayingId] = useState<number | null>(null);

  const pay = useCallback(
    async (bookingId: number, existing?: Booking | null) => {
      if (!user) return;
      setPayingId(bookingId);
      try {
        // Always request a fresh order from Django.
        // This ensures the backend creates a valid tracking row entry with a real order ID,
        // whether there is an extra out-of-scope charge or just a regular base fee.
        const checkout = await BookingApi.createOrder(bookingId);

        // 2. Open the simulation loop wrapper
        const result = await openRazorpay(checkout, user);
        
        // 3. 🔴 FIXED: Explicitly map the properties to satisfy the strict schema mapping required by PaymentApi
        await PaymentApi.verify({
          razorpay_order_id: result.razorpay_order_id,
          razorpay_payment_id: result.razorpay_payment_id,
          razorpay_signature: result.razorpay_signature
        });
        
        Alert.alert('Payment successful', `Booking #${bookingId} is paid. Thank you!`);
        onDone();
      } catch (err: any) {
        const msg = err?.description ?? (err?.response ? errorMessage(err) : err?.message) ?? 'Payment failed.';
        Alert.alert('Payment not completed', String(msg));
      } finally {
        setPayingId(null);
      }
    },
    [user, onDone],
  );

  return { pay, payingId };
}

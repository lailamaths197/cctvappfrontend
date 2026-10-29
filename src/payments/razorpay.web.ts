// Browser version of the Razorpay helper (Metro picks this file on web instead of razorpay.ts).
// It uses Razorpay's hosted Checkout.js, so NO native build is needed for browser testing.
import type { CheckoutPayload, User } from '../types';

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

function loadCheckoutScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    const script = (existing as HTMLScriptElement | null) ?? document.createElement('script');
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Could not load Razorpay Checkout. Check your internet connection.')));
    if (!existing) {
      script.src = SCRIPT_URL;
      script.async = true;
      document.body.appendChild(script);
    }
  });
}

export async function openRazorpay(checkout: CheckoutPayload, user: User): Promise<RazorpaySuccess> {
  await loadCheckoutScript();

  return new Promise<RazorpaySuccess>((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: checkout.key_id,
      order_id: checkout.order_id,
      amount: checkout.amount, // paise, as returned by the server
      currency: checkout.currency,
      name: 'SecureView CCTV',
      description: `Booking #${checkout.booking_id}`,
      prefill: { name: user.full_name, email: user.email, contact: user.phone_number },
      theme: { color: '#1e40af' },
      handler: (response: RazorpaySuccess) => resolve(response),
      modal: { ondismiss: () => reject({ description: 'Payment cancelled.' }) },
    });
    rzp.on('payment.failed', (r: any) => reject({ description: r?.error?.description ?? 'Payment failed.' }));
    rzp.open();
  });
}

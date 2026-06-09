const endpoint = '/api/notify-reservation';

async function postWhatsAppRequest(payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    const error = new Error(data.error || `فشل إرسال واتساب (${response.status})`);
    error.details = data.details || null;
    throw error;
  }

  return data;
}

export async function notifyNewOrder({ reservation, dress }) {
  return postWhatsAppRequest({
    action: 'new',
    reservation,
    dress: dress ? { id: dress.id, name: dress.name, price: dress.price, size: dress.size } : null,
    origin: window.location?.origin || null,
  });
}

export async function notifyOrderConfirmed({ reservation, dress }) {
  return postWhatsAppRequest({
    action: 'confirm',
    reservation,
    dress: dress ? { id: dress.id, name: dress.name, price: dress.price, size: dress.size } : null,
    origin: window.location?.origin || null,
  });
}

export const notifyAdminReservation = notifyNewOrder;

export async function testWhatsAppConnection() {
  return notifyNewOrder({
    reservation: {
      id: 'test-000',
      dressId: 'TEST',
      dressName: 'اختبار النظام',
      clientName: 'اختبار MaryMatelier',
      clientPhone: '01000000000',
      trialDate: new Date().toISOString().slice(0, 10),
      rentDate: new Date().toISOString().slice(0, 10),
      time: '12:00',
      notes: 'رسالة تجريبية من لوحة التحكم',
      status: 'pending',
    },
    dress: { id: 'TEST', name: 'اختبار', price: 0, size: 'M' },
  });
}

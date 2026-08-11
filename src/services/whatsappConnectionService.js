import { apiPath } from './dbService.js';

async function handleResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error || `HTTP ${response.status}`;
    const error = new Error(message);
    error.details = data?.details || null;
    throw error;
  }
  return data;
}

export async function fetchWhatsAppConnection() {
  const response = await fetch(apiPath('/api/whatsapp/connection'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  return handleResponse(response);
}

export async function completeEmbeddedSignup({ code, waba_id, phone_number_id }) {
  const response = await fetch(apiPath('/api/whatsapp/embedded-signup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, waba_id, phone_number_id }),
  });
  return handleResponse(response);
}

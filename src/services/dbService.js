const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const handleResponse = async (response) => {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const base = data?.error || `Request failed with status ${response.status}`;
    const details = data?.details ? (typeof data.details === 'string' ? data.details : JSON.stringify(data.details)) : null;
    const message = details ? `${base} — details: ${details}` : base;
    const error = new Error(message);
    error.details = data?.details || null;
    throw error;
  }
  return data;
};

export const fetchDresses = async () => {
  const response = await fetch(`${API_BASE_URL}/api/dresses`);
  return handleResponse(response);
};

export const createDress = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/dresses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const updateDress = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/dresses?id=${encodeURIComponent(payload.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const fetchDesigners = async () => {
  const response = await fetch(`${API_BASE_URL}/api/designers`);
  return handleResponse(response);
};

export const createDesigner = async (name) => {
  const response = await fetch(`${API_BASE_URL}/api/designers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(response);
};

export const updateDressPositions = async (items) => {
  const response = await fetch(`${API_BASE_URL}/api/dresses-positions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  return handleResponse(response);
};

export const deleteDress = async (id) => {
  const response = await fetch(`${API_BASE_URL}/api/dresses?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const fetchReservations = async () => {
  const response = await fetch(`${API_BASE_URL}/api/reservations`);
  return handleResponse(response);
};

export const createReservation = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const updateReservation = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/reservations?id=${encodeURIComponent(payload.id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const deleteReservation = async (id) => {
  const response = await fetch(`${API_BASE_URL}/api/reservations?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const fetchFAQs = async () => {
  const response = await fetch(`${API_BASE_URL}/api/faqs`);
  return handleResponse(response);
};

export const createFAQ = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/faqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const updateFAQ = async (id, payload) => {
  const response = await fetch(`${API_BASE_URL}/api/faqs?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
};

export const deleteFAQ = async (id) => {
  const response = await fetch(`${API_BASE_URL}/api/faqs?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return handleResponse(response);
};

export const getSetting = async (key) => {
  const response = await fetch(`${API_BASE_URL}/api/settings?key=${encodeURIComponent(key)}`);
  return handleResponse(response);
};

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(response);
};

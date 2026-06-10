const WHATSAPP_API_BASE = process.env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v17.0';
const WHATSAPP_SEND_MESSAGE_ENDPOINT = '/messages';

/**
 * Validates environment variables required for WhatsApp API
 * @returns {Object} { isValid, missing: [], credentials }
 */
export function validateWhatsAppEnv() {
  const required = ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
  const missing = required.filter(key => !process.env[key]);
  
  const isValid = missing.length === 0;
  const credentials = {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    adminNumber: process.env.WHATSAPP_ADMIN_NUMBER || '',
    salesNumber: process.env.WHATSAPP_SALES_NUMBER || '',
  };

  return { isValid, missing, credentials };
}

/**
 * Formats a phone number to international format (remove +, spaces, hyphens)
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Validates Egyptian phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export function isValidEgyptianPhone(phone) {
  let formatted = formatPhoneNumber(phone);
  // Allow numbers with country code (20) or local 10-digit numbers
  if (formatted.startsWith('20') && formatted.length === 12) {
    formatted = formatted.slice(2);
  }
  // Egyptian: 10 digits, starts with 10, 11, 12, or 15
  return /^(10|11|12|15)\d{8}$/.test(formatted);
}

export function buildWhatsAppMessage({ reservation, dress, action }, origin = '') {
  const isConfirmed = action === 'confirm';
  const title = isConfirmed ? '✅ حجز مؤكد' : '🔔 حجز جديد';

  // Map placeholders as requested
  const placeholder1 = title;
  const dressName = reservation.dressName || dress?.name || '—';
  const dressId = reservation.dressId || dress?.id || '—';
  const placeholder2 = `${dressName} — كود ${dressId}${dress?.price ? ` — ${dress.price} ج.م` : ''}`;
  const clientName = reservation.clientName || '—';
  const clientPhone = reservation.clientPhone || '—';
  const clientWeight = reservation.weight !== undefined && reservation.weight !== null ? String(reservation.weight) : '—';
  const clientHeight = reservation.height !== undefined && reservation.height !== null ? String(reservation.height) : '—';
  const weightHeightSuffix = (clientWeight !== '—' || clientHeight !== '—') ? ` — وزن: ${clientWeight} كجم / طول: ${clientHeight} سم` : '';
  const placeholder4 = `${clientName} — ${clientPhone}${weightHeightSuffix}`;
  const trialDate = reservation.trialDate || '—';
  const time = reservation.time || '';
  const rentDate = reservation.rentDate || '—';
  const placeholder5 = `تاريخ التجربة ${trialDate} الساعة ${time ? ` ${time}` : ''} /تاريخ الايجار ${rentDate}`;
  const placeholder6 = reservation.notes || '—';
  const placeholder7 = reservation.id || '—';

  const lines = [
    '*MaryMatelier*',
    `${placeholder1}`,
    '',
    `[👗] *بيانات الفستان:* ${placeholder2}`,
    `[👤] *بيانات العميل:* ${placeholder4}`,
    `[📅] *مواعيد القياس والإيجار:* ${placeholder5}`,
    `[📝] *ملاحظات:* ${placeholder6}`,
    `[🆔] *رقم الطلب:* ${placeholder7}`,
  ];

  return lines.join('\n');
}

/**
 * Constructs WhatsApp message template based on notification type
 * @param {Object} options - { action, reservation, dress }
 * @returns {Object} Message body for WhatsApp API
 */
export function formatWhatsAppMessage({ action, reservation, dress }) {
  const {
    clientName = 'العميل',
    clientPhone = '',
    dressName = 'الفستان',
    trialDate = '',
    rentDate = '',
    time = '',
    notes = '',
  } = reservation || {};

  const dressPriceStr = dress?.price ? `${dress.price} ج.م` : '';
  const dressSizeStr = dress?.size ? ` (${dress.size})` : '';

  let messageText = '';

  if (action === 'new') {
    messageText = `🎉 *حجز جديد من Marym Atelier*

👤 العميل: ${clientName}
📱 الهاتف: ${clientPhone}
👗 الفستان: ${dressName}${dressSizeStr}
💰 السعر: ${dressPriceStr}
📅 موعد التجربة: ${trialDate}
📅 موعد الاستئجار: ${rentDate}
🕐 الوقت: ${time}
📝 ملاحظات: ${notes || 'بدون'}

تاريخ الحجز: ${new Date().toLocaleString('ar-EG')}`;
  } else if (action === 'confirm') {
    messageText = `✅ *تم تأكيد حجزك في Marym Atelier*

👤 العميل: ${clientName}
👗 الفستان: ${dressName}${dressSizeStr}
📅 موعد الاستئجار: ${rentDate}
🕐 الوقت: ${time}

شكراً لاختيارك Marym Atelier!`;
  } else {
    messageText = `📢 *إشعار من Marym Atelier*\n\n${clientName}\n\nشكراً لك!`;
  }

  return {
    messaging_product: 'whatsapp',
    to: formatPhoneNumber(clientPhone),
    type: 'text',
    text: {
      body: messageText,
    },
  };
}

/**
 * Sends a message via WhatsApp Cloud API
 * @param {Object} options - { action, reservation, dress }
 * @returns {Promise<Object>} API response
 */
export async function sendWhatsAppMessage(options) {
  const validation = validateWhatsAppEnv();

  if (!validation.isValid) {
    const error = new Error(`Missing WhatsApp environment variables: ${validation.missing.join(', ')}`);
    error.code = 'MISSING_ENV';
    error.statusCode = 500;
    throw error;
  }

  const { accessToken, phoneNumberId } = validation.credentials;
  const { reservation } = options;

  if (!reservation?.clientPhone) {
    const error = new Error('Client phone number is required');
    error.code = 'INVALID_PHONE';
    error.statusCode = 400;
    throw error;
  }

  // Validate phone number format
  if (!isValidEgyptianPhone(reservation.clientPhone)) {
    const error = new Error(`Invalid Egyptian phone number: ${reservation.clientPhone}`);
    error.code = 'INVALID_PHONE_FORMAT';
    error.statusCode = 400;
    throw error;
  }

  const messageBody = formatWhatsAppMessage(options);
  const url = `${WHATSAPP_API_BASE}/${phoneNumberId}${WHATSAPP_SEND_MESSAGE_ENDPOINT}`;

  try {
    console.log(`📤 Sending WhatsApp message to ${messageBody.to}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg = data?.error?.message || `WhatsApp API error: ${response.status}`;
      const errCode = data?.error?.code || 'API_ERROR';
      const error = new Error(errMsg);
      error.code = errCode;
      error.statusCode = response.status;
      error.apiDetails = data?.error || data;
      console.error('❌ WhatsApp API error:', errMsg, data?.error || data);
      throw error;
    }

    console.log('✅ WhatsApp message sent successfully:', data.messages?.[0]?.id);
    return {
      success: true,
      messageId: data.messages?.[0]?.id,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error.code) {
      throw error;
    }
    const wrappedError = new Error(`WhatsApp API request failed: ${error.message}`);
    wrappedError.code = 'REQUEST_ERROR';
    wrappedError.statusCode = 500;
    wrappedError.originalError = error;
    console.error('❌ WhatsApp request error:', error);
    throw wrappedError;
  }
}

/**
 * Sends notification to admin/sales number(s)
 * Supports comma-separated phone numbers for multiple recipients
 * @param {Object} options - { action, reservation, dress, recipientType }
 * @returns {Promise<Object>} API response
 */
export async function notifyAdminOrSales(options) {
  const { recipientType = 'admin' } = options;
  const validation = validateWhatsAppEnv();

  let targetNumbers = [];
  if (recipientType === 'sales') {
    targetNumbers = (validation.credentials.salesNumber || '')
      .split(',')
      .map(n => n.trim())
      .filter(n => n);
  } else {
    targetNumbers = (validation.credentials.adminNumber || '')
      .split(',')
      .map(n => n.trim())
      .filter(n => n);
  }

  if (targetNumbers.length === 0) {
    console.warn(`⚠️  No ${recipientType} WhatsApp number configured`);
    return { success: false, skipped: true, reason: `No ${recipientType} number`, count: 0 };

          ...options.reservation,
      const body = buildWhatsAppMessage({ reservation, dress, action }, process.env.API_URL || '');
      const to = formatPhoneNumber(reservation?.clientPhone || '');

      return {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      };
        phone: targetNumber, 
        success: false, 
        error: error.message 
      });
    }
  }

  return {
    success: results.some(r => r.success),
    count: targetNumbers.length,
    results,
  };
}

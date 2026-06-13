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
 * Format phone for display in messages (readable form).
 * e.g. converts '20101xxxxxxxx' -> '+20101xxxxxxxx'
 */
export function formatDisplayPhone(phone) {
  const digits = formatPhoneNumber(phone || '');
  if (!digits) return '—';
  if (digits.length === 12 && digits.startsWith('20')) return `+${digits}`;
  return digits;
}

/**
 * Validates Egyptian phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean}
 */
export function isValidEgyptianPhone(phone) {
  if (!phone) return false;
  // Normalize input: remove non-digits
  let digits = phone.replace(/\D/g, '');

  // Remove leading international 00 if present
  if (digits.startsWith('00')) digits = digits.slice(2);

  // If starts with single leading 0 (local format e.g. 010xxxxxxxx), strip it
  if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);

  // If now 10-digit local number, prefix with country code 20
  if (digits.length === 10 && /^(10|11|12|15)\d{8}$/.test(digits)) {
    digits = '20' + digits;
  }

  // Accept only 12-digit numbers starting with country code 20 and valid mobile prefixes
  return /^(20)(10|11|12|15)\d{8}$/.test(digits);
}

export function buildWhatsAppMessage({ reservation, dress, action, forClient = false }, origin = '') {
  const isConfirmed = action === 'confirm';
  const baseTitle = isConfirmed ? '✅ حجز مؤكد' : '🔔 حجز جديد';
  const title = forClient ? baseTitle.replace('حجز', 'حجزك') : baseTitle;

  // Map placeholders as requested
  const placeholder1 = title;
  const dressName = reservation.dressName || dress?.name || '—';
  const dressId = reservation.dressId || dress?.id || '—';
  const placeholder2 = `${dressName} — كود ${dressId}${dress?.price ? ` — ${dress.price} ج.م` : ''}`;
  const clientName = reservation.clientName || '—';
  const clientPhone = formatDisplayPhone(reservation.clientPhone || '');
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

  // Add a direct dress link so recipients can open the dress page (and access the QR modal on the site)
  try {
    const maybeOrigin = (origin && String(origin).replace(/\/$/, ''))
      || (process.env.SITE_ORIGIN && String(process.env.SITE_ORIGIN).replace(/\/$/, ''))
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/\/$/, '')}` : '')
      || '';
    if (maybeOrigin) {
      const dressPath = `/dress/${encodeURIComponent(reservation.dressId || dress?.id || '')}`;
      lines.push('', `🔗 ${maybeOrigin}${dressPath}`);
    }
  } catch (err) {
    console.warn('Failed to build dress origin link for WhatsApp message', err);
  }

  return lines.filter(Boolean).join('\n');
}

/**
 * Build a WhatsApp Cloud API template payload.
 * Requires template names to be set in environment variables or passed via options.
 * Falls back to null if no template name is configured for the given role/action.
 */
export function buildWhatsAppTemplatePayload({ action, reservation, dress, recipientType = 'client', forClient = false, origin = '', templateName: optTemplateName, recipientPhone = null } = {}) {
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || 'ar';

  // If a common template name is provided (optionally via env), prefer it for all recipients
  const commonTemplate = process.env.WHATSAPP_TEMPLATE_COMMON || null;

  const templateName = optTemplateName || commonTemplate || (() => {
    if (forClient || recipientType === 'client') {
      return action === 'new'
        ? process.env.WHATSAPP_TEMPLATE_NEW_CLIENT
        : process.env.WHATSAPP_TEMPLATE_CONFIRM_CLIENT;
    }
    // admin/sales
    return action === 'new'
      ? process.env.WHATSAPP_TEMPLATE_NEW_ADMIN
      : process.env.WHATSAPP_TEMPLATE_CONFIRM_ADMIN;
  })();

  if (!templateName) return null;

  const dressName = reservation.dressName || dress?.name || '—';
  const dressId = reservation.dressId || dress?.id || '—';
  const dressPrice = dress?.price ? `${dress.price} ج.م` : '';
  const placeholder1 = action === 'confirm' ? '✅ حجز مؤكد' : '🔔 حجز جديد';
  const placeholder2 = `${dressName} — كود ${dressId}${dressPrice ? ` — ${dressPrice}` : ''}`;
  const clientName = reservation.clientName || '—';
  const clientPhone = formatDisplayPhone(reservation.clientPhone || '');
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

  // try to build dress URL
  let dressUrl = '';
  try {
    const maybeOrigin = (origin && String(origin).replace(/\/$/, ''))
      || (process.env.SITE_ORIGIN && String(process.env.SITE_ORIGIN).replace(/\/$/, ''))
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.replace(/\/$/, '')}` : '')
      || '';
    if (maybeOrigin) {
      const dressPath = `/dress/${encodeURIComponent(reservation.dressId || dress?.id || '')}`;
      dressUrl = `${maybeOrigin}${dressPath}`;
    }
  } catch (e) {
    dressUrl = '';
  }

  const bodyParams = [
    { type: 'text', text: placeholder1 },
    { type: 'text', text: placeholder2 },
    { type: 'text', text: placeholder4 },
    { type: 'text', text: placeholder5 },
    { type: 'text', text: placeholder6 },
    { type: 'text', text: placeholder7 },
  ];
  if (dressUrl) bodyParams.push({ type: 'text', text: dressUrl });

  const components = [
    { type: 'body', parameters: bodyParams },
  ];

  return {
    messaging_product: 'whatsapp',
    to: formatPhoneNumber(recipientPhone || reservation.clientPhone),
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
      components,
    },
  };
}

/**
 * Constructs WhatsApp message template based on notification type
 * @param {Object} options - { action, reservation, dress }
 * @returns {Object} Message body for WhatsApp API
 */
export function formatWhatsAppMessage({ action, reservation, dress }) {
  const {
    clientName = 'العميل',
    clientPhone: rawClientPhone = '',
    dressName = 'الفستان',
    trialDate = '',
    rentDate = '',
    time = '',
    notes = '',
  } = reservation || {};

  const clientPhone = formatDisplayPhone(rawClientPhone || '');

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
    to: formatPhoneNumber(rawClientPhone),
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

  // Normalize and validate client phone (for content purposes)
  const rawClientPhone = String(reservation.clientPhone || '');
  const digitsOnlyClient = rawClientPhone.replace(/\D/g, '');
  let normalizedClient = digitsOnlyClient;
  if (normalizedClient.startsWith('00')) normalizedClient = normalizedClient.slice(2);
  if (normalizedClient.startsWith('0') && normalizedClient.length === 11) normalizedClient = normalizedClient.slice(1);
  if (normalizedClient.length === 10) normalizedClient = '20' + normalizedClient;

  if (!/^(20)(10|11|12|15)\d{8}$/.test(normalizedClient)) {
    const error = new Error(`Invalid Egyptian phone number: ${reservation.clientPhone}`);
    error.code = 'INVALID_PHONE_FORMAT';
    error.statusCode = 400;
    throw error;
  }

  // Determine the actual recipient phone (where the message will be sent).
  // For admin/sales notifications this will be the admin/sales number; for client notifications it's the client.
  const recipientRaw = options.recipientPhone || reservation.clientPhone;
  const digitsOnlyRecipient = String(recipientRaw || '').replace(/\D/g, '');
  let normalizedRecipient = digitsOnlyRecipient;
  if (normalizedRecipient.startsWith('00')) normalizedRecipient = normalizedRecipient.slice(2);
  if (normalizedRecipient.startsWith('0') && normalizedRecipient.length === 11) normalizedRecipient = normalizedRecipient.slice(1);
  if (normalizedRecipient.length === 10) normalizedRecipient = '20' + normalizedRecipient;

  if (!/^(20)(10|11|12|15)\d{8}$/.test(normalizedRecipient)) {
    const error = new Error(`Invalid recipient phone number: ${recipientRaw}`);
    error.code = 'INVALID_RECIPIENT_PHONE_FORMAT';
    error.statusCode = 400;
    throw error;
  }

  const { recipientType } = options || {};
  // Decide whether to use templates. Options override env; default to true per request.
  const useTemplates = (typeof options.useTemplate !== 'undefined')
    ? Boolean(options.useTemplate)
    : (process.env.WHATSAPP_USE_TEMPLATE ? process.env.WHATSAPP_USE_TEMPLATE === 'true' : true);
  let messageBody;
  const isAdminRecipient = recipientType === 'admin' || recipientType === 'sales';
  if (useTemplates) {
    // When templates are required, fail fast if no template is configured for this recipient/action
    const templatePayload = buildWhatsAppTemplatePayload({
      action: options.action,
      reservation: options.reservation,
      dress: options.dress,
      recipientType: isAdminRecipient ? recipientType : 'client',
      forClient: !isAdminRecipient,
      origin: options.origin,
      recipientPhone: normalizedRecipient,
    });

    if (!templatePayload) {
      const error = new Error(`Missing WhatsApp template for ${isAdminRecipient ? recipientType : 'client'} (action=${options.action})`);
      error.code = 'MISSING_TEMPLATE';
      error.statusCode = 500;
      throw error;
    }

    messageBody = templatePayload;
  } else {
    // Templates disabled -> fallback to text-only messages
    if (isAdminRecipient) {
      const adminText = buildWhatsAppMessage({ reservation: options.reservation, dress: options.dress, action: options.action }, options.origin);
      messageBody = {
        messaging_product: 'whatsapp',
        to: formatPhoneNumber(normalizedRecipient),
        type: 'text',
        text: { body: adminText },
      };
    } else {
      const clientText = buildWhatsAppMessage({ reservation: options.reservation, dress: options.dress, action: options.action, forClient: true }, options.origin);
      messageBody = {
        messaging_product: 'whatsapp',
        to: formatPhoneNumber(normalizedRecipient),
        type: 'text',
        text: { body: clientText },
      };
    }
  }
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
  }

  // Send to all target numbers
  const results = [];
  for (const targetNumber of targetNumbers) {
    try {
      const modifiedOptions = {
        ...options,
        // do NOT overwrite clientPhone; pass recipientPhone so message goes to admin number
        recipientPhone: targetNumber,
        recipientType,
      };
      const result = await sendWhatsAppMessage(modifiedOptions);
      results.push({ phone: targetNumber, ...result });
    } catch (error) {
      console.error(`Failed to notify ${recipientType} (${targetNumber}):`, error.message);
      results.push({
        phone: targetNumber,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    success: results.some(r => r.success),
    count: targetNumbers.length,
    results,
  };
}

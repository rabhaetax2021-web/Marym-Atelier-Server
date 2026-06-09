/* eslint-disable no-undef */

export function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

export function parsePhoneNumbers(raw) {
  // Split on commas, semicolons, pipes or whitespace to be forgiving with env formats
  return String(raw || '')
    .split(/[\s,;|]+/)
    .map((value) => normalizePhone(value))
    .filter(Boolean);
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

export async function sendWhatsAppNotification(body, env = process.env) {
  const token = env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return {
      status: 503,
      data: {
        ok: false,
        error: 'WhatsApp API غير مُعد. تأكدي من إعداد WHATSAPP_ACCESS_TOKEN و WHATSAPP_PHONE_NUMBER_ID في Vercel.',
      },
    };
  }

  const action = String(body?.action || 'new').toLowerCase();
  const { reservation, dress } = body || {};

  const adminNumbers = parsePhoneNumbers(env.WHATSAPP_ADMIN_NUMBER);
  const salesNumbers = parsePhoneNumbers(env.WHATSAPP_SALES_NUMBER);

  console.log('📤 WhatsApp notify action=', action, 'adminNumbers=', adminNumbers, 'salesNumbers=', salesNumbers);

  if (!adminNumbers.length) {
    return {
      status: 400,
      data: { ok: false, error: 'WHATSAPP_ADMIN_NUMBER غير مُعد في Vercel.' },
    };
  }

  if (!salesNumbers.length && action === 'new') {
    console.warn('⚠️ WHATSAPP_SALES_NUMBER is not configured. Sending to admin only.');
  }

  if (!reservation?.clientName || !reservation?.clientPhone) {
    return {
      status: 400,
      data: { ok: false, error: 'بيانات الحجز غير مكتملة.' },
    };
  }

  const recipients = new Set(adminNumbers);
  if (action === 'new' && salesNumbers.length) {
    salesNumbers.forEach((number) => recipients.add(number));
  }

  if (!recipients.size) {
    return {
      status: 400,
      data: { ok: false, error: 'لا توجد أرقام واتساب صالحة للإرسال.' },
    };
  }

  const message = buildWhatsAppMessage({ reservation, dress, action }, String(body?.origin || ''));
  // Log a preview of the generated message to help debug API errors and content issues
  try {
    console.log('📤 WhatsApp message preview:', String(message).slice(0, 1000));
  } catch (e) {
    console.warn('Failed to log WhatsApp message preview', e);
  }

  // Prepare template fields for WhatsApp template payload
  const isConfirmed = action === 'confirm';
  const title = isConfirmed ? '✅ حجز مؤكد' : '🔔 حجز جديد';
  const dressName = reservation?.dressName || dress?.name || '—';
  const dressId = reservation?.dressId || dress?.id || '—';
  const clientName = reservation?.clientName || '—';
  const clientPhone = reservation?.clientPhone || '—';
  const trialDate = reservation?.trialDate || '—';
  const rentDate = reservation?.rentDate || '—';
  const notesText = reservation?.notes || 'لا يوجد';
  const reservationIdText = reservation?.id || '—';
  const priceText = (reservation?.price || dress?.price) ? `${reservation?.price || dress?.price} ج.م` : '—';
  const templateName = String(env.WHATSAPP_TEMPLATE_NAME || process.env.WHATSAPP_TEMPLATE_NAME || 'reservation_update');
  const templateLang = String(env.WHATSAPP_TEMPLATE_LANG || process.env.WHATSAPP_TEMPLATE_LANG || 'ar_EG');

  // Ensure we have weight/height values for template parameters
  const clientWeight = reservation?.weight !== undefined && reservation?.weight !== null ? String(reservation.weight) : '—';
  const clientHeight = reservation?.height !== undefined && reservation?.height !== null ? String(reservation.height) : '—';

  try {
    const sendTo = async (toNumber) => {
      try {
        // First try sending the configured template
        const templatePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toNumber,
          type: 'template',
          template: {
            name: templateName,
            language: { code: templateLang },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: title },
                  { type: 'text', text: `${dressName} — كود ${dressId}` },
                  { type: 'text', text: `${clientName} — ${clientPhone}` },
                  { type: 'text', text: `وزن: ${clientWeight} كجم` },
                  { type: 'text', text: `طول: ${clientHeight} سم` },
                  { type: 'text', text: `تجربة ${trialDate} / إيجار ${rentDate}` },
                  { type: 'text', text: notesText },
                  { type: 'text', text: priceText },
                  { type: 'text', text: reservationIdText },
                ],
              },
            ],
          },
        };

        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(templatePayload),
        });

        const json = await res.json().catch(() => ({}));
        if (res.ok && json?.messages) {
          return { ok: true, status: 200, messageId: json?.messages?.[0]?.id || null, to: toNumber };
        }

        // Log template failure with details
        console.error('WhatsApp template send failed:', { status: res.status, body: json, to: toNumber });

        // Fallback: attempt to send a plain text message with the same content
        try {
          const textRes = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: toNumber,
              type: 'text',
              text: { body: message },
            }),
          });

          const textJson = await textRes.json().catch(() => ({}));
          if (textRes.ok && textJson?.messages) {
            console.warn('WhatsApp template failed; text fallback succeeded for', toNumber);
            return { ok: true, status: 200, messageId: textJson?.messages?.[0]?.id || null, to: toNumber, fallback: true };
          }

          console.error('WhatsApp text fallback failed:', { status: textRes.status, body: textJson, to: toNumber });
          return {
            ok: false,
            status: textRes.status || res.status,
            error: textJson?.error?.message || json?.error?.message || 'فشل إرسال رسالة واتساب.',
            details: textJson?.error || json?.error || textJson || json || null,
            to: toNumber,
          };
        } catch (textErr) {
          console.error('WhatsApp text fallback error:', textErr, 'to:', toNumber);
          return {
            ok: false,
            status: 500,
            error: textErr.message || 'خطأ في الاتصال بواتساب (فشل النص البديل)',
            details: { stack: textErr.stack },
            to: toNumber,
          };
        }
      } catch (err) {
        console.error('WhatsApp send error:', err, 'to:', toNumber);
        return {
          ok: false,
          status: 500,
          error: err.message || 'خطأ في الاتصال بواتساب',
          details: { stack: err.stack },
          to: toNumber,
        };
      }
    };

    const results = await Promise.all(Array.from(recipients).map((number) => sendTo(number)));
    const successes = results.filter((result) => result.ok);
    const failures = results.filter((result) => !result.ok);

    console.log('📤 WhatsApp send results: successes=', successes.length, 'failures=', failures.length, 'recipients=', Array.from(recipients));
    if (failures.length) console.warn('📤 WhatsApp failures:', failures);

    if (!successes.length) {
      return {
        status: failures[0]?.status || 500,
        data: { ok: false, error: 'لم يتم إرسال الرسالة لأي من الأرقام.', details: failures },
      };
    }

    return {
      status: 200,
      data: {
        ok: true,
        recipients: Array.from(recipients),
        results,
        messageIds: successes.map((s) => s.messageId),
      },
    };
  } catch (error) {
    console.error('sendWhatsAppNotification error:', error);
    return {
      status: 500,
      data: {
        ok: false,
        error: error.message || 'خطأ غير متوقع في الخادم.',
      },
    };
  }
}

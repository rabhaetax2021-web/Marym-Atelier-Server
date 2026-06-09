const DEFAULT_DRESSES = [
  {
    id: "DRS-001",
    name: "فستان زمردي ملكي فاخر",
    designer: "سلمى خالد",
    category: "mermaid_extension",
    price: 1500,
    size: "L",
    color: "أخضر زمردي",
    images: ["/dresses/emerald.png"],
    details: "فستان سواريه فاخر بلون زمردي داكن، مصنوع من الحرير الناعم والشيفون الفاخر مع تطريز يدوي أنيق على الصدر والأكمام. يناسب السهرات والحفلات الراقية.",
    available: true
  },
  {
    id: "DRS-002",
    name: "فستان زفاف ملكي دانتيل أسطوري",
    designer: "نوران إلياس",
    category: "mermaid_full_skirt",
    price: 4500,
    size: "M",
    color: "أبيض ناصع",
    images: ["/dresses/wedding.png"],
    details: "فستان زفاف أسطوري بأكمام دانتيل فرنسي وتطريز كريستال يدوي. تصميم ملكي منفوش يمنحكِ إطلالة كالأميرات في ليلة العمر الكبرى.",
    available: true
  },
  {
    id: "DRS-003",
    name: "فستان سهرة مخملي أزرق ملكي",
    designer: "ليلى منصور",
    category: "mermaid_extension",
    price: 1800,
    size: "XL",
    color: "أزرق ملكي",
    images: ["/dresses/royal_blue.png"],
    details: "فستان سهرة فاخر مصمم من المخمل الناعم باللون الأزرق الملكي، مع تطريز فضي لامع على الياقة والخصر. يناسب المناسبات الشتوية والربيعية الراقية.",
    available: true
  },
  {
    id: "DRS-004",
    name: "فستان خطوبة روز جولد براق",
    designer: "مريم حنفي",
    category: "mermaid_full_skirt",
    price: 2200,
    size: "S",
    color: "روز جولد / ذهبي وردي",
    images: ["/dresses/rose_gold.png"],
    details: "فستان خطوبة مميز باللون الذهبي الوردي، مرصع بالكامل بالخرز والترتر البراق. يتميز بقصة حورية البحر الأنيقة مع ذيل تول منسدل قابل للإزالة.",
    available: true
  }
];

const DEFAULT_SETTINGS = {
  storeName: "MaryMatelier",
};

export const getDresses = () => {
  const data = localStorage.getItem("marymatelier_dresses");
  if (!data) {
    localStorage.setItem("marymatelier_dresses", JSON.stringify(DEFAULT_DRESSES));
    return DEFAULT_DRESSES;
  }
  return JSON.parse(data);
};

export const saveDresses = (dresses) => {
  localStorage.setItem("marymatelier_dresses", JSON.stringify(dresses));
};

export const addDress = (dress) => {
  const dresses = getDresses();
  dresses.push(dress);
  saveDresses(dresses);
  return dresses;
};

export const updateDress = (updatedDress) => {
  const dresses = getDresses();
  const index = dresses.findIndex(
    d => d.id.trim().toLowerCase() === updatedDress.id.trim().toLowerCase()
  );
  if (index !== -1) {
    dresses[index] = {
      ...dresses[index],
      ...updatedDress,
      id: dresses[index].id // keep the original ID casing
    };
    saveDresses(dresses);
  }
  return dresses;
};

export const deleteDress = (id) => {
  const dresses = getDresses();
  const filtered = dresses.filter(d => d.id !== id);
  saveDresses(filtered);
  return filtered;
};

export const getSettings = () => {
  const data = localStorage.getItem("marymatelier_settings");
  if (!data) {
    localStorage.setItem("marymatelier_settings", JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  return JSON.parse(data);
};

export const saveSettings = (settings) => {
  localStorage.setItem("marymatelier_settings", JSON.stringify(settings));
};

const DEFAULT_RESERVATIONS = [];

export const getReservations = () => {
  const data = localStorage.getItem("marymatelier_reservations");
  if (!data) {
    localStorage.setItem("marymatelier_reservations", JSON.stringify(DEFAULT_RESERVATIONS));
    return DEFAULT_RESERVATIONS;
  }
  return JSON.parse(data);
};

export const saveReservations = (reservations) => {
  localStorage.setItem("marymatelier_reservations", JSON.stringify(reservations));
};

export const addReservation = (reservation) => {
  const reservations = getReservations();
  reservations.push(reservation);
  saveReservations(reservations);
  return reservations;
};

export const updateReservation = (updatedReservation) => {
  const reservations = getReservations();
  const index = reservations.findIndex((reservation) => reservation.id === updatedReservation.id);
  if (index !== -1) {
    reservations[index] = {
      ...reservations[index],
      ...updatedReservation,
    };
    saveReservations(reservations);
  }
  return reservations;
};

export const isDressReservedOnDate = (dressId, rentDate, status = 'confirmed') => {
  return getReservations().some(
    (reservation) => reservation.dressId === dressId && reservation.rentDate === rentDate && reservation.status === status
  );
};

// Local token helpers (store WhatsApp tokens locally as a fallback)
const LOCAL_TOKEN_KEYS = {
  accessToken: 'marymatelier_whatsapp_access_token',
  phoneNumberId: 'marymatelier_whatsapp_phone_number_id',
};

export const getLocalTokens = () => {
  return {
    accessToken: localStorage.getItem(LOCAL_TOKEN_KEYS.accessToken) || '',
    phoneNumberId: localStorage.getItem(LOCAL_TOKEN_KEYS.phoneNumberId) || '',
  };
};

export const saveLocalTokens = ({ accessToken, phoneNumberId }) => {
  if (accessToken != null) localStorage.setItem(LOCAL_TOKEN_KEYS.accessToken, accessToken);
  if (phoneNumberId != null) localStorage.setItem(LOCAL_TOKEN_KEYS.phoneNumberId, phoneNumberId);
  return getLocalTokens();
};

export const clearLocalTokens = () => {
  localStorage.removeItem(LOCAL_TOKEN_KEYS.accessToken);
  localStorage.removeItem(LOCAL_TOKEN_KEYS.phoneNumberId);
};

// Remove legacy/old localStorage keys related to WhatsApp that may have been stored
export const clearLegacyLocalStorage = () => {
  try {
    // Migrate old token values into the current local keys when possible.
    const oldAccessToken = localStorage.getItem('whatsappAccessToken');
    const oldPhoneNumberId = localStorage.getItem('whatsappPhoneNumberId');
    if (oldAccessToken) {
      localStorage.setItem(LOCAL_TOKEN_KEYS.accessToken, oldAccessToken);
      localStorage.removeItem('whatsappAccessToken');
    }
    if (oldPhoneNumberId) {
      localStorage.setItem(LOCAL_TOKEN_KEYS.phoneNumberId, oldPhoneNumberId);
      localStorage.removeItem('whatsappPhoneNumberId');
    }

    const settingsRaw = localStorage.getItem('marymatelier_settings');
    if (settingsRaw) {
      try {
        const s = JSON.parse(settingsRaw);
        let dirty = false;

        if (s && typeof s === 'object') {
          if ('whatsappAccessToken' in s && !localStorage.getItem(LOCAL_TOKEN_KEYS.accessToken)) {
            localStorage.setItem(LOCAL_TOKEN_KEYS.accessToken, s.whatsappAccessToken);
            delete s.whatsappAccessToken;
            dirty = true;
          }
          if ('whatsappPhoneNumberId' in s && !localStorage.getItem(LOCAL_TOKEN_KEYS.phoneNumberId)) {
            localStorage.setItem(LOCAL_TOKEN_KEYS.phoneNumberId, s.whatsappPhoneNumberId);
            delete s.whatsappPhoneNumberId;
            dirty = true;
          }
          if ('whatsappApiUrl' in s) {
            delete s.whatsappApiUrl;
            dirty = true;
          }
        }

        if ('adminPasscode' in s) {
          delete s.adminPasscode;
          dirty = true;
        }
        if ('whatsappNumber' in s) {
          delete s.whatsappNumber;
          dirty = true;
        }

        if (dirty) {
          localStorage.setItem('marymatelier_settings', JSON.stringify(s));
        }
      } catch (error) {
        void error;
      }
    }
  } catch {
    // ignore
  }
};

// Designers helper (stored locally)
const DESIGNERS_KEY = 'marymatelier_designers';

export const getDesigners = () => {
  try {
    const raw = localStorage.getItem(DESIGNERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addDesigner = (name) => {
  if (!name) return getDesigners();
  const n = String(name).trim();
  if (!n) return getDesigners();
  const current = getDesigners();
  if (!current.includes(n)) {
    const next = [...current, n];
    try { localStorage.setItem(DESIGNERS_KEY, JSON.stringify(next)); } catch (error) { void error; }
    return next;
  }
  return current;
};

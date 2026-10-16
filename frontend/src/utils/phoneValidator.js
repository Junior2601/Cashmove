// utils/phoneValidator.js

// Formats de numéro par préfixe pays
//   pattern     règle de validation (inchangée)
//   starts      débuts possibles : alerte dès les premiers chiffres saisis
//   groups      découpage d'affichage (ex. [2,2,2,2,2] → 07 12 34 56 78)
//   description texte montré sous le champ
const PHONE_FORMATS = {
  '+33': { // France
    pattern: /^(0[1-9])(\d{2}){4}$/,
    example: '0612345678',
    length: 10,
    maxLength: 10,
    starts: ['01', '02', '03', '04', '05', '06', '07', '08', '09'],
    groups: [2, 2, 2, 2, 2],
    description: '10 chiffres commençant par 0'
  },
  '+221': { // Sénégal
    pattern: /^(70|76|77|78)(\d{7})$/,
    example: '701234567',
    length: 9,
    maxLength: 9,
    starts: ['70', '76', '77', '78'],
    groups: [2, 3, 2, 2],
    description: '9 chiffres commençant par 70, 76, 77 ou 78'
  },
  '+225': { // Côte d'Ivoire
    pattern: /^(07|05|01)(\d{8})$/,
    example: '0712345678',
    length: 10,
    maxLength: 10,
    starts: ['01', '05', '07'],
    groups: [2, 2, 2, 2, 2],
    description: '10 chiffres commençant par 01, 05 ou 07'
  },
  '+229': { // Bénin
    pattern: /^(01[4-9])(\d{7})$/,
    example: '0140123456',
    length: 10,
    maxLength: 10,
    starts: ['014', '015', '016', '017', '018', '019'],
    groups: [2, 2, 2, 2, 2],
    description: '10 chiffres commençant par 01'
  },
  '+226': { // Burkina Faso
    pattern: /^(0|5|6|7)(\d{7})$/,
    example: '70123456',
    length: 8,
    maxLength: 8,
    starts: ['0', '5', '6', '7'],
    groups: [2, 2, 2, 2],
    description: '8 chiffres commençant par 0, 5, 6 ou 7'
  },
  '+223': { // Mali
    pattern: /^(6|7)(\d{8})$/,
    example: '601234567',
    length: 9,
    maxLength: 9,
    starts: ['6', '7'],
    groups: [3, 2, 2, 2],
    description: '9 chiffres commençant par 6 ou 7'
  },
  '+224': { // Guinée
    pattern: /^(6[0-2])(\d{7})$/,
    example: '601234567',
    length: 9,
    maxLength: 9,
    starts: ['60', '61', '62'],
    groups: [3, 2, 2, 2],
    description: '9 chiffres commençant par 60, 61 ou 62'
  },
  '+228': { // Togo
    pattern: /^(9[0-9])(\d{7})$/,
    example: '901234567',
    length: 9,
    maxLength: 9,
    starts: ['9'],
    groups: [2, 3, 2, 2],
    description: '9 chiffres commençant par 9'
  },
  '+237': { // Cameroun (mobile : Orange, MTN…)
    pattern: /^6\d{8}$/,
    example: '671234567',
    length: 9,
    maxLength: 9,
    starts: ['6'],
    groups: [1, 2, 2, 2, 2],
    description: '9 chiffres commençant par 6'
  },
  '+212': { // Maroc
    pattern: /^(6|7)(\d{8})$/,
    example: '612345678',
    length: 9,
    maxLength: 9,
    starts: ['6', '7'],
    groups: [1, 2, 2, 2, 2],
    description: '9 chiffres commençant par 6 ou 7'
  },
  '+213': { // Algérie
    pattern: /^(5|6|7)(\d{8})$/,
    example: '551234567',
    length: 9,
    maxLength: 9,
    starts: ['5', '6', '7'],
    groups: [3, 2, 2, 2],
    description: '9 chiffres commençant par 5, 6 ou 7'
  },
  '+216': { // Tunisie
    pattern: /^[2-9](\d{7})$/,
    example: '20123456',
    length: 8,
    maxLength: 8,
    starts: ['2', '3', '4', '5', '6', '7', '8', '9'],
    groups: [2, 3, 3],
    description: '8 chiffres commençant par 2 à 9'
  },
  '+7': { // Russie
    pattern: /^(9[0-9])(\d{8})$/,
    example: '9161234567',
    length: 10,
    maxLength: 10,
    starts: ['9'],
    groups: [3, 3, 2, 2],
    description: '10 chiffres commençant par 9'
  },
  // Format par défaut pour les pays non listés
  'default': {
    pattern: /^[0-9]{8,15}$/,
    example: '123456789',
    length: '8-15',
    maxLength: 15,
    starts: [],
    groups: [],
    description: '8 à 15 chiffres'
  }
};

// Découpe un numéro pour l'affichage : "0712345678" → "07 12 34 56 78"
export const groupDigits = (digits, groups = []) => {
  if (!groups.length) return digits.replace(/(\d{3})(?=\d)/g, '$1 ');
  const parts = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  if (i < digits.length) parts.push(digits.slice(i));
  return parts.join(' ');
};

// Liste lisible : ['01','05','07'] → "01, 05 ou 07"
const listStarts = (starts) =>
  starts.length <= 1 ? (starts[0] || '') : `${starts.slice(0, -1).join(', ')} ou ${starts[starts.length - 1]}`;

/**
 * Note affichée pendant la saisie d'un numéro (sans indicatif).
 * Retourne { state, text, count, expected, formatted, example, rule }
 *   state : 'empty' | 'typing' | 'wrong-start' | 'too-long' | 'prefix' | 'invalid' | 'valid'
 */
export const describePhoneInput = (raw, phonePrefix) => {
  const format = getPhoneFormatByPrefix(phonePrefix);
  const prefixDigits = String(phonePrefix || '').replace(/\D/g, '');
  const value = String(raw || '').trim();
  let digits = value.replace(/\D/g, '');
  const expected = typeof format.length === 'number' ? format.length : null;
  const example = groupDigits(format.example, format.groups);
  const rule = phonePrefix ? `${format.description}, sans l'indicatif ${phonePrefix}` : format.description;

  if (!digits) {
    return { state: 'empty', text: `Format : ${rule}. Exemple : ${example}`, count: 0, expected, example, rule };
  }

  // Indicatif saisi en plus (« +225… » ou « 00225… ») : il est retiré à l'enregistrement
  let prefixNote = false;
  if (prefixDigits && (value.startsWith('+') || value.startsWith('00'))) {
    const withoutZeros = value.startsWith('00') ? digits.slice(2) : digits;
    if (withoutZeros.startsWith(prefixDigits)) {
      digits = withoutZeros.slice(prefixDigits.length);
      prefixNote = true;
    }
  }

  const count = digits.length;
  const formatted = `${phonePrefix || ''} ${groupDigits(digits, format.groups)}`.trim();
  const base = { count, expected, example, rule, formatted };

  if (format.starts.length && !format.starts.some((s) => digits.startsWith(s) || s.startsWith(digits))) {
    return { ...base, state: 'wrong-start', text: `Ce numéro doit commencer par ${listStarts(format.starts)}.` };
  }
  if (count > format.maxLength) {
    return { ...base, state: 'too-long', text: `Trop de chiffres : ${count} au lieu de ${format.length}.` };
  }
  if (format.pattern.test(digits)) {
    return {
      ...base,
      state: prefixNote ? 'prefix' : 'valid',
      text: prefixNote
        ? `Indicatif inutile, il est ajouté automatiquement. Numéro : ${formatted}`
        : `Numéro complet : ${formatted}`,
    };
  }
  if (expected && count < expected) {
    return { ...base, state: 'typing', text: `${count} chiffre${count > 1 ? 's' : ''} sur ${expected} · ${format.description}.` };
  }
  if (!expected && count < 8) {
    return { ...base, state: 'typing', text: `${count} chiffre${count > 1 ? 's' : ''} · ${format.description}.` };
  }
  return { ...base, state: 'invalid', text: `Format invalide : ${format.description}.` };
};

// Fonction pour nettoyer le numéro de téléphone
export const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
};

// Fonction pour obtenir le format d'un pays basé sur son préfixe
export const getPhoneFormatByPrefix = (phonePrefix) => {
  if (!phonePrefix) return PHONE_FORMATS.default;
  
  const prefix = phonePrefix.startsWith('+') ? phonePrefix : `+${phonePrefix}`;
  return PHONE_FORMATS[prefix] || PHONE_FORMATS.default;
};

// Fonction principale de validation
export const validatePhoneNumber = (phone, countryCode = null, phonePrefix = null) => {
  const cleanedPhone = cleanPhoneNumber(phone);
  
  if (!cleanedPhone) {
    return {
      isValid: false,
      message: 'Le numéro de téléphone est requis',
      examples: [],
      formatted: '',
      maxLength: 15
    };
  }

  // Utiliser le phone_prefix si fourni, sinon utiliser le countryCode
  let format;
  if (phonePrefix) {
    format = getPhoneFormatByPrefix(phonePrefix);
  } else if (countryCode) {
    // Si on a seulement le code pays, on peut mapper vers les préfixes connus
    const countryToPrefix = {
      'FR': '+33', 'SN': '+221', 'CI': '+225', 'BJ': '+229',
      'BF': '+226', 'ML': '+223', 'GN': '+224', 'TG': '+228',
      'MA': '+212', 'DZ': '+213', 'TN': '+216'
    };
    const prefix = countryToPrefix[countryCode];
    format = prefix ? PHONE_FORMATS[prefix] : PHONE_FORMATS.default;
  } else {
    format = PHONE_FORMATS.default;
  }

  // Validation basique - seulement des chiffres
  if (!/^\d+$/.test(cleanedPhone)) {
    return {
      isValid: false,
      message: 'Le numéro ne doit contenir que des chiffres',
      examples: [format.example],
      formatted: cleanedPhone,
      maxLength: format.maxLength
    };
  }

  // Validation de la longueur
  const minLength = typeof format.length === 'string' ? 8 : format.length;
  const maxLength = format.maxLength;
  
  if (cleanedPhone.length < minLength || cleanedPhone.length > maxLength) {
    return {
      isValid: false,
      message: `Le numéro doit contenir ${format.length} chiffres`,
      examples: [format.example],
      formatted: cleanedPhone,
      maxLength: format.maxLength
    };
  }

  // Validation du pattern
  if (!format.pattern.test(cleanedPhone)) {
    return {
      isValid: false,
      message: `Format invalide. ${format.description}`,
      examples: [format.example],
      formatted: cleanedPhone,
      maxLength: format.maxLength
    };
  }

  return {
    isValid: true,
    message: 'Format valide',
    examples: [format.example],
    formatted: cleanedPhone,
    maxLength: format.maxLength
  };
};

// Fonction pour obtenir des exemples de format
export const getPhoneFormatExamples = (countryCode = null, phonePrefix = null) => {
  let format;
  if (phonePrefix) {
    format = getPhoneFormatByPrefix(phonePrefix);
  } else if (countryCode) {
    const countryToPrefix = {
      'FR': '+33', 'SN': '+221', 'CI': '+225', 'BJ': '+229',
      'BF': '+226', 'ML': '+223', 'GN': '+224', 'TG': '+228',
      'MA': '+212', 'DZ': '+213', 'TN': '+216'
    };
    const prefix = countryToPrefix[countryCode];
    format = prefix ? PHONE_FORMATS[prefix] : PHONE_FORMATS.default;
  } else {
    format = PHONE_FORMATS.default;
  }
  
  return [format.example];
};

// Fonction pour formater le numéro avec le préfixe
export const formatPhoneWithPrefix = (phone, country) => {
  if (!phone || !country) return phone;
  
  const cleanedPhone = cleanPhoneNumber(phone);
  const prefix = country.phone_prefix || '';
  
  // Si le numéro commence déjà par le préfixe, ne pas le dupliquer
  if (prefix && cleanedPhone.startsWith(prefix.replace('+', ''))) {
    return `+${cleanedPhone}`;
  }
  
  // Si le préfixe est inclus dans le numéro, formater correctement
  if (prefix && !cleanedPhone.startsWith(prefix.replace('+', ''))) {
    return `${prefix}${cleanedPhone}`;
  }
  
  return cleanedPhone;
};

// Fonction pour formater l'affichage du numéro
export const formatPhoneDisplay = (phone, phonePrefix) => {
  if (!phone) return '';
  
  const cleanedPhone = cleanPhoneNumber(phone);
  const format = getPhoneFormatByPrefix(phonePrefix);
  
  // Enlever le préfixe s'il est déjà inclus
  let numberWithoutPrefix = cleanedPhone;
  if (phonePrefix && cleanedPhone.startsWith(phonePrefix.replace('+', ''))) {
    numberWithoutPrefix = cleanedPhone.slice(phonePrefix.replace('+', '').length);
  }
  
  // Découpage propre au pays (ex. Côte d'Ivoire : 07 12 34 56 78)
  return groupDigits(numberWithoutPrefix, format.groups);
};

// utils/phoneValidator.js

// Formats de numéro par préfixe pays
const PHONE_FORMATS = {
  '+33': { // France
    pattern: /^(0[1-9])(\d{2}){4}$/,
    example: '0612345678',
    length: 10,
    maxLength: 10,
    description: '10 chiffres commençant par 0'
  },
  '+221': { // Sénégal
    pattern: /^(70|76|77|78)(\d{7})$/,
    example: '701234567',
    length: 9,
    maxLength: 9,
    description: '9 chiffres commençant par 70, 76, 77 ou 78'
  },
  '+225': { // Côte d'Ivoire
    pattern: /^(07|05|01)(\d{8})$/,
    example: '0712345678',
    length: 10,
    maxLength: 10,
    description: '10 chiffres commençant par 07 ou 05'
  },
  '+229': { // Bénin
    pattern: /^(6[0-9])(\d{7})$/,
    example: '601234567',
    length: 9,
    maxLength: 9,
    description: '9 chiffres commençant par 6'
  },
  '+226': { // Burkina Faso
    pattern: /^(7[0-9])(\d{7})$/,
    example: '701234567',
    length: 9,
    maxLength: 9,
    description: '9 chiffres commençant par 7'
  },
  '+223': { // Mali
    pattern: /^(6|7)(\d{8})$/,
    example: '601234567',
    length: 9,
    maxLength: 9,
    description: '9 chiffres commençant par 6 ou 7'
  },
  '+224': { // Guinée
    pattern: /^(6[0-2])(\d{7})$/,
    example: '601234567',
    length: 9,
    maxLength: 9,
    description: '9 chiffres commençant par 60, 61 ou 62'
  },
  '+228': { // Togo
    pattern: /^(9[0-9])(\d{7})$/,
    example: '901234567',
    length: 9,
    maxLength: 9,
    description: '9 chiffres commençant par 9'
  },
  '+212': { // Maroc
    pattern: /^(6|7)(\d{8})$/,
    example: '612345678',
    length: 9,
    maxLength: 9,
    description: '9 chiffres commençant par 6 ou 7'
  },
  '+213': { // Algérie
    pattern: /^(5|6|7)(\d{8})$/,
    example: '551234567',
    length: 9,
    maxLength: 9,
    description: '9 chiffres commençant par 5, 6 ou 7'
  },
  '+216': { // Tunisie
    pattern: /^[2-9](\d{7})$/,
    example: '20123456',
    length: 8,
    maxLength: 8,
    description: '8 chiffres commençant par 2-9'
  },
  '+7': { // Russie
    pattern: /^(9[0-9])(\d{8})$/,
    example: '9920123456',
    length: 10,
    maxLength: 10,
    description: '10 chiffres commençant par 90'
  },
  // Format par défaut pour les pays non listés
  'default': {
    pattern: /^[0-9]{8,15}$/,
    example: '123456789',
    length: '8-15',
    maxLength: 15,
    description: '8 à 15 chiffres'
  }
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
  
  // Formater selon le pays (exemple pour la France: 01 23 45 67 89)
  if (phonePrefix === '+33' && numberWithoutPrefix.length === 10) {
    return numberWithoutPrefix.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }
  
  // Format par défaut
  return numberWithoutPrefix;
};
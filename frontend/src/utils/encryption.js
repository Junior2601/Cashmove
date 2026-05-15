// Utilitaire simple pour chiffrer/déchiffrer les IDs
// En production, utilisez une méthode plus sécurisée

export const encryptId = (id) => {
  try {
    // Simple encodage base64 avec un sel
    const salt = 'transferbridge_2024';
    const stringToEncode = `${salt}_${id}`;
    return btoa(stringToEncode);
  } catch (error) {
    console.error('Erreur de chiffrement:', error);
    return null;
  }
};

export const decryptId = (encryptedId) => {
  try {
    const decoded = atob(encryptedId);
    const parts = decoded.split('_');
    return parts[parts.length - 1];
  } catch (error) {
    console.error('Erreur de déchiffrement:', error);
    return null;
  }
};
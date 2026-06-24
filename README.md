# 💸 Move Cash — Plateforme de transfert d'argent

> **Étant donné que la Russie n'est pas connectée au système SWIFT, il est devenu extrêmement difficile pour les étudiants étrangers — notamment africains — d'envoyer et de recevoir de l'argent depuis leur pays d'origine. Move Cash est créée comme un pont financier pour faciliter l'accès à l'échange de devises entre le Franc CFA (XOF) et le Rouble russe (RUB), de manière simple, transparente et accessible.**

---

## 🌍 Contexte

Depuis les sanctions internationales de 2022, la Russie a été exclue du réseau SWIFT, rendant les virements bancaires classiques entre la Russie et l'Afrique quasi impossibles. Des dizaines de milliers d'étudiants africains poursuivant leurs études en Russie se retrouvent ainsi coupés de toute aide financière familiale.

Move Cash répond directement à ce problème en proposant une infrastructure de transfert peer-to-peer, pilotée par un réseau d'agents de confiance.

---

## ✨ Fonctionnalités principales

### 💱 Conversion de plusieurs devises
- Taux de change en temps réel appliqués à chaque transaction
- Calcul transparent : le montant reçu est basé sur le taux pur, sans frais cachés dans la conversion

### 👥 Système d'agents multi-niveaux
- Réseau d'agents humains validés qui facilitent les échanges localement
- Chaque agent perçoit une commission définie sur les transactions qu'il traite
- Système de **redirection de transactions** : un agent peut rediriger une demande vers un autre agent mieux positionné géographiquement

### 🔄 Suivi des transactions en temps réel
- Chaque transfert possède un statut clair : `pending`, `processing`, `completed`, `cancelled`
- Tableau de bord dédié pour les utilisateurs et les agents
- Notifications par e-mail à chaque changement de statut

### 🔐 Authentification & sécurité
- Inscription et connexion sécurisées (JWT)
- Rôles distincts : `user`, `agent`, `admin`
- Accès restreint selon le rôle sur chaque route de l'API

### 🛡️ Intégrité des données
- Suppression douce (*soft delete*) des comptes avec contraintes d'unicité préservées via index partiels PostgreSQL
- Gestion des conflits d'e-mail et de solde sur les enregistrements actifs uniquement

### 🕐 Cohérence des fuseaux horaires
- Toutes les dates sont stockées en `TIMESTAMPTZ` (UTC)
- Affichage adapté au fuseau horaire local de l'utilisateur
- Cohérence garantie entre les réponses API et les notifications e-mail

---

## 🛠️ Stack technique

| Couche | Technologie |
|---|---|
| Backend | Node.js / Express |
| Base de données | PostgreSQL (Hetzner Frankfurt) |
| Frontend | React.js |
| Authentification | JWT |
| E-mails transactionnels | Resend |
| Déploiement | Hetzner VPS + Hostinger DNS |
| Domaine | [movecash.site](https://movecash.site) |

---

## 🚀 Installation locale

```bash
# Cloner le dépôt
git clone https://github.com/ton-username/movecash.git
cd movecash

# Installer les dépendances backend
cd server
npm install

# Configurer les variables d'environnement
cp .env.example .env
# Remplir DATABASE_URL, JWT_SECRET, RESEND_API_KEY, etc.

# Lancer le serveur
npm run dev

# Installer les dépendances frontend
cd ../frontend
npm install
npm start
```

---

## ⚙️ Variables d'environnement

```env
DATABASE_URL=postgresql://user:password@host:5432/movecash
JWT_SECRET=your_jwt_secret
RESEND_API_KEY=your_resend_key
PORT=5000
TZ=UTC
```

---

## 📁 Structure du projet

```
movecash/
├── server/
│   ├── routes/          # Routes API (auth, transactions, agents)
│   ├── controllers/     # Logique métier
│   ├── middlewares/     # Auth, rôles, gestion d'erreurs
│   ├── db/              # Connexion PostgreSQL + pool
│   └── index.js
├── frontend/
│   ├── src/
│   │   ├── pages/       # Dashboard, Login, Transactions
│   │   ├── components/  # UI réutilisables
│   │   └── context/     # Auth context
│   └── public/
└── README.md
```

---

## 🤝 Contribution

Les contributions sont les bienvenues, notamment pour :
- L'ajout de nouvelles paires de devises
- L'intégration d'une API de taux de change en temps réel
- Le développement de l'application mobile Flutter

---

## 📄 Licence

MIT © 2025 — Move Cash

---

> *"La distance ne devrait pas être un obstacle à l'accès à son argent."*

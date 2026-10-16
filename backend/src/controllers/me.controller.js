// controllers/me.controller.js
const service = require("../services/me.service");
const { handleError } = require("./clientAuth.controller");

// Enveloppe commune : succès → { success, data }, erreur métier → code HTTP adapté
const wrap = (fn, status = 200) => async (req, res) => {
  try {
    const data = await fn(req, res);
    if (res.headersSent) return;
    res.status(status).json(data === undefined ? { success: true } : { success: true, data });
  } catch (err) {
    handleError(res, err);
  }
};

const me = (req) => req.user.id;

module.exports = {
  // Profil
  getProfile:    wrap((req) => service.getProfile(me(req))),
  updateProfile: wrap((req) => service.updateProfile(me(req), req.body)),
  changePin:     wrap((req) => service.changePin(me(req), req.body)),
  checkPin:      wrap((req) => service.checkPin(me(req), req.body.pin)),
  forgotPin:     wrap(async (req, res) => {
    await service.forgotPin(me(req));
    res.clearCookie("mc_refresh", { path: "/api/auth" });
  }),
  exportData:    wrap((req) => service.exportData(me(req))),
  deleteAccount: wrap(async (req, res) => {
    await service.deleteAccount(me(req));
    res.clearCookie("mc_refresh", { path: "/api/auth" });
  }),

  // Mes numéros d'envoi
  listAccounts:  wrap((req) => service.accounts.list(me(req))),
  getAccount:    wrap((req) => service.accounts.get(me(req), req.params.id)),
  createAccount: wrap((req) => service.accounts.create(me(req), req.body), 201),
  updateAccount: wrap((req) => service.accounts.update(me(req), req.params.id, req.body)),
  deleteAccountEntry: wrap((req) => service.accounts.remove(me(req), req.params.id)),

  // Bénéficiaires
  listBeneficiaries:  wrap((req) => service.beneficiaries.list(me(req))),
  getBeneficiary:     wrap((req) => service.beneficiaries.get(me(req), req.params.id)),
  createBeneficiary:  wrap((req) => service.beneficiaries.create(me(req), req.body), 201),
  updateBeneficiary:  wrap((req) => service.beneficiaries.update(me(req), req.params.id, req.body)),
  deleteBeneficiary:  wrap((req) => service.beneficiaries.remove(me(req), req.params.id)),

  // Notifications
  listNotifications: wrap((req) => service.listNotifications(me(req), req.query)),
  markAllRead:       wrap((req) => service.markNotificationsRead(me(req))),
  markOneRead:       wrap((req) => service.markNotificationsRead(me(req), req.params.id)),

  // Historique et détail
  listTransactions: wrap((req) => service.listTransactions(me(req), req.query)),
  getTransaction:   wrap((req) => service.getTransaction(me(req), req.params.ref)),
};

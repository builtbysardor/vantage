const state = {
  refreshInterval: 15,
  notifications: { email: false, telegram: false, emailAddress: '', telegramChatId: '' },
  maintenanceMode: false,
};

module.exports = {
  getSettings: () => ({ ...state }),
  updateSettings: (patch) => { Object.assign(state, patch); return { ...state }; },
};

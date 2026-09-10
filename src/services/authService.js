import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', {
      identifier: email,
      password
    });
    return response.data;
  },

  registerDoctor: async (doctorData) => {
    // doctorData: { name, email, phoneNumber, password, confirmPassword }
    const response = await api.post('/auth/register', doctorData);
    return response.data;
  },

  requestReset: async (email, newPassword) => {
    const response = await api.post('/auth/request-reset', { email, newPassword });
    return response.data;
  },

  getAdminQuestion: async () => {
    const response = await api.get('/auth/admin-question');
    return response.data;
  },

  resetAdminPassword: async (answer, newPassword) => {
    const response = await api.post('/auth/reset-admin', { answer, newPassword });
    return response.data;
  }
};

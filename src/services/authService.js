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
  }
};

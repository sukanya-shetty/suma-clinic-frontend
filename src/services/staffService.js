import api from './api';

export const staffService = {
  getAllStaff: async () => {
    const response = await api.get('/staff/all');
    return response.data;
  },

  addStaff: async (staffData) => {
    // staffData: { name, email, phoneNumber, password, confirmPassword, role }
    const response = await api.post('/staff/add-staff', staffData);
    return response.data;
  },

  deleteStaff: async (id) => {
    const response = await api.delete(`/staff/${id}`);
    return response.data;
  },

  resetPassword: async (id, password) => {
    const response = await api.put(`/staff/${id}/reset-password`, { password });
    return response.data;
  },

  getActiveDoctors: async () => {
    const response = await api.get('/staff/doctors');
    return response.data;
  },

  getResetRequests: async () => {
    const response = await api.get('/staff/reset-requests');
    return response.data;
  },

  handleResetRequest: async (id, action) => {
    const response = await api.post(`/staff/reset-requests/${id}`, { action });
    return response.data;
  }
};

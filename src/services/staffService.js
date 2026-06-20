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
  }
};

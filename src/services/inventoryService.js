import api from './api';

export const inventoryService = {
  getAllMedicines: async () => {
    const response = await api.get('/inventory/medicines');
    return response.data;
  },

  addMedicine: async (medicineData) => {
    // medicineData: { name, price, quantity, expiryDate }
    const response = await api.post('/inventory/medicines', medicineData);
    return response.data;
  },

  updateMedicineStock: async (id, quantitySold) => {
    const response = await api.put(`/inventory/medicines/${id}/stock`, { quantitySold });
    return response.data;
  },

  getExpiringMedicines: async () => {
    const response = await api.get('/inventory/expiring');
    return response.data;
  },

  deleteMedicine: async (id) => {
    const response = await api.delete(`/inventory/medicines/${id}`);
    return response.data;
  },

  getAlerts: async () => {
    const response = await api.get('/inventory/alerts');
    return response.data;
  }
};

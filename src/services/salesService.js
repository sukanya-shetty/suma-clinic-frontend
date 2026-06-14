import api from './api';

export const salesService = {
  getAllSales: async (params) => {
    // params: { startDate, endDate, sale_type }
    const response = await api.get('/sales', { params });
    return response.data;
  },

  createSale: async (saleData) => {
    // saleData: { patient_id, medicine_id, quantity_sold, sale_type }
    const response = await api.post('/sales', saleData);
    return response.data;
  },

  getDailySalesSummary: async () => {
    const response = await api.get('/sales/daily');
    return response.data;
  }
};
export default salesService;

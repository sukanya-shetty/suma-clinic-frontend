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
  },

  dispensePrescription: async (dispenseData) => {
    // dispenseData: { visit_id, items: [ { prescription_id, dispensed_quantity } ], signature_ref }
    const response = await api.post('/sales/dispense', dispenseData);
    return response.data;
  },

  getAllBills: async () => {
    const response = await api.get('/sales/bills');
    return response.data;
  },

  getBillDetails: async (id) => {
    const response = await api.get(`/sales/bills/${id}`);
    return response.data;
  },

  getPendingBillingVisits: async () => {
    const response = await api.get('/sales/billing/pending/visits');
    return response.data;
  },

  getPendingBillingDetails: async (visitId) => {
    const response = await api.get('/sales/billing/pending', { params: { visit_id: visitId } });
    return response.data;
  },

  collectPayment: async (paymentData) => {
    const response = await api.post('/sales/billing/collect', paymentData);
    return response.data;
  },
};
export default salesService;

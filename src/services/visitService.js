import api from './api';

export const visitService = {
  createVisit: async (visitData) => {
    // visitData: { patient_id, visit_date, diagnosis, blood_pressure, temperature, notes }
    const response = await api.post('/visits', visitData);
    return response.data;
  },

  getPatientVisits: async (patientId) => {
    const response = await api.get(`/visits/${patientId}`);
    return response.data;
  },

  getRecentVisits: async () => {
    const response = await api.get('/visits/recent/all');
    return response.data;
  },

  updateVisit: async (id, visitData) => {
    const response = await api.put(`/visits/${id}`, visitData);
    return response.data;
  },

  deleteVisit: async (id) => {
    const response = await api.delete(`/visits/${id}`);
    return response.data;
  },

  // Prescriptions methods integrated within visitService as requested by the 5 service files constraint
  createPrescription: async (prescriptionData) => {
    // prescriptionData: { visit_id, medicine_id, dosage, quantity, duration_days }
    const response = await api.post('/prescriptions', prescriptionData);
    return response.data;
  },

  getPrescriptionsByVisit: async (visitId) => {
    const response = await api.get(`/prescriptions/${visitId}`);
    return response.data;
  }
};

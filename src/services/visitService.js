import api from './api';

export const visitService = {
  createVisit: async (visitData) => {
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

  getVisitsCount: async () => {
    const response = await api.get('/visits/count/all');
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

  createPrescription: async (prescriptionData) => {
    const response = await api.post('/prescriptions', prescriptionData);
    return response.data;
  },

  getPrescriptionsByVisit: async (visitId) => {
    const response = await api.get(`/prescriptions/${visitId}`);
    return response.data;
  },

  deletePrescription: async (prescriptionId) => {
    const response = await api.delete(`/prescriptions/${prescriptionId}`);
    return response.data;
  },

  getRecentPrescriptions: async () => {
    const response = await api.get('/prescriptions/recent/all');
    return response.data;
  }
};

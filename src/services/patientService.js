import api from './api';

export const patientService = {
  getAllPatients: async () => {
    const response = await api.get('/patients');
    return response.data;
  },

  registerPatient: async (patientData) => {
    // patientData: { patient_name, phone_number, age, gender, address }
    const response = await api.post('/patients/register', patientData);
    return response.data;
  },

  searchPatients: async (params) => {
    // params: { name, phone }
    const response = await api.get('/patients/search', { params });
    return response.data;
  },

  updatePatient: async (id, patientData) => {
    const response = await api.put(`/patients/${id}`, patientData);
    return response.data;
  },

  deletePatient: async (id) => {
    const response = await api.delete(`/patients/${id}`);
    return response.data;
  },

  getPatientHistory: async (id) => {
    const response = await api.get(`/patients/${id}/history`);
    return response.data;
  }
};

import apiClient from './index'

// Função para criar uma nova clínica
export const createClinic = (clinicData) => {
  return apiClient.post('/clinics', clinicData)
}

export const updateClinic = (clinicData) => {
  return apiClient.put('/clinics', clinicData) //
}

export const getClinicSummary = (params) => {
  return apiClient.get('/clinics/summary', { params });
};

export const updateDoctorSignature = (data) => {
  return apiClient.put('/clinics/doctor-signature', data);
};

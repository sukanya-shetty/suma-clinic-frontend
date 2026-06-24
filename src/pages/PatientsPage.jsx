import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { patientService } from '../services/patientService';
import { staffService } from '../services/staffService';
import { AuthContext } from '../context/AuthContext';
import SearchBar from '../components/common/SearchBar';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import styles from './PatientsPage.module.css';

const PatientsPage = () => {
  const { user } = useContext(AuthContext);
  const isDoctor = user && user.role === 'Doctor';
  const isAdmin = user && user.role === 'Admin';

  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [doctorsList, setDoctorsList] = useState([]);
  const [patientForm, setPatientForm] = useState({
    patient_name: '',
    phone_number: '',
    age: '',
    gender: 'Male',
    address: '',
    weight: '',
    assigned_doctor_id: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Load doctors for patient assignment dropdown
  const loadDoctors = async () => {
    try {
      const res = await staffService.getActiveDoctors();
      const docs = res.doctors || [];
      setDoctorsList(docs);
      if (docs.length > 0) {
        setPatientForm(prev => ({
          ...prev,
          assigned_doctor_id: docs[0].user_id
        }));
      }
    } catch (err) {
      console.error('Failed to load doctors roster:', err);
    }
  };

  useEffect(() => {
    if (isModalOpen || isDoctor) {
      loadDoctors();
    }
  }, [isModalOpen]);

  // Handle opening modal from query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('openRegister') === 'true' && isDoctor) {
      setIsModalOpen(true);
    }
  }, [location, isDoctor]);

  // Load initially
  const loadPatients = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await patientService.getAllPatients();
      setPatients(data.patients || data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to retrieve patient registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  // Live Search trigger on type
  useEffect(() => {
    if (searchTerm.trim() === '') {
      loadPatients();
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const isNumeric = /^\d+$/.test(searchTerm.trim());
        let res;
        if (isNumeric) {
          res = await patientService.searchPatients({ phone: searchTerm.trim() });
        } else {
          res = await patientService.searchPatients({ name: searchTerm.trim() });
        }
        setPatients(res.patients || []);
      } catch (err) {
        console.error(err);
        setError('Error performing live patient search.');
      } finally {
        setLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const { patient_name, phone_number, age, gender, address, weight, assigned_doctor_id } = patientForm;

    // Validate inputs
    if (!patient_name || !age || !gender || !weight || !assigned_doctor_id) {
      setFormError('Please fill in all required fields (Name, Age, Gender, Weight, Assigned Doctor).');
      return;
    }

    const parsedAge = parseInt(age);
    if (isNaN(parsedAge) || parsedAge <= 0) {
      setFormError('Age must be a positive whole number.');
      return;
    }

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setFormError('Weight must be a positive number.');
      return;
    }

    if (phone_number && !/^\d{10}$/.test(phone_number)) {
      setFormError('Phone number must be exactly 10 digits.');
      return;
    }

    setFormLoading(true);
    try {
      const data = {
        patient_name: patient_name.trim(),
        phone_number: phone_number.trim() || null,
        age: parsedAge,
        gender,
        address: address.trim() || null,
        weight: parsedWeight,
        assigned_doctor_id: parseInt(assigned_doctor_id)
      };

      const res = await patientService.registerPatient(data);
      if (res.patient) {
        setFormSuccess('Patient registered successfully!');
        setPatientForm({
          patient_name: '',
          phone_number: '',
          age: '',
          gender: 'Male',
          address: '',
          weight: '',
          assigned_doctor_id: doctorsList.length > 0 ? doctorsList[0].user_id : ''
        });
        loadPatients();
        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess('');
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setFormError(err.response?.data?.error || err.response?.data?.message || 'Patient registration failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const patientHeaders = [
    { key: 'patient_name', label: 'Name' },
    { key: 'phone_number', label: 'Phone' },
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'weight', label: 'Weight (kg)' },
    { key: 'registration_date', label: 'Registered' },
    { key: 'actions', label: 'Actions' }
  ];

  const renderPatientRow = (patient, index) => {
    return (
      <tr key={patient.patient_id || index}>
        <td>
          <span style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate(`/patients/${patient.patient_id}`)}>
            {(patient.patient_name || 'UNKNOWN').toUpperCase()}
          </span>
        </td>
        <td>{patient.phone_number || 'N/A'}</td>
        <td>{patient.age} yrs</td>
        <td>{patient.gender}</td>
        <td>{patient.weight ? `${patient.weight} kg` : '-'}</td>
        <td>{patient.registration_date ? new Date(patient.registration_date).toLocaleDateString() : '-'}</td>
        <td>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => navigate(`/patients/${patient.patient_id}`)}
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
            >
              View Detail
            </button>
            {isDoctor && (
              <button 
                onClick={() => navigate(`/visits/new?patientId=${patient.patient_id}`)}
                className="btn btn-primary"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              >
                New Visit
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.patientCard}>
      <div className={styles.headerSection}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Patient Directory</h2>
        {isDoctor && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <UserPlus size={16} />
            <span>Register Patient</span>
          </button>
        )}
      </div>

      <div className={styles.controlsRow}>
        <SearchBar 
          placeholder="Search by name or 10-digit phone number..."
          value={searchTerm}
          onChange={setSearchTerm}
        />
        <button 
          className="btn btn-secondary" 
          onClick={() => { setSearchTerm(''); loadPatients(); }}
          style={{ width: '100%', height: '40px' }}
        >
          Reset List
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-inline" style={{ padding: '32px 0' }}>
          <span className="spinner"></span> Loading patient catalog...
        </div>
      ) : (
        <Table 
          headers={patientHeaders}
          data={patients}
          renderRow={renderPatientRow}
          emptyMessage="No patients found in directory matching criteria."
        />
      )}

      {/* ─── REGISTER PATIENT MODAL ─── */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setFormError(''); setFormSuccess(''); }}
        title="Register New Patient"
      >
        <form onSubmit={handleRegisterSubmit}>
          {formError && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{formError}</div>}
          {formSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>{formSuccess}</div>}

          <div className="form-group">
            <label htmlFor="patient_name">Patient Name *</label>
            <input 
              type="text" 
              id="patient_name"
              className="form-control"
              placeholder="e.g. John Doe"
              value={patientForm.patient_name}
              onChange={(e) => setPatientForm({ ...patientForm, patient_name: e.target.value })}
              disabled={formLoading}
              required
            />
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label htmlFor="age">Age (Years) *</label>
              <input 
                type="number" 
                id="age"
                className="form-control"
                placeholder="e.g. 34"
                value={patientForm.age}
                onChange={(e) => setPatientForm({ ...patientForm, age: e.target.value })}
                disabled={formLoading}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="gender">Gender *</label>
              <select 
                id="gender"
                className="form-control"
                value={patientForm.gender}
                onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                disabled={formLoading}
                required
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className={styles.formGrid}>
            <div className="form-group">
              <label htmlFor="weight">Weight (kg) *</label>
              <input 
                type="number" 
                step="0.1"
                id="weight"
                className="form-control"
                placeholder="e.g. 62.5"
                value={patientForm.weight}
                onChange={(e) => setPatientForm({ ...patientForm, weight: e.target.value })}
                disabled={formLoading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="assigned_doctor_id">Assigned Doctor *</label>
              <select 
                id="assigned_doctor_id"
                className="form-control"
                value={patientForm.assigned_doctor_id}
                onChange={(e) => setPatientForm({ ...patientForm, assigned_doctor_id: e.target.value })}
                disabled={formLoading}
                required
              >
                {doctorsList.map((doc) => (
                  <option key={doc.user_id} value={doc.user_id}>
                    {doc.name.toUpperCase()} ({doc.department || 'General Medicine'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone_number">Phone Number (10 Digits)</label>
            <input 
              type="tel" 
              id="phone_number"
              className="form-control"
              placeholder="e.g. 9876543210"
              value={patientForm.phone_number}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                if (val.length <= 10) {
                  setPatientForm({ ...patientForm, phone_number: val });
                }
              }}
              disabled={formLoading}
              maxLength={10}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Home Address</label>
            <textarea 
              id="address"
              className="form-control"
              placeholder="Enter patient full address"
              rows="3"
              value={patientForm.address}
              onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
              disabled={formLoading}
            />
          </div>

          <div className={styles.modalFooter}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => { setIsModalOpen(false); setFormError(''); setFormSuccess(''); }}
              disabled={formLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={formLoading}
            >
              {formLoading ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PatientsPage;

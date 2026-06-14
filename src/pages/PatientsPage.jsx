import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { patientService } from '../services/patientService';
import SearchBar from '../components/common/SearchBar';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import styles from './PatientsPage.module.css';

const PatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientForm, setPatientForm] = useState({
    patient_name: '',
    phone_number: '',
    age: '',
    gender: 'Male',
    address: ''
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  // Handle opening modal from query parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('openRegister') === 'true') {
      setIsModalOpen(true);
    }
  }, [location]);

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

    const { patient_name, phone_number, age, gender, address } = patientForm;

    // Validate inputs
    if (!patient_name || !age || !gender) {
      setFormError('Please fill in all required fields (Name, Age, Gender).');
      return;
    }

    const parsedAge = parseInt(age);
    if (isNaN(parsedAge) || parsedAge <= 0) {
      setFormError('Age must be a positive whole number.');
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
        address: address.trim() || null
      };

      const res = await patientService.registerPatient(data);
      if (res.patient) {
        setFormSuccess('Patient registered successfully!');
        setPatientForm({
          patient_name: '',
          phone_number: '',
          age: '',
          gender: 'Male',
          address: ''
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
            <button 
              onClick={() => navigate(`/visits/new?patientId=${patient.patient_id}`)}
              className="btn btn-primary"
              style={{ padding: '4px 8px', fontSize: '0.8rem' }}
            >
              New Visit
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className={styles.patientCard}>
      <div className={styles.headerSection}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Patient Directory</h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <UserPlus size={16} />
          <span>Register Patient</span>
        </button>
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

          <div className="form-group">
            <label htmlFor="phone_number">Phone Number (10 Digits)</label>
            <input 
              type="tel" 
              id="phone_number"
              className="form-control"
              placeholder="e.g. 9876543210"
              value={patientForm.phone_number}
              onChange={(e) => setPatientForm({ ...patientForm, phone_number: e.target.value })}
              disabled={formLoading}
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

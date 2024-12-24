const express = require('express');
const { getPatients, registerPatient, updatePatientStatus, getPatientInfo, updatePatient, getPatientTraceability, logDownloadAction } = require('../controllers/patientController');
const authMiddleware = require('../middlewares/authMiddleware');
const router = express.Router();

// Rutas específicas primero
router.get('/:idPaciente/download', authMiddleware, logDownloadAction);
router.get('/:id/traceability', getPatientTraceability);
router.get('/:id', authMiddleware, getPatientInfo); // Obtener información de un paciente
router.patch('/:id', authMiddleware, updatePatientStatus); // Actualizar el estado del paciente
router.put('/:id', authMiddleware, updatePatient); // Actualizar datos de un paciente
router.post('/', authMiddleware, registerPatient);// Registrar un nuevo paciente
router.get('/', getPatients); // Obtener todos los pacientes

module.exports = router;

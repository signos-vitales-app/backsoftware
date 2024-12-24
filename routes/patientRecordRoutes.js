const express = require('express');
const { getPatientRecords, createPatientRecord, getPatientHistory, getPatientRecord, updatePatientRecord, getPatientHistoryRecords,} = require('../controllers/patientRecordController');
const router = express.Router();
const  authMiddleware = require('../middlewares/authMiddleware');

// Coloca las rutas más específicas antes de las generales
router.get('/record/:idRegistro', authMiddleware, getPatientRecord); // Obtener un registro específico
router.put('/record/:idRegistro', authMiddleware, updatePatientRecord); // Actualizar un registro
router.get('/records/:idPaciente', authMiddleware, getPatientRecords); // Ruta para obtener registros de un paciente específico
router.get('/history/:idPaciente', getPatientHistory); // Obtener historial completo
router.post('/records', authMiddleware, createPatientRecord); // Ruta para crear un registro de paciente
router.get('/patient-history/:idPaciente',getPatientHistoryRecords); // Rutas de historial de signos vitales

module.exports = router;

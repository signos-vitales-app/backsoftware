const express = require('express');
const { getTraceabilityLogs, getTraceabilityById, getPatientTraceability } = require('../controllers/traceabilityController'); // Cambia a controladores
const router = express.Router();

// Ruta para obtener todos los logs de trazabilidad
router.get('/', getTraceabilityLogs);

// Ruta para obtener un log específico de trazabilidad por ID
router.get('/:id', getTraceabilityById);

// Ruta para obtener trazabilidad específica de un paciente
router.get('/patient/:id', getPatientTraceability);

module.exports = router;
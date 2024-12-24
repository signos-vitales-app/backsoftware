const { getTraceabilityLogsModel, getTraceabilityByIdModel, getPatientTraceabilityModel } = require('../models/traceModel');

// Controlador para obtener todos los logs de trazabilidad
const getTraceabilityLogs = async (req, res) => {
    try {
        const logs = await getTraceabilityLogsModel();
        res.status(200).json({ records: logs });
    } catch (error) {
        console.error('Error al obtener los logs de trazabilidad:', error);
        res.status(500).json({ message: 'Error al obtener los logs de trazabilidad' });
    }
};

// Controlador para obtener un log específico de trazabilidad por ID
const getTraceabilityById = async (req, res) => {
    const { id } = req.params; // Obtén el parámetro ID de la solicitud
    console.log("ID recibido en el controlador:", id); // Log para verificar el ID recibido

    if (isNaN(id)) {
        return res.status(400).json({ message: 'El ID debe ser un número válido.' });
    }

    try {
        const log = await getTraceabilityByIdModel(id); // Llama a la función del modelo
        if (!log) {
            return res.status(404).json({ message: 'Registro de trazabilidad no encontrado.' });
        }
        res.status(200).json(log);
    } catch (error) {
        console.error('Error al obtener el registro de trazabilidad por ID:', error);
        res.status(500).json({ message: 'Error al obtener el registro de trazabilidad' });
    }
};

// Controlador para obtener trazabilidad específica de un paciente
const getPatientTraceability = async (req, res) => {
    const { id } = req.params; // Obtén el parámetro ID del paciente
    console.log("ID del paciente recibido:", id); // Log para depuración

    if (isNaN(id)) {
        return res.status(400).json({ message: 'El ID debe ser un número válido.' });
    }

    try {
        const traceability = await getPatientTraceabilityModel(id);
        if (traceability.length === 0) {
            return res.status(404).json({ message: 'No se encontraron registros de trazabilidad para este paciente.' });
        }
        res.status(200).json(traceability);
    } catch (error) {
        console.error('Error al obtener la trazabilidad del paciente:', error);
        res.status(500).json({ message: 'Error al obtener la trazabilidad del paciente' });
    }
};

module.exports = {
    getTraceabilityLogs,
    getTraceabilityById,
    getPatientTraceability
};
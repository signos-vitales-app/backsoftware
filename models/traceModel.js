const db = require('../config/db');

// Modelo para obtener todos los logs de trazabilidad
const getTraceabilityLogsModel = async () => {
    const [logs] = await db.query('SELECT * FROM trazabilidad ORDER BY fecha_hora DESC');
    return logs;
};

// Modelo para obtener un log específico de trazabilidad por ID
const getTraceabilityByIdModel = async (id) => {
    const [rows] = await db.query('SELECT * FROM trazabilidad WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
};

// Modelo para obtener trazabilidad específica de un paciente
const getPatientTraceabilityModel = async (patientId) => {
    try {
        const [rows] = await db.query(
            `SELECT * FROM trazabilidad WHERE entidad_id = ? ORDER BY fecha_hora DESC`,
            [patientId]
        );
        return rows;
    } catch (error) {
        console.error('Error al obtener la trazabilidad del paciente:', error);
        throw error;
    }
};

module.exports = {
    getTraceabilityLogsModel,
    getTraceabilityByIdModel,
    getPatientTraceabilityModel
};
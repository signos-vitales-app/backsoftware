const { registrarTrazabilidad } = require('../models/traceModel'); 
const db = require('../config/db'); // Requiere la base de datos

// Función para calcular el grupo de edad basado en la fecha de nacimiento
function calculateAgeGroup(fechaNacimiento) {
    const birth = new Date(fechaNacimiento);
    const today = new Date();

    const ageInMonths =
        (today.getFullYear() - birth.getFullYear()) * 12 +
        (today.getMonth() - birth.getMonth()) -
        (today.getDate() < birth.getDate() ? 1 : 0); // Ajuste si no ha pasado el día del mes

    if (ageInMonths >= 0 && ageInMonths <= 3) return 'Recién nacido';
    if (ageInMonths > 3 && ageInMonths <= 6) return 'Lactante temprano';
    if (ageInMonths > 6 && ageInMonths <= 12) return 'Lactante mayor';
    if (ageInMonths > 12 && ageInMonths <= 36) return 'Niño pequeño';
    if (ageInMonths > 36 && ageInMonths <= 72) return 'Preescolar temprano';
    if (ageInMonths > 72 && ageInMonths <= 180) return 'Preescolar tardío';
    return 'Adulto';
}

exports.getPatients = async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM patients");
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener pacientes:", error);
        res.status(500).json({ message: "Error al obtener pacientes" });
    }
};

// Función para formatear fechas a DD/MM/YYYY
const formatFecha = (fecha) => {
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return fecha; // Devuelve la fecha original si no es válida
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

// Función para registrar un paciente
exports.registerPatient = async (req, res) => {
    const {
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        numero_identificacion,
        fecha_nacimiento,
        tipo_identificacion,
        ubicacion,
        status,
        created_at,
    } = req.body;

    // Validaciones iniciales
    if (!numero_identificacion || !fecha_nacimiento) {
        return res.status(400).json({ message: "Identificación y fecha de nacimiento son obligatorios" });
    }

    const age_group = calculateAgeGroup(fecha_nacimiento);

    if (!req.user || !req.user.username) {
        return res.status(401).json({ message: 'Usuario no autenticado o token inválido' });
    }

    const responsable_id = req.user.id;
    const responsable_username = req.user.username;

    try {
        // Asignar valor por defecto a created_at si no está presente
        const finalCreatedAt = created_at || new Date(); // Si no se pasa, se usa la fecha actual

        // Inserción en la tabla de pacientes
        const [result] = await db.query(
            `INSERT INTO patients 
            (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, numero_identificacion, 
            fecha_nacimiento, tipo_identificacion, ubicacion, status, created_at, age_group, responsable_username) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                primer_nombre,
                segundo_nombre,
                primer_apellido,
                segundo_apellido,
                numero_identificacion,
                fecha_nacimiento,
                tipo_identificacion,
                ubicacion,
                status || 'activo',
                finalCreatedAt, // Usamos la fecha de creación asignada
                age_group,
                responsable_username,
            ]
        );

        if (!result || result.affectedRows === 0) {
            throw new Error("No se pudo registrar el paciente en la base de datos.");
        }

        console.log(`Registrando trazabilidad para el paciente con ID: ${result.insertId}`);

        // Registro de trazabilidad
        const trazabilidad = {
            mensaje: 'Paciente creado exitosamente.',
            datos_creados: {
                primer_nombre,
                segundo_nombre,
                primer_apellido,
                segundo_apellido,
                tipo_identificacion,
                numero_identificacion,
                fecha_nacimiento: formatFecha(fecha_nacimiento), // Formato DD/MM/YYYY
                ubicacion,
                status: status || 'activo',
                created_at: finalCreatedAt, // Asegúrate de pasar la fecha final aquí también
                age_group,
                responsable_username,
            }
        };

        // Registro de trazabilidad para la creación de un paciente
        await db.query(
            `INSERT INTO trazabilidad 
            (usuario_id, usuario_nombre, accion, entidad_id, datos_nuevos, fecha_hora, tipo_accion) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                responsable_id, // ID del usuario
                responsable_username, // Nombre del usuario
                'Creación', // Acción
                result.insertId, // ID del paciente
                JSON.stringify(trazabilidad.datos_creados), // Datos creados con fechas formateadas
                new Date(), // Fecha y hora
                'Paciente' // Tipo de acción
            ]
        );

        // Respuesta exitosa
        res.status(201).json({ message: 'Paciente registrado exitosamente' });
    } catch (error) {
        console.error('Error al registrar paciente:', error);
        res.status(500).json({ message: 'Error al registrar paciente' });
    }
};

// Función para actualizar información de un paciente
exports.updatePatient = async (req, res) => {
    const { id } = req.params;
    const nuevosDatos = req.body;

    // Validar que el usuario esté autenticado
    if (!req.user || !req.user.username) {
        return res.status(401).json({ message: 'Usuario no autenticado o token inválido' });
    }

    const responsable_registro = req.user.username;

    try {
        // Obtener datos actuales del paciente
        const [pacienteAntiguo] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
        if (!pacienteAntiguo || pacienteAntiguo.length === 0) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const pacienteActual = pacienteAntiguo[0];

        // Generar datos actualizados con soporte para campos opcionales
        const datosActualizados = {
            primer_nombre: nuevosDatos.primer_nombre ?? pacienteActual.primer_nombre,
            segundo_nombre: nuevosDatos.segundo_nombre ?? pacienteActual.segundo_nombre,
            primer_apellido: nuevosDatos.primer_apellido ?? pacienteActual.primer_apellido,
            segundo_apellido: nuevosDatos.segundo_apellido ?? pacienteActual.segundo_apellido,
            numero_identificacion: nuevosDatos.numero_identificacion ?? pacienteActual.numero_identificacion,
            tipo_identificacion: nuevosDatos.tipo_identificacion ?? pacienteActual.tipo_identificacion,
            ubicacion: nuevosDatos.ubicacion ?? pacienteActual.ubicacion,
            status: nuevosDatos.status ?? pacienteActual.status,
            fecha_nacimiento: nuevosDatos.fecha_nacimiento ?? pacienteActual.fecha_nacimiento,
            age_group: calculateAgeGroup(nuevosDatos.fecha_nacimiento ?? pacienteActual.fecha_nacimiento),
            responsable_username: responsable_registro,
        };

        // Actualizar los datos en la base de datos
        const [result] = await db.query(
            `UPDATE patients 
            SET primer_nombre = ?, segundo_nombre = ?, primer_apellido = ?, segundo_apellido = ?, 
                numero_identificacion = ?, tipo_identificacion = ?, ubicacion = ?, status = ?, 
                fecha_nacimiento = ?, age_group = ?, responsable_username = ? 
            WHERE id = ?`,
            [
                datosActualizados.primer_nombre,
                datosActualizados.segundo_nombre,
                datosActualizados.primer_apellido,
                datosActualizados.segundo_apellido,
                datosActualizados.numero_identificacion,
                datosActualizados.tipo_identificacion,
                datosActualizados.ubicacion,
                datosActualizados.status,
                datosActualizados.fecha_nacimiento,
                datosActualizados.age_group,
                datosActualizados.responsable_username,
                id,
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        // Comparar datos antiguos con los nuevos para identificar cambios
        const cambios = {};
        for (const key in nuevosDatos) {
            if (key === 'fecha_nacimiento') {
                const nuevoValor = new Date(nuevosDatos[key]).toISOString().split('T')[0];
                const valorAntiguo = new Date(pacienteActual[key]).toISOString().split('T')[0];
                if (nuevoValor !== valorAntiguo) {
                    cambios[key] = nuevosDatos[key];
                }
                continue;
            }

            if (key === 'edad') continue; // Excluir campo 'edad'

            if (nuevosDatos[key] !== pacienteActual[key]) {
                cambios[key] = nuevosDatos[key];
            }
        }

        // Agregar el responsable de la actualización a los datos nuevos
        cambios['responsable_username'] = responsable_registro;

        // Registrar los cambios en trazabilidad
        await db.query(
            `INSERT INTO trazabilidad 
            (usuario_id, usuario_nombre, accion, entidad_id, datos_antiguos, datos_nuevos, fecha_hora, tipo_accion) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                responsable_registro,
                'Actualización de datos del paciente',
                id,
                JSON.stringify(pacienteActual),
                JSON.stringify(cambios),
                new Date(),
                'Paciente',
            ]
        );

        // Registrar el historial completo del paciente
        await db.query(
            `INSERT INTO historial_paciente
            (id_paciente, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
            numero_identificacion, tipo_identificacion, ubicacion, status, fecha_nacimiento,
            age_group, responsable_registro, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                id,
                datosActualizados.primer_nombre,
                datosActualizados.segundo_nombre,
                datosActualizados.primer_apellido,
                datosActualizados.segundo_apellido,
                datosActualizados.numero_identificacion,
                datosActualizados.tipo_identificacion,
                datosActualizados.ubicacion,
                datosActualizados.status,
                datosActualizados.fecha_nacimiento,
                datosActualizados.age_group,
                responsable_registro,
            ]
        );

        res.json({ message: "Paciente actualizado exitosamente y registrado en el historial y trazabilidad" });
    } catch (error) {
        console.error("Error al actualizar paciente:", error);
        res.status(500).json({ message: "Error al actualizar paciente" });
    }
};

// Actualizar estado de un paciente
exports.updatePatientStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        // Obtener información completa del paciente
        const [existingPatient] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
        if (!existingPatient || existingPatient.length === 0) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const estadoAnterior = existingPatient[0].status;

        // Agregar el responsable del estado anterior
        const datosAntiguos = {
            estadoAnterior,
            nombre: `${existingPatient[0].primer_nombre} ${existingPatient[0].segundo_nombre || ''} ${existingPatient[0].primer_apellido} ${existingPatient[0].segundo_apellido || ''}`.trim(),
            numero_identificacion: existingPatient[0].numero_identificacion,
            responsable: existingPatient[0].responsable_username || "No disponible", // Responsable previo
        };

        // Actualizar estado del paciente
        await db.query("UPDATE patients SET status = ?, responsable_username = ? WHERE id = ?", [status, req.user.username, id]);

        // Información del paciente para trazabilidad
        const datosNuevos = {
            estadoNuevo: status,
            nombre: datosAntiguos.nombre,
            numero_identificacion: datosAntiguos.numero_identificacion,
            responsable: req.user.username, // Responsable del cambio
        };

        // Registrar trazabilidad
        await db.query(
            `INSERT INTO trazabilidad 
            (usuario_id, usuario_nombre, accion, entidad_id, datos_antiguos, datos_nuevos, fecha_hora, tipo_accion) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id, // ID del usuario responsable
                req.user.username, // Nombre del usuario
                `Cambio de estado del paciente`, // Acción explícita
                id, // ID del paciente
                JSON.stringify(datosAntiguos), // Estado anterior y datos del paciente
                JSON.stringify(datosNuevos), // Nuevo estado, datos del paciente, y responsable
                new Date(), // Fecha y hora
                "Paciente" // Tipo de acción
            ]
        );

        res.json({ message: "Estado del paciente actualizado exitosamente" });
    } catch (error) {
        console.error("Error al actualizar el estado del paciente:", error);
        res.status(500).json({ message: "Error al actualizar el estado del paciente" });
    }
};

// Obtener información de un paciente específico
exports.getPatientInfo = async (req, res) => {
    const { id } = req.params;

    try {
        const [patient] = await db.query("SELECT * FROM patients WHERE id = ?", [id]);
        if (patient.length === 0) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }
        res.json(patient[0]);
    } catch (error) {
        console.error("Error al recuperar la información del paciente:", error);
        res.status(500).json({ message: "Error al recuperar la información del paciente" });
    }
};

// Método para obtener logs de trazabilidad
exports.getPatientTraceability = async (req, res) => {
    const { id } = req.params;

    try {
        const [logs] = await db.query(
            `SELECT * FROM trazabilidad 
            WHERE entidad_id = ? 
            ORDER BY fecha_hora DESC`,
            [id]
        );

        if (logs.length === 0) {
            return res.status(404).json({ message: "No se encontraron logs de trazabilidad para este paciente" });
        }

        // Parsear datos JSON para mayor legibilidad
        const logsFormateados = logs.map(log => ({
            ...log,
            datos_antiguos: log.datos_antiguos ? JSON.parse(log.datos_antiguos) : null,
            datos_nuevos: log.datos_nuevos ? JSON.parse(log.datos_nuevos) : null
        }));

        res.json(logsFormateados);
    } catch (error) {
        console.error("Error al recuperar trazabilidad del paciente:", error);
        res.status(500).json({ message: "Error al recuperar logs de trazabilidad" });
    }
};

// Registro de quien descarga el PDF
exports.logDownloadAction = async (req, res) => {
    const { idPaciente } = req.params;

    try {
        if (!idPaciente) {
            return res.status(400).json({ message: "El ID del paciente es obligatorio." });
        }

        // Obtener los datos del paciente
        const [patient] = await db.query("SELECT * FROM patients WHERE id = ?", [idPaciente]);

        if (!patient.length) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }

        const paciente = patient[0];

        // Función para formatear fecha manualmente a DD/MM/YYYY
        const formatFechaSinHora = (fecha) => {
            if (!fecha) return "No disponible";
        
            const date = new Date(fecha);
            if (isNaN(date.getTime())) return "No disponible";
        
            const day = String(date.getDate()).padStart(2, "0");
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = date.getFullYear();
        
            return `${day}/${month}/${year}`;
        };

        // Formatear datos antes de enviarlos al frontend
        const datosFormateados = {
            primer_nombre: paciente.primer_nombre,
            segundo_nombre: paciente.segundo_nombre,
            primer_apellido: paciente.primer_apellido,
            segundo_apellido: paciente.segundo_apellido,
            tipo_identificacion: paciente.tipo_identificacion,
            numero_identificacion: paciente.numero_identificacion,
            fecha_nacimiento: formatFechaSinHora(paciente.fecha_nacimiento), // Sin hora
            ubicacion: paciente.ubicacion,
            status: paciente.status,
            created_at: formatFechaSinHora(paciente.created_at), // Aquí enviamos solo la fecha
            age_group: paciente.age_group,
            responsable_username: paciente.responsable_username,
        };

        // Registrar la acción de descarga en la trazabilidad
        await db.query(
            `INSERT INTO trazabilidad 
            (usuario_id, usuario_nombre, accion, entidad_id, datos_nuevos, fecha_hora, tipo_accion) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id, // ID del usuario
                req.user.username, // Nombre del usuario
                "Descarga de PDF", // Acción
                idPaciente, // ID del paciente
                JSON.stringify(datosFormateados), // Datos formateados
                new Date(), // Fecha y hora
                "Paciente" // Tipo de acción
            ]
        );

        // Responder al frontend
        res.status(200).json({
            message: "Acción de descarga registrada.",
            usuario_nombre: req.user.username,
            paciente: datosFormateados,
        });

    } catch (error) {
        console.error("Error al registrar la acción de descarga:", error);
        res.status(500).json({ message: "Error al registrar la acción de descarga." });
    }
};
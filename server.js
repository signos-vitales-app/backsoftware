const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const patientRecordRoutes = require('./routes/patientRecordRoutes');
const traceabilityRoutes = require('./routes/traceabilityRoutes');

const app = express();
app.use('/uploads', express.static('uploads'));
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);  // Rutas de autenticación
app.use('/api/users', userRoutes); // Rutas de gestión de usuarios
app.use('/api/patients', patientRoutes); // rutas de gestion de pacientes
app.use('/api/patient-records', patientRecordRoutes); // rutas de gestion de registro de pacientes
app.use('/api/traceability', traceabilityRoutes); // Trazabilidad general

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
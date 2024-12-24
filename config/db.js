const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const poolPromise = pool.promise();

// función para verificar la conexión
const checkConnection = async () => {
    try {
        const connection = await poolPromise.getConnection();
        console.log('Conectado exitosamente a la base de datos');
        connection.release(); 
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error);
    }
};

// llamada para verificar la conexión
checkConnection();

module.exports = poolPromise;

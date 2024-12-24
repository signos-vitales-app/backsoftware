const nodemailer = require('nodemailer'); //requiere nodemailer para el envio de correos electronicos
require('dotenv').config();

//Proceso para buscar los datos en el archivo .env
const transporter = nodemailer.createTransport({
    service: 'gmail',  
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.GMAIL_API_KEY
    }
});

module.exports = transporter;

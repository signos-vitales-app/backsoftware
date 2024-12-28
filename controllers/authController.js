const jwt = require('jsonwebtoken'); //utiliza json para el token 
const transporter = require('../config/nodemailer'); //requiere nodemailer para el envio de correos electronicos 
const crypto = require('crypto'); //encripta la contraseña 
const User = require('../models/User'); //requiere el modelo del uusario para poder registarlos 
const bcrypt = require('bcryptjs'); // encrita de igual manera los atos 
const multer = require('multer');
const path = require('path');
const db = require('../config/db');

// Configuración de multer para el almacenamiento de imágenes
const storage = multer.diskStorage({
    destination: 'uploads/profile-images/',
    filename: function(req, file, cb) {
        // Crear un nombre único para la imagen: timestamp-username.extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB
    },
    fileFilter: function(req, file, cb) {
        const filetypes = /jpeg|jpg|png/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Error: Solo se permiten archivos de imagen!'));
    }
});
// Función de registro de usuario con correo de bienvenida
exports.register = async (req, res) => {
    try {
        upload.single('profileImage')(req, res, async function(err) {
            if (err) {
                return res.status(400).json({ message: err.message });
            }

            const { username, password, email, role, numero_identificacion } = req.body;
            const profileImage = req.file ? req.file.filename : null;

            // Verificar si el usuario o el correo ya existen
            const existingUser = await User.findByUsername(username);
            const existingEmail = await User.findByEmail(email);
            const existingNumeroIdentificacion = await User.findByNumeroIdentificacion(numero_identificacion);

            if (existingUser) return res.status(400).json({ message: "El nombre de usuario ya está en uso" });
            if (existingEmail) return res.status(400).json({ message: "El correo electrónico ya está en uso" });
            if (existingNumeroIdentificacion) return res.status(400).json({ message: "Número de identificación ya está registrado" });
            
            // Crear el nuevo usuario con la imagen de perfil
            const userId = await User.createUser({
                username,
                password,
                email,
                role,
                profile_image: profileImage,
                numero_identificacion
            });

            // Mapeo de roles para mostrarlos en un formato más bonito
            const roleNames = {
                user: 'enfermero/a',
                staff: 'médico/a',
                jefe: 'jefe de Enfermería',
            };

            const roleDisplay = roleNames[role] || 'Usuario';

            // Enviar correo de bienvenida
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Bienvenido al sistema de gestión de pacientes",
                html: `<p>Hola ${username},</p>
                       <p>¡Bienvenido/a! Tu cuenta se ha creado correctamente con el rol de ${roleDisplay}.</p>
                       <p>Gracias por registrarte con nosotros.</p>`
            });

            res.status(201).json({ 
                message: "Usuario registrado exitosamente, correo electrónico de bienvenida enviado", 
                userId,
                profileImage 
            });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};
// Función de inicio de sesión
exports.login = async (req, res) => {
    try {
        const { numero_identificacion, password } = req.body;

        const [rows] = await db.query(
            "SELECT id, username, numero_identificacion, password, role, is_active FROM users WHERE numero_identificacion = ?",
            [numero_identificacion]
        );

        if (rows.length === 0) {
            return res.status(401).json({ message: "Credenciales invalidas" });
        }

        const user = rows[0];

        if (!user.is_active) {
            return res.status(403).json({ message: "El usuario está deshabilitado. Póngase en contacto con el administrador." });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: "Credenciales invalidas" });
        }

        // Crear token incluyendo el id del usuario
        const token = jwt.sign(
            { 
                id: user.id,
                username:user.username,
                numero_identificacion: user.numero_identificacion,
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            role: user.role,
            username:user.username,
            numero_identificacion: user.numero_identificacion,
            id: user.id
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Función de restablecimiento de contraseña
exports.resetPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findByEmail(email);
        if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

        const token = crypto.randomBytes(32).toString('hex');
        await User.saveResetToken(user.id, token);

        // Cambia el enlace para que apunte al frontend
        const serverUrl = `${req.protocol}://${req.get('host')}`;
        const resetLink = `https://frontsoftware-6n8d.onrender.com/reset-password/${token}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Solicitud de restablecimiento de contraseña",
            html: `<p>Click <a href="${resetLink}">aquí</a> para restablecer tu contraseña. El enlace es válido por 1 hora.</p>`
        });

        res.status(200).json({ message: "Correo electrónico de restablecimiento de contraseña enviado" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Nueva función `verifyResetToken` en `authController.js`
exports.verifyResetToken = async (token) => {
    try {
        const user = await User.findByResetToken(token);
        return user;
    } catch (error) {
        throw new Error("Token no válido o caducado");
    }
};

// Función para actualizar la contraseña (después de la verificación del token)
exports.updatePassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        // Aquí debes verificar el token y asociarlo con el usuario
        const user = await exports.verifyResetToken(token); // Función que verifica el token y obtiene al usuario

        if (!user) {
            return res.status(400).json({ message: "Token no válido o caducado" });
        }

        // Encripta la nueva contraseña y actualízala en la base de datos
        await User.updatePassword(user.id, newPassword);

        res.status(200).json({ message: "Contraseña actualizada exitosamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};


exports.getUserInfo = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const [rows] = await db.query(
            "SELECT id, username, email, role, profile_image, numero_identificacion FROM users WHERE id = ?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        const user = rows[0];
        res.json(user);
    } catch (error) {
        console.error('Error in getUserInfo:', error);
        res.status(500).json({ message: "Error en el servidor", error: error.message });
    }
};

//cambiar la foto de perfil
exports.updateProfileImage = async (req, res) => {
    console.log("Entrando a updateProfileImage");
    try {
        upload.single('profileImage')(req, res, async function (err) {
            if (err) return res.status(400).json({ message: err.message });

            const userId = req.user.id;
            const profileImage = req.file ? req.file.filename : null;

            if (!profileImage) {
                return res.status(400).json({ message: "No se proporcionó una imagen válida." });
            }

            // Actualizar la base de datos
            await db.query("UPDATE users SET profile_image = ? WHERE id = ?", [profileImage, userId]);

            res.status(200).json({ message: "Imagen de perfil actualizada exitosamente", profileImage });
        });
    } catch (error) {
        console.error('Error al actualizar la imagen de perfil:', error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};
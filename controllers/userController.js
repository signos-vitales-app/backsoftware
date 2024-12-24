const db = require('../config/db'); //requiere la base de datos

// Obtener lista de usuarios
exports.getUsers = async (req, res) => {
    try {
        const [users] = await db.query("SELECT id, username, email, role, numero_identificacion, is_active FROM users");
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Habilitar o deshabilitar usuario
exports.toggleUserStatus = async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    try {
        await db.query("UPDATE users SET is_active = ? WHERE id = ?", [is_active, id]);
        res.status(200).json({ message: `User ${is_active ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Eliminar usuario
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query("DELETE FROM users WHERE id = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.status(200).json({ message: "Usuario eliminado exitosamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al eliminar el usuario" });
    }
};

// Obtener usuario por ID para edición
exports.getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const [users] = await db.query("SELECT id, username, email, role, numero_identificacion FROM users WHERE id = ?", [id]);
        if (users.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.status(200).json(users[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error en el servidor" });
    }
};

// Actualizar información del usuario
exports.updateUserDetails = async (req, res) => {
    const { id } = req.params;
    const { username, email, role, numero_identificacion } = req.body;

    try {
        // Verificar si el usuario existe
        const checkUserQuery = `SELECT * FROM users WHERE id = ?`;
        const [user] = await db.query(checkUserQuery, [id]);

        if (user.length === 0) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Actualizar usuario
        const query = `UPDATE users SET username = ?, email = ?, role = ?, numero_identificacion = ? WHERE id = ?`;
        const [result] = await db.query(query, [username, email, role, numero_identificacion, id]);

        res.status(200).json({ message: "Usuario actualizado exitosamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error al actualizar el usuario" });
    }
};

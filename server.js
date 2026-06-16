const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

// Crear la aplicación Express
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

//hacemos que el servidor sirva los archivos estáticos de la carpeta actual
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("Error al abrir la base de datos:", err.message);
    else console.log("Conectado a la base de datos SQLite.");
});

//Inicializamos la base de datos y creamos las tablas si no existen
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        passwd TEXT
    )`);
    const insertAdmin = db.prepare(`INSERT OR IGNORE INTO usuarios (id, name, email, passwd) VALUES (?, ?, ?, ?)`);
    insertAdmin.run(1, 'Administrador', 'admin@mycompany.com', 'admin123');
    insertAdmin.finalize();

    db.run(`CREATE TABLE IF NOT EXISTS sesiones (
        session_id TEXT PRIMARY KEY,
        user_id INTEGER,
        FOREIGN KEY(user_id) REFERENCES usuarios(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE
    )`);
    const insertCat = db.prepare(`INSERT OR IGNORE INTO categorias (id, nombre) VALUES (?, ?)`);
    insertCat.run(1, 'Acción');
    insertCat.run(2, 'Documentales');
    insertCat.finalize();

    db.run(`CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT,
        url TEXT,
        categoria_nombre TEXT,
        FOREIGN KEY(categoria_nombre) REFERENCES categorias(nombre) ON DELETE CASCADE
    )`);
});

// Middleware (Programa interno antes de crear o borrar se pasa por aquí) para verificar la sesión del usuario
const checkAuth = (req, res, next) => {
    const sessionId = req.params.session_id || req.body.session_id;
    if (!sessionId) return res.status(401).json({ error: "Sesión no proporcionada" });

    db.get(`SELECT user_id FROM sesiones WHERE session_id = ?`, [sessionId], (err, session) => {
        if (err || !session) return res.status(401).json({ error: "Sesión caducada o inválida" });
        req.user_id = session.user_id;
        next(); 
    });
};

//login y logout
app.post('/login', (req, res) => {
    const { user, passwd } = req.body; 
    // Buscamos al usuario por email o nombre y contraseña
    db.get(`SELECT * FROM usuarios WHERE (email = ? OR name = ?) AND passwd = ?`, [user, user, passwd], (err, row) => {
        // Si hay un error en la consulta, devolvemos un error 500
        if (err) return res.status(500).json({ error: "Error interno" });
        if (row) {
            // Si el usuario existe y la contraseña es correcta, generamos un nuevo ID de sesión y lo guardamos en la tabla de sesiones
            const sessionId = uuidv4();
            // Insertamos la nueva sesión en la base de datos
            db.run(`INSERT INTO sesiones (session_id, user_id) VALUES (?, ?)`, [sessionId, row.id], (insertErr) => {
                if (insertErr) return res.status(500).json({ error: "Error al crear la sesión" });
                // Devolvemos el ID de sesión y el nombre del usuario al cliente
                res.json({ session_id: sessionId, name: row.name });
            });
        } else {
            res.status(401).json({ error: "Usuario o contraseña incorrectos" });
        }
    });
});

// Endpoint para cerrar sesión
app.put('/logout', (req, res) => {
    const { session_id } = req.body;
    // Eliminamos la sesión de la base de datos
    db.run(`DELETE FROM sesiones WHERE session_id = ?`, [session_id], (err) => {
        // Si hay un error al eliminar la sesión, devolvemos un error 500
        if (err) return res.status(500).json({ error: "Error al cerrar sesión" });
        res.json({ message: "Sesión cerrada con éxito" });
    });
});

//app.get para obtener la lista de usuarios
app.get('/users/:session_id', checkAuth, (req, res) => {
    db.all(`SELECT id, name, email, passwd FROM usuarios`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error en DB" });
        res.json(rows);
    });
});
//app.post para crear un nuevo usuario
app.post('/user', checkAuth, (req, res) => {
    const { name, email, passwd } = req.body;
    // Insertamos el nuevo usuario en la base de datos
    db.run(`INSERT INTO usuarios (name, email, passwd) VALUES (?, ?, ?)`, [name, email, passwd], function(err) {
        if (err) return res.status(500).json({ error: "El email ya existe" });
        res.json({ id: this.lastID, name: name, email: email });
    });
});
//app.put para modificar un usuario existente
app.put('/user/:session_id/:id', checkAuth, (req, res) => {
    const { name, email, passwd } = req.body;
    db.run(`UPDATE usuarios SET name = ?, email = ?, passwd = ? WHERE id = ?`, [name, email, passwd, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: "Error al actualizar usuario" });
        res.json({ message: "Usuario modificado" });
    });
});
//app.delete para borrar un usuario existente
app.delete('/user/:session_id/:id', checkAuth, (req, res) => {
    if (req.params.id == 1) return res.status(403).json({ error: "No puedes borrar al admin principal" });
    db.run(`DELETE FROM usuarios WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: "Error al borrar" });
        res.json({ message: "Borrado" });
    });
});

//creamos los endpoints para las categorías y vídeos, todos protegidos por el middleware checkAuth

//cogemos la lista de categorías y vídeos del servidor
app.get('/categorias/:session_id', checkAuth, (req, res) => {
    db.all(`SELECT * FROM categorias`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error en DB" });
        res.json(rows);
    });
});

//mandamos la lista de categorías y vídeos al servidor
app.post('/categoria', checkAuth, (req, res) => {
    const { nombre } = req.body;
    db.run(`INSERT INTO categorias (nombre) VALUES (?)`, [nombre], function(err) {
        if (err) return res.status(500).json({ error: "La categoría ya existe" });
        res.json({ id: this.lastID, nombre: nombre });
    });
});

//actualizamos una categoría existente
app.put('/categoria/:session_id/:id', checkAuth, (req, res) => {
    const { nombre } = req.body;
    db.run(`UPDATE categorias SET nombre = ? WHERE id = ?`, [nombre, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: "Error al actualizar categoría" });
        // Opcional: Actualizar los vídeos en cascada si cambiamos el nombre de la categoría
        db.run(`UPDATE videos SET categoria_nombre = ? WHERE categoria_nombre = (SELECT nombre FROM categorias WHERE id = ?)`, [nombre, req.params.id]);
        res.json({ message: "Categoría modificada" });
    });
});

//borramos una categoría existente y todos sus vídeos asociados
app.delete('/categoria/:session_id/:nombre', checkAuth, (req, res) => {
    const { nombre } = req.params;
    db.run(`DELETE FROM videos WHERE categoria_nombre = ?`, [nombre], () => {
        db.run(`DELETE FROM categorias WHERE nombre = ?`, [nombre], function(err) {
            if (err) return res.status(500).json({ error: "Error al borrar" });
            res.json({ message: "Borrado" });
        });
    });
});

// Endpoint para obtener la lista de vídeos


app.get('/videos/:session_id', checkAuth, (req, res) => {
    db.all(`SELECT * FROM videos`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error en DB" });
        res.json(rows);
    });
});

app.post('/video', checkAuth, (req, res) => {
    const { titulo, url, categoria_nombre } = req.body;
    db.run(`INSERT INTO videos (titulo, url, categoria_nombre) VALUES (?, ?, ?)`, [titulo, url, categoria_nombre], function(err) {
        if (err) return res.status(500).json({ error: "Error al guardar el vídeo" });
        res.json({ id: this.lastID, titulo: titulo, url: url, categoria_nombre: categoria_nombre });
    });
});

app.put('/video/:session_id/:id', checkAuth, (req, res) => {
    const { titulo, url, categoria_nombre } = req.body;
    db.run(`UPDATE videos SET titulo = ?, url = ?, categoria_nombre = ? WHERE id = ?`, [titulo, url, categoria_nombre, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: "Error al actualizar vídeo" });
        res.json({ message: "Vídeo modificado" });
    });
});

app.delete('/video/:session_id/:id', checkAuth, (req, res) => {
    db.run(`DELETE FROM videos WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: "Error al borrar" });
        res.json({ message: "Borrado" });
    });
});

//listen para que el servidor escuche en el puerto 3000
app.listen(port, () => {
    console.log(`Servidor API REST corriendo en http://localhost:${port}`);
});

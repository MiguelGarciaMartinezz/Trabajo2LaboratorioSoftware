const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error("Error al abrir la base de datos:", err.message);
    else console.log("Conectado a la base de datos SQLite.");
});

// ==========================================
// INICIALIZACIÓN DE TABLAS
// ==========================================
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

// ==========================================
// MIDDLEWARE PARA VALIDAR SESIÓN
// ==========================================
const checkAuth = (req, res, next) => {
    const sessionId = req.params.session_id || req.body.session_id;
    if (!sessionId) return res.status(401).json({ error: "Sesión no proporcionada" });

    db.get(`SELECT user_id FROM sesiones WHERE session_id = ?`, [sessionId], (err, session) => {
        if (err || !session) return res.status(401).json({ error: "Sesión caducada o inválida" });
        req.user_id = session.user_id;
        next(); 
    });
};

// ==========================================
// 1. SERVICIOS DE LOGIN / LOGOUT
// ==========================================
app.post('/login', (req, res) => {
    const { user, passwd } = req.body; 
    db.get(`SELECT * FROM usuarios WHERE (email = ? OR name = ?) AND passwd = ?`, [user, user, passwd], (err, row) => {
        if (err) return res.status(500).json({ error: "Error interno" });
        if (row) {
            const sessionId = uuidv4();
            db.run(`INSERT INTO sesiones (session_id, user_id) VALUES (?, ?)`, [sessionId, row.id], (insertErr) => {
                if (insertErr) return res.status(500).json({ error: "Error al crear la sesión" });
                res.json({ session_id: sessionId, name: row.name });
            });
        } else {
            res.status(401).json({ error: "Usuario o contraseña incorrectos" });
        }
    });
});

app.put('/logout', (req, res) => {
    const { session_id } = req.body;
    db.run(`DELETE FROM sesiones WHERE session_id = ?`, [session_id], (err) => {
        if (err) return res.status(500).json({ error: "Error al cerrar sesión" });
        res.json({ message: "Sesión cerrada con éxito" });
    });
});

// ==========================================
// 2. SERVICIOS DE USUARIOS 
// ==========================================
app.get('/users/:session_id', checkAuth, (req, res) => {
    db.all(`SELECT id, name, email, passwd FROM usuarios`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error en DB" });
        res.json(rows);
    });
});

app.post('/user', checkAuth, (req, res) => {
    const { name, email, passwd } = req.body;
    db.run(`INSERT INTO usuarios (name, email, passwd) VALUES (?, ?, ?)`, [name, email, passwd], function(err) {
        if (err) return res.status(500).json({ error: "El email ya existe" });
        res.json({ id: this.lastID, name: name, email: email });
    });
});

app.put('/user/:session_id/:id', checkAuth, (req, res) => {
    const { name, email, passwd } = req.body;
    db.run(`UPDATE usuarios SET name = ?, email = ?, passwd = ? WHERE id = ?`, [name, email, passwd, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: "Error al actualizar usuario" });
        res.json({ message: "Usuario modificado" });
    });
});

app.delete('/user/:session_id/:id', checkAuth, (req, res) => {
    if (req.params.id == 1) return res.status(403).json({ error: "No puedes borrar al admin principal" });
    db.run(`DELETE FROM usuarios WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: "Error al borrar" });
        res.json({ message: "Borrado" });
    });
});

// ==========================================
// 3. SERVICIOS DE CATEGORÍAS 
// ==========================================
app.get('/categorias/:session_id', checkAuth, (req, res) => {
    db.all(`SELECT * FROM categorias`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Error en DB" });
        res.json(rows);
    });
});

app.post('/categoria', checkAuth, (req, res) => {
    const { nombre } = req.body;
    db.run(`INSERT INTO categorias (nombre) VALUES (?)`, [nombre], function(err) {
        if (err) return res.status(500).json({ error: "La categoría ya existe" });
        res.json({ id: this.lastID, nombre: nombre });
    });
});

app.put('/categoria/:session_id/:id', checkAuth, (req, res) => {
    const { nombre } = req.body;
    db.run(`UPDATE categorias SET nombre = ? WHERE id = ?`, [nombre, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: "Error al actualizar categoría" });
        db.run(`UPDATE videos SET categoria_nombre = ? WHERE categoria_nombre = (SELECT nombre FROM categorias WHERE id = ?)`, [nombre, req.params.id]);
        res.json({ message: "Categoría modificada" });
    });
});

app.delete('/categoria/:session_id/:nombre', checkAuth, (req, res) => {
    const { nombre } = req.params;
    db.run(`DELETE FROM videos WHERE categoria_nombre = ?`, [nombre], () => {
        db.run(`DELETE FROM categorias WHERE nombre = ?`, [nombre], function(err) {
            if (err) return res.status(500).json({ error: "Error al borrar" });
            res.json({ message: "Borrado" });
        });
    });
});

// ==========================================
// 4. SERVICIOS DE VÍDEOS 
// ==========================================
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

app.listen(port, () => {
    console.log(`Servidor API REST corriendo en http://localhost:${port}`);
});

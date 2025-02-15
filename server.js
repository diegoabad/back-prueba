const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;

const secretKey = 'mi_clave_secreta';
const usuariosPath = 'usuarios.json';
const historialPath = 'historial_compras.json';

app.use(bodyParser.json());
app.use(cors());

// Función para leer JSON desde archivos
const leerJSON = (path) => {
  try {
    const data = fs.readFileSync(path, 'utf8').trim();
    if (!data) {
      console.warn(`El archivo ${path} está vacío.`);
      return [];
    }
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error al leer el archivo ${path}:`, error.message);
    return [];
  }
};

// Función para escribir en archivos JSON
const guardarJSON = (path, data) => {
  try {
    fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error(`Error al guardar en ${path}:`, error.message);
  }
};

// Ruta de registro de usuario
app.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const usuarios = leerJSON(usuariosPath);
  const existe = usuarios.find((u) => u.email === email);

  if (existe) {
    return res.status(400).json({ error: 'El usuario ya existe' });
  }

  const nuevoUsuario = {
    id: usuarios.length > 0 ? Math.max(...usuarios.map((u) => u.id)) + 1 : 1,
    name,
    email,
    password,
    rol: 'user',
  };
  usuarios.push(nuevoUsuario);
  guardarJSON(usuariosPath, usuarios);

  return res.status(201).json({ message: 'Usuario registrado exitosamente' });
});

// Ruta de login que devuelve un token
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const usuarios = leerJSON(usuariosPath);

  // Buscar usuario en el archivo JSON
  const usuario = usuarios.find(
    (u) => u.email === email && u.password === password
  );

  if (usuario) {
    // Generar token con la información del usuario
    const token = jwt.sign(
      {
        id: usuario.id,
        name: usuario.name,
        email: usuario.email,
        rol: usuario.rol,
      },
      secretKey,
      { expiresIn: '1h' }
    );
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Credenciales incorrectas' });
});

// Middleware para verificar el token
const verificarToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) {
    return res.status(403).json({ error: 'Token no proporcionado' });
  }

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = decoded;
    next();
  });
};

// Ruta protegida que requiere el token y devuelve el usuario y su historial de compras
app.get('/perfil', verificarToken, (req, res) => {
  const usuarios = leerJSON(usuariosPath);
  const historial = leerJSON(historialPath);

  const usuario = usuarios.find((u) => u.id === req.user.id);
  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const comprasUsuario = historial.find((h) => h.id_usuario === usuario.id);
  return res.json({
    user: usuario,
    historial: comprasUsuario ? comprasUsuario.compras : [],
  });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

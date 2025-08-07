// Uso "type": "module", ES6 usar modulos import y export
import express, { json } from "express";
import dotenv from 'dotenv';
import router from "./routes/routes.js";
import ejs from "ejs";
import morgan from "morgan";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

import cors from "cors";
//Helmet (Protección de cabeceras HTTP)
import helmet from 'helmet';
//Limitar tasa de peticiones (rate limiting)
import rateLimit from 'express-rate-limit';
// usar express-validator para validar y sanitizar datos recibidos.
// import { body, validationResult } from 'express-validator';
//comprimir respuestas
import compression from 'compression';

dotenv.config();
// Obtener la ruta actual de este archivo:
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initializations
const app = express();
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS: ' + origin));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Middleware para eliminar cabeceras restrictivas SOLO si el origin está en allowedOrigins
app.use((req, res, next) => {
  const origin = req.headers.origin;

  const isStaticFile =
    req.method === 'GET' &&
    (req.path.startsWith('/videos') || req.path.startsWith('/uploads') ||
     req.path.match(/\.(mp4|webm|jpg|jpeg|png|glb|gltf|pdf|webp)$/i)); // Opcional: incluir tipos específicos

  if (isStaticFile && origin && allowedOrigins.includes(origin)) {
    // 🔓 Habilitar carga desde otros orígenes permitidos
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

    // 🔓 Permitir que se cargue desde otros orígenes
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none'); // Opcional, puede evitar conflictos de navegación cruzada
  }

  next();
});
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=()");
  next();
});


// Esto le dice a Express que hay 1 proxy confiable (Koyeb en este caso)
app.set('trust proxy', 1);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // límite de 1000 requests por IP en 15 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas peticiones desde esta IP, intenta más tarde.'
});

app.use(limiter);

app.use(compression());

// Settings: para usar ejs en el servidor
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para leer cuerpos JSON y formularios
app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));

// Middleware para setear cabeceras CORS específicas en archivos estáticos
app.use((req, res, next) => {
  const origin = req.headers.origin;

  const isStaticFile =
    req.method === 'GET' &&
    (req.path.startsWith('/videos') || req.path.startsWith('/uploads') ||
    req.path.match(/\.(jpg|jpeg|png|gif|mp4|webp|pdf)$/i));

  if (isStaticFile && (!origin || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  }

  next();
});

// Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', router);
app.get('/', (req, res) => {
  res.status(200).send('API funcionando');
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  if (!(err instanceof Error)) err = new Error(err);
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Error interno del servidor' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

export default app;

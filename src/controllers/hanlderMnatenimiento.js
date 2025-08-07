import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// import Product from '../database/models/amodelProduct.js'; 
// import Category from '../database/models/modelCategory.js'; 
// import Image from "../database/models/modelimages.js"
// import supabase from '../database/models/supa/supabase.js'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');
const repetidosPath = path.join(dataDir, 'repetidos.json');


export const filtrarProductosRepetidos = async (req, res) => {
  try {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'repetidos.json');

    const mapaRepetidos = new Map();
    const productosPorArchivo = {};

    for (const file of files) {
      const filePath = path.join(dataDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      productosPorArchivo[file] = data;

      for (const prod of data) {
        const key = prod.nombre.trim().toLowerCase();

        if (!mapaRepetidos.has(key)) {
          mapaRepetidos.set(key, { ...prod, categoria: [file] });
        } else {
          mapaRepetidos.get(key).categoria.push(file);
        }
      }
    }

    const repetidosFinal = [];
    const nombresRepetidos = [];

    for (const [key, prod] of mapaRepetidos.entries()) {
      if (prod.categoria.length > 1) {
        repetidosFinal.push(prod);
        nombresRepetidos.push(key);
      }
    }

    // 👉 Cargar los ya guardados anteriormente en repetidos.json
    let repetidosPrevios = [];
    if (fs.existsSync(repetidosPath)) {
      repetidosPrevios = JSON.parse(fs.readFileSync(repetidosPath, 'utf-8'));
    }

    const nombresPrevios = new Set(repetidosPrevios.map(p => p.nombre.trim().toLowerCase()));

    // Agregar nuevos sin pisar
    const nuevosRepetidos = repetidosFinal.filter(p => !nombresPrevios.has(p.nombre.trim().toLowerCase()));
    const repetidosActualizados = [...repetidosPrevios, ...nuevosRepetidos];

    // 👉 Guardar nuevo repetidos.json
    fs.writeFileSync(repetidosPath, JSON.stringify(repetidosActualizados, null, 2), 'utf-8');

    // 👉 Eliminar de TODOS los archivos originales los productos con nombre repetido
    for (const file of files) {
      const productosOriginales = productosPorArchivo[file];
      const filtrados = productosOriginales.filter(
        p => !nombresRepetidos.includes(p.nombre.trim().toLowerCase())
      );
      fs.writeFileSync(path.join(dataDir, file), JSON.stringify(filtrados, null, 2), 'utf-8');
    }

    res.json({ mensaje: '✅ Repetidos actualizados y eliminados de todos los archivos', repetidosNuevos: nuevosRepetidos.length });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: 'Error procesando productos repetidos' });
  }
};



export const eliminarDeRepetidos = (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: "Falta el nombre del producto a eliminar." });

    const repetidos = JSON.parse(fs.readFileSync(repetidosPath, 'utf-8'));
    const actualizado = repetidos.filter(p => p.nombre.trim().toLowerCase() !== nombre.trim().toLowerCase());

    if (actualizado.length === repetidos.length) {
      return res.status(404).json({ error: "Producto no encontrado en repetidos.json" });
    }

    fs.writeFileSync(repetidosPath, JSON.stringify(actualizado, null, 2), 'utf-8');
    res.json({ mensaje: "✅ Producto eliminado de repetidos.json" });
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ error: "Error eliminando producto de repetidos.json" });
  }
};



const oldScrapedPath = path.join(dataDir, 'scraping_anterior.json'); // Guardá una versión vieja acá

export const compararScrapingConDB = async (req, res) => {
  try {
    // 1. Obtener productos del backend (api/all-products)
    const { data: productosDB } = await axios.get('http://localhost:3001/api/all-products');

    const dbMap = new Map();
    productosDB.forEach(p => {
      const key = p.model.trim().toLowerCase();
      dbMap.set(key, p);
    });

    // 2. Leer productos scrapeados actuales (de todos los .json excepto repetidos/backup)
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && !['repetidos.json', 'scraping_anterior.json'].includes(f));

    const scrapingActual = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dataDir, file), 'utf-8');
      const data = JSON.parse(raw);
      scrapingActual.push(...data);
    }

    const scrapingMap = new Map();
    scrapingActual.forEach(p => {
      const key = p.nombre.trim().toLowerCase();
      scrapingMap.set(key, p);
    });

    // 3. Leer scraping anterior (para comparar precios)
    let scrapingAnterior = [];
    if (fs.existsSync(oldScrapedPath)) {
      const oldRaw = fs.readFileSync(oldScrapedPath, 'utf-8');
      scrapingAnterior = JSON.parse(oldRaw);
    }

    const oldMap = new Map();
    scrapingAnterior.forEach(p => {
      const key = p.nombre.trim().toLowerCase();
      oldMap.set(key, p);
    });

    // 4. Detectar nuevos, eliminados, actualizaciones
    const nuevos = [];
    const eliminados = [];
    const precioActualizado = [];

    for (const [key, scraped] of scrapingMap.entries()) {
      if (!dbMap.has(key)) {
        nuevos.push(scraped);
      }

      const oldProd = oldMap.get(key);
      if (oldProd && oldProd.precio !== scraped.precio) {
        precioActualizado.push({
          nombre: scraped.nombre,
          precioViejo: oldProd.precio,
          precioNuevo: scraped.precio,
        });
      }
    }

    for (const [key, dbProd] of dbMap.entries()) {
      if (!scrapingMap.has(key)) {
        eliminados.push(dbProd);
      }
    }

    // 5. Guardar scraping actual como respaldo para futura comparación
    fs.writeFileSync(oldScrapedPath, JSON.stringify(scrapingActual, null, 2), 'utf-8');

    return res.json({
      nuevos: nuevos.length,
      eliminados: eliminados.length,
      precioActualizado: precioActualizado.length,
      detalles: {
        nuevos,
        eliminados,
        precioActualizado,
      }
    });

  } catch (error) {
    console.error('❌ Error comparando productos:', error.message);
    return res.status(500).json({ error: 'Error comparando productos con scraping' });
  }
};

const filePath = path.join(dataDir, 'repetidos.json');
//devuelve el json de productos repetidos una vesion antes
export const getProductosRepetidos = async (req, res) => {

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Error al leer los productos", err : err });
    }

    try {
      const productos = JSON.parse(data);
      res.json(productos);
    } catch (error) {
      res.status(500).json({ error: "Error al parsear el JSON" });
    }
  }
); 
};



//MANTENIMIENTOS DE PRODUCTOS / IMAGENES EN SUPABASE
//ELIMINAR LOS PRODUCTOS QU ENO TENGAN CATEGORIAS, QUE TENGA UN ARRAYA VACIO 

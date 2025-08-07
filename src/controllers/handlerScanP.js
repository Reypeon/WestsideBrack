import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rutas
const imageDir = path.join(__dirname, '..', 'public', 'images');
const dataDir = path.join(__dirname, '..', 'data');
const imagesOriginalesDir = path.join(__dirname, '../public/imagesOriginales');
const imagesDir = path.join(__dirname, '../public/images');
const errorDir = path.join(__dirname, '../public/imgerror');

// Crear carpetas si no existen
if (!fs.existsSync(imageDir)) fs.mkdirSync(imageDir, { recursive: true });
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(imagesOriginalesDir)) fs.mkdirSync(imagesOriginalesDir, { recursive: true });
if (!fs.existsSync(errorDir)) fs.mkdirSync(errorDir, { recursive: true });

// Slugify para generar nombres de archivo válidos
const slugify = (str) =>
  str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

async function downloadImage(url, filename) {
  try {
    const response = await axios({
      url,
      responseType: 'arraybuffer',
    });
    if (!fs.existsSync(imagesOriginalesDir)) fs.mkdirSync(imagesOriginalesDir, { recursive: true });
    const fullPathOriginal = path.join(imagesOriginalesDir, filename);
    fs.writeFileSync(fullPathOriginal, response.data);
    return fullPathOriginal;
  } catch (error) {
    console.error('Error descargando imagen:', error.message);
    return null;
  }
};


//SI SHARP FALLA INTENTA CON JIMP y SI LOS DOS FALLAN SE GUARDA EN CARPETA DE IMG ERROR CON UNA IMAGEN EN NEGRO 
export async function convertirYGuardarFormatos(rutaOriginal, nombreBase) {
  const nombreUnico = `${nombreBase}-${Date.now()}`;
  const rutaJpeg = path.join(imagesDir, `${nombreUnico}.jpg`);
  const rutaWebp = path.join(imagesDir, `${nombreUnico}.webp`);

  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
  if (!fs.existsSync(errorDir)) fs.mkdirSync(errorDir, { recursive: true });

  try {
    // Intentamos procesar con sharp y guardar jpeg y webp
    await sharp(rutaOriginal).jpeg({ quality: 80 }).toFile(rutaJpeg);
    await sharp(rutaOriginal).webp({ quality: 80 }).toFile(rutaWebp);

    return {
      jpeg: `/images/${nombreUnico}.jpg`,
      webp: `/images/${nombreUnico}.webp`,
    };
  } catch (err) {
    console.error(`❌ Sharp falló para ${nombreBase}:`, err.message);

    try {
      // En caso de error copiamos el archivo original sin procesar a imgerror con nombres únicos
      const errorNombre = `${nombreBase}-original-${Date.now()}`;
      const errorPath = path.join(errorDir, `${errorNombre}${path.extname(rutaOriginal)}`);

      // Copiar archivo original sin procesar
      await fs.promises.copyFile(rutaOriginal, errorPath);

      return {
        jpeg: `/imgerror/${errorNombre}${path.extname(rutaOriginal)}`,
        webp: `/imgerror/${errorNombre}${path.extname(rutaOriginal)}`, // como no se puede convertir a webp, igual le paso el mismo archivo
      };
    } catch (copyErr) {
      console.error(`❌ Error copiando archivo original en imgerror para ${nombreBase}:`, copyErr.message);
      return null;
    }
  }
}
// 🧠 SCRAPER PRINCIPAL
export const ScanProductos = async (req, res) => {
  const { categorias } = req.body;

  if (!Array.isArray(categorias) || categorias.length === 0) {
    return res.status(400).json({ error: 'Debés enviar un array de categorías con nombre y urls' });
  }

  try {
    const resultadosTotales = [];

    for (const cat of categorias) {
      const { nombre, urls } = cat;

      if (!nombre || !Array.isArray(urls)) continue;

      let id = 1;
      const productosCategoria = [];

      for (const url of urls) {
        const { data: html } = await axios.get(url);
        const $ = cheerio.load(html);
        const productos = $('li.product').toArray();

        for (const el of productos) {
          try {
            const nombreProducto = $(el).find('h2.woocommerce-loop-product__title').text().trim();
            const precio = $(el).find('.price .woocommerce-Price-amount').last().text().trim();

            const rawImg = $(el).find('img').attr('data-src') ||
              $(el).find('img').attr('src') ||
              $(el).find('img').attr('data-lazy-src');

            if (!rawImg) {
              console.log('⚠️ Imagen no encontrada para producto:', nombreProducto);
              continue;
            }

            const imagenUrl = rawImg.startsWith('http') ? rawImg : new URL(rawImg, url).href;
            // const link = $(el).find('a.woocommerce-LoopProduct-link').attr('href');
            const link = $(el).find('a').attr('href');

            if (productosCategoria.some(p => p.link === link)) continue;

            const extension = path.extname(imagenUrl).split('?')[0] || '.jpg';
            const nombreBase = slugify(nombreProducto);

            // Descargar imagen original
            const rutaOriginal = await downloadImage(imagenUrl, nombreBase + extension);
            if (!rutaOriginal) continue;

            // Convertir y guardar JPEG y WebP
            const { jpeg: imagenJpeg, webp: imagenWebp } = await convertirYGuardarFormatos(rutaOriginal, nombreBase);

            // Buscar imagen zoom y descripción
            let imagenZoomLocal = null;
            let imagenZoomLocalWebp = null;
            let descripcionProducto = "";

            try {
              const { data: htmlDetalle } = await axios.get(link);
              const $detalle = cheerio.load(htmlDetalle);

              // Imagen principal zoom
              const imgZoom = $detalle('img.wp-post-image').first().attr('src');
              if (imgZoom) {
                const zoomUrl = imgZoom.startsWith('http') ? imgZoom : new URL(imgZoom, link).href;
                const extZoom = path.extname(zoomUrl).split('?')[0] || '.jpg';
                const nombreArchivoZoom = `${nombreBase}_zoom${extZoom}`;

                // Descargar imagen zoom original
                const rutaOriginalZoom = await downloadImage(zoomUrl, nombreArchivoZoom);
                if (rutaOriginalZoom) {
                  // Convertir zoom
                  const nombreBaseZoom = `${nombreBase}_zoom`;
                  const { jpeg: jpegZoom, webp: webpZoom } = await convertirYGuardarFormatos(rutaOriginalZoom, nombreBaseZoom);

                  // Usamos la JPEG para fallback, WebP para optimización
                  // Podés elegir uno o ambos según necesidad, acá guardo JPEG para mostrar
                  imagenZoomLocal = jpegZoom;
                  imagenZoomLocalWebp = webpZoom;

                }
              }

              // Descripción producto
              const descDiv = $detalle('div.woocommerce-tabs.wc-tabs-wrapper');
              if (descDiv.length) {
                descripcionProducto = descDiv.find('p').first().text().trim();
              }
            } catch (err) {
              console.error(`❌ Error al procesar detalle del producto ${link}:`, err.message);
            }

            productosCategoria.push({
              id,
              nombre: nombreProducto,
              precio,
              imagenLocalJpeg: imagenJpeg,
              imagenLocalWebp: imagenWebp,
              imagenZoomLocal,
              imagenZoomLocalWebp,
              link,
              categoria: nombre,
              description: descripcionProducto || "",
            });

            console.log(`✔ Producto procesado: [${id - 1}] ${nombreProducto} - Categoría: ${nombre}`);
            id++;
          }
          catch (error) {
           console.error(`❌ Error procesando producto ${nombreProducto || 'sin nombre'}:`, error.message);
          }

        }
      }

      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const rutaArchivo = path.join(dataDir, `${nombre}.json`);
      fs.writeFileSync(rutaArchivo, JSON.stringify(productosCategoria, null, 2));

      resultadosTotales.push({ categoria: nombre, cantidad: productosCategoria.length });
    }

    res.json({ status: 'ok', categoriasScrapeadas: resultadosTotales });
  } catch (err) {
    console.error('❌ Error en scraping:', err.message);
    res.status(500).json({ error: 'Error en scraping' });
  }
};

// Obtener una Json scrapings-all
export const GetJsoNScraping = async (req, res) => {
  try {
    const nombreCat = req.params.nombre.toLowerCase();
    const archivo = path.join(dataDir, `${nombreCat}.json`);

    if (!fs.existsSync(archivo)) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const data = fs.readFileSync(archivo, 'utf-8');
    const productos = JSON.parse(data);

    res.json({ categoria: nombreCat, productos });
  } catch (err) {
    console.error('❌ Error leyendo categoría:', err.message);
    res.status(500).json({ error: 'Error leyendo categoría' });
  }
};

// Obtener todos los productos scrapings
export const getAllScrapedProducts = async (req, res) => {
  try {
    const files = fs.readdirSync(dataDir);
    const allData = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dataDir, file);
        const dataRaw = fs.readFileSync(filePath, 'utf-8');
        const productos = JSON.parse(dataRaw);
        const categoryName = path.basename(file, '.json');

        allData.push({
          categoria: categoryName,
          productos,
        });
      }
    }

    res.json(allData);
  } catch (err) {
    console.error('❌ Error leyendo los archivos JSON:', err.message);
    res.status(500).json({ error: 'Error leyendo los archivos JSON' });
  }
};



//ELIMINAR SCRAPINGS DE LA CARPETA DATA
// Eliminar un archivo JSON de /data
export const deleteScrapedJSON = async (req, res) => {
  try {
    const nombreCat = req.params.nombre.toLowerCase();
    const archivo = path.join(dataDir, `${nombreCat}.json`);

    if (!fs.existsSync(archivo)) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    fs.unlinkSync(archivo); // 🔥 Elimina el archivo

    res.json({ status: 'ok', mensaje: `Archivo ${nombreCat}.json eliminado.` });
  } catch (err) {
    console.error('❌ Error eliminando archivo:', err.message);
    res.status(500).json({ error: 'Error eliminando archivo' });
  }
};
//ELIMINA TODOS !CUIDADO
export const deleteAllScrapedJSON = async (req, res) => {
  try {
    const files = fs.readdirSync(dataDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return res.status(200).json({ mensaje: 'No hay archivos JSON para eliminar.' });
    }

    for (const file of jsonFiles) {
      fs.unlinkSync(path.join(dataDir, file));
    }

    res.json({ status: 'ok', mensaje: `${jsonFiles.length} archivos JSON eliminados.` });
  } catch (err) {
    console.error('❌ Error al eliminar archivos JSON:', err.message);
    res.status(500).json({ error: 'Error eliminando los archivos JSON.' });
  }
};



//ELIMINA LAS IAMGENES DE PUBLIC

export const vaciarCarpetaImages = async (req, res) => {
  try {
    if (!fs.existsSync(imageDir)) {
      return res.status(404).json({ error: 'La carpeta public/images no existe.' });
    }

    const archivos = fs.readdirSync(imageDir);

    if (archivos.length === 0) {
      return res.json({ mensaje: 'La carpeta ya está vacía.' });
    }

    for (const archivo of archivos) {
      fs.unlinkSync(path.join(imageDir, archivo));
    }

    res.json({ mensaje: `✅ ${archivos.length} imágenes eliminadas de /public/images. Quedan en basedatos si no eliminaste la card` });
  } catch (err) {
    console.error('❌ Error al vaciar public/images:', err.message);
    res.status(500).json({ error: 'Error al vaciar la carpeta de imágenes.' });
  }
};








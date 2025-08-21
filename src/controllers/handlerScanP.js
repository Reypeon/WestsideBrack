
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








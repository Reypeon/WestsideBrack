import ModelImage from "../database/models/modelimages.js";
import supabase from '../database/models/supa/supabase.js'; 

export const deleteImageById = async (req, res) => {
  try {
    const { idImage } = req.params;
    const { path } = req.body; // el path a eliminar, ej: "images/xxx.jpg" o "imagesWEBP/xxx.webp"

    if (!path) {
      return res.status(400).json({ error: "Falta el path de la imagen a eliminar en el body" });
    }

    const image = await ModelImage.findByPk(idImage);

    if (!image) {
      return res.status(404).json({ error: "Imagen no encontrada" });
    }

    // Función para eliminar archivo en Supabase dado el path
    async function eliminarArchivoSupabase(pathABorrar) {
      const bucket = "media";

      // Ajustamos el path para Supabase: solo elimina la carpeta "media/" y abajo sigue el path
      let relativePath = pathABorrar;

      // Supabase storage elimina paths relativos al bucket, "media" es bucket, no va en path
      // Ej: si pathABorrar = "images/abc.jpg" --> se borra "images/abc.jpg"
      // Si pathABorrar = "imagesWEBP/abc.webp" --> se borra "imagesWEBP/abc.webp"
      // Por eso no sacamos "media/" acá

      const { error } = await supabase.storage.from(bucket).remove([relativePath]);
      if (error) {
        throw new Error(`Error eliminando archivo Supabase: ${error.message}`);
      }
    }

    // Primero verificamos si todas las columnas están vacías o nulas
    const campos = ['url', 'urlZoom', 'urlWEBP', 'urlZoomWEBP'];
    const estanVacios = campos.every(campo => {
      const valor = image[campo];
      return !valor || valor.trim() === "";
    });

    if (estanVacios) {
      // Ya no hay imágenes, eliminar fila completa y responder
      await image.destroy();
      return res.status(200).json({ message: "La fila estaba vacía y fue eliminada completamente." });
    }

    // Si no está vacía la fila, buscamos la columna que contiene el path para eliminar
    let campoEncontrado = null;
    for (const campo of campos) {
      if (image[campo] && image[campo].includes(path)) {
        campoEncontrado = campo;
        break;
      }
    }

    if (!campoEncontrado) {
      return res.status(400).json({ error: "El path proporcionado no coincide con ninguna columna en la imagen." });
    }

    // Eliminamos archivo en Supabase
    try {
      await eliminarArchivoSupabase(path);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Error eliminando archivo en Supabase." });
    }

    // Vaciamos el campo encontrado
    image[campoEncontrado] = null;
    await image.save();

    // Revalidamos si ahora está vacía la fila para eliminarla
    const ahoraVacia = campos.every(campo => {
      const valor = image[campo];
      return !valor || valor.trim() === "";
    });

    if (ahoraVacia) {
      await image.destroy();
      return res.status(200).json({ message: "La imagen fue vaciada y eliminada completamente por estar vacía." });
    }

    // Si no, solo informamos que vaciamos la columna y borramos archivo
    res.status(200).json({ message: `Se eliminó la imagen del campo ${campoEncontrado} y archivo de Supabase.` });

  } catch (error) {
    console.error("Error en eliminación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

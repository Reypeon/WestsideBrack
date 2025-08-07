import supabase from '../database/models/supa/supabase.js'; // cliente configurado con service_role_key o anon key según convenga
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export const uploadMedia = async (req, res) => {
  try {
    if (!req.files || (!req.files.videos && !req.files.glbs)) {
      return res.status(400).json({ error: 'No se recibieron archivos videos o glbs' });
    }

    const uploadedUrls = [];

    // Función para subir archivo a Supabase Storage en bucket dinámico
    const uploadFile = async (file, bucket) => {
      const ext = path.extname(file.originalname);
      const fileName = `${uuidv4()}${ext}`;
      const filePath = `${fileName}`; // sin "uploads/"

      const { error } = await supabase.storage.from(bucket).upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

      if (error) throw error;

      const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
      return publicUrl;
    };

    // Subir videos al bucket 'videos'
    if (req.files.videos) {
      for (const video of req.files.videos) {
        const url = await uploadFile(video, 'videos');
        uploadedUrls.push({ type: 'video', url });
      }
    }

    // Subir glbs al bucket '.glb'
    if (req.files.glbs) {
      for (const glb of req.files.glbs) {
        const url = await uploadFile(glb, 'glb');
        uploadedUrls.push({ type: 'glb', url });
      }
    }

    res.status(201).json({ message: 'Archivos subidos correctamente', files: uploadedUrls });

  } catch (error) {
    res.status(500).json({ error: 'Error al subir archivos' });
  }
};


export const deleteFileFromStorage = async (req, res) => {
  try {
    const { fileUrl } = req.body; // URL pública del archivo

    if (!fileUrl) {
      return res.status(400).json({ error: 'Falta la URL del archivo a eliminar.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const bucket = 'media';

    // Extraer el path del archivo dentro del bucket (quita la parte pública)
    const path = fileUrl.replace(`${supabaseUrl}/storage/v1/object/public/${bucket}/`, '');

    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      return res.status(500).json({ error: 'Error al eliminar el archivo.' });
    }

    return res.status(200).json({ message: 'Archivo eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
// controllers/categoryController.js
import Category from "../database/models/modelCategory.js";

/**
 * Obtener todas las categorías
 */
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [['id', 'ASC']] });
    return res.status(200).json(categories);
  } catch (error) {
    console.error('❌ Error al obtener categorías:', error.message);
    return res.status(500).json({ error: 'Error al obtener categorías.' });
  }
};

/**
 * Crear una nueva categoría
 */
export const createCategory = async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'El nombre es obligatorio.' });
  }

  try {
    const category = await Category.create({ name: name.trim() });
    return res.status(201).json(category);
  } catch (error) {
    console.error('❌ Error al crear categoría:', error.message);
    return res.status(500).json({ error: 'Error al crear la categoría.' });
  }
};

/**
 * Eliminar una categoría por ID (por query param o por params)
 */
export const deleteCategory = async (req, res) => {
  const id = Number(req.query.id || req.params.id);

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido o no proporcionado.' });
  }

  try {
    const categoria = await Category.findByPk(id);

    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada.' });
    }

    await categoria.destroy();
    return res.status(200).json({ mensaje: `✅ Categoría "${categoria.name}" eliminada correctamente.` });
  } catch (error) {
    console.error('❌ Error al eliminar categoría:', error.message);
    return res.status(500).json({ error: 'Error al eliminar la categoría.' });
  }
};

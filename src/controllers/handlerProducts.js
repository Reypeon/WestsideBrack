import Product from '../database/models/amodelProduct.js'; // Importa tu modelo de Producto
import Category from '../database/models/modelCategory.js'; // Importa tu modelo de Categoría
import Image from "../database/models/modelimages.js"
import supabase from '../database/models/supa/supabase.js'; // tu cliente supabase ya configurado
import ProductCategory from '../database/models/ProductCategory.js'
import path from 'path';
import fs from 'fs';
import { readFile } from "fs/promises";
import sharp from "sharp";
// Rutas de salida
const imagesJpegDir = path.join(process.cwd(),"src", "public/imagesJpeg");
const imagesWebpDir = path.join(process.cwd(),"src", "public/imagesWEBP");
if (!fs.existsSync(imagesJpegDir)) fs.mkdirSync(imagesJpegDir, { recursive: true });
if (!fs.existsSync(imagesWebpDir)) fs.mkdirSync(imagesWebpDir, { recursive: true });

// Función para nombres válidos
const slugify = (str) =>
  str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
//PASO 1 PARA CREAR PRODUCTOS
export const GuardarIMGSpublic = async (req, res) => {
  try {
    // Validar que llegaron imágenes
    if (!req.files || !req.files.images || req.files.images.length === 0) {
      return res.status(400).json({ error: "No se recibieron imágenes" });
    }

    const rutas = [];

    for (const file of req.files.images) {
      const nombreBase = slugify(path.parse(file.originalname).name);
      const filenameJpeg = `${nombreBase}.jpeg`;
      const filenameWebp = `${nombreBase}.webp`;

      const outputJpeg = path.join(imagesJpegDir, filenameJpeg);
      const outputWebp = path.join(imagesWebpDir, filenameWebp);

      // Procesar con Sharp
      await sharp(file.buffer)
        .resize(500, 500, { fit: "cover" })
        .toFormat("jpeg", { quality: 80 })
        .toFile(outputJpeg);

      await sharp(file.buffer)
        .resize(500, 500, { fit: "cover" })
        .toFormat("webp", { quality: 80 })
        .toFile(outputWebp);

      rutas.push({
        jpeg: `/imagesJpeg/${filenameJpeg}`,
        webp: `/imagesWEBP/${filenameWebp}`,
      });
    }

    return res.json(rutas);
  } catch (error) {
    console.error("Error procesando imágenes:", error.message);
    return res.status(500).json({ error: "Error al procesar imágenes" });
  }
};


//PASO 2 PARA CREAR PRODUCTOS

export const createProduct = async (req, res) => {
  
  try {
    let {
      model,
      modelUser,
      description,
      price,
      stock,
      categoryIds,
      images,
      imagesArray,
    } = req.body;

    // Normalizar para que siempre usemos un solo array
    const finalImagesArray = imagesArray || images;

    // Validaciones básicas
    if (!model || !price || !stock) {
      return res
        .status(400)
        .json({ error: "Faltan datos obligatorios: model, price o stock" });
    }
    if (!categoryIds) {
      return res
        .status(400)
        .json({ error: "Faltan las categorías (categoryIds)" });
    }
    if (
      !finalImagesArray ||
      !Array.isArray(finalImagesArray) ||
      finalImagesArray.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "Faltan imágenes para el producto" });
    }

    // Parsear categoryIds si viene como string
    if (typeof categoryIds === "string") {
      try {
        categoryIds = JSON.parse(categoryIds);
      } catch {
        return res
          .status(400)
          .json({ error: "categoryIds no es un array válido" });
      }
    }
    if (!Array.isArray(categoryIds)) {
      return res
        .status(400)
        .json({ error: "categoryIds debe ser un array" });
    }

    const bucket = "media";
    const uploadedImagesData = [];
    const baseImagePath = path.join(process.cwd(), "src", "public");

    // Helper para subir archivo local a supabase
    const uploadLocalFileToSupabase = async (
      relativePath,
      folderSupabase,
      contentType
    ) => {
      try {
        const fullLocalPath = path.join(
          baseImagePath,
          relativePath.replace(/^\//, "")
        );
        const fileBuffer = await readFile(fullLocalPath);
        const fileName = path.basename(relativePath);
        const supabasePath = `${folderSupabase}/${Date.now()}-${fileName}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(supabasePath, fileBuffer, {
            contentType,
            upsert: true,
          });
        if (error) throw error;
        return supabasePath;
      } catch (err) {
        throw new Error(
          `Error subiendo archivo ${relativePath}: ${err.message}`
        );
      }
    };

    // Procesar imágenes
    for (const imgObj of finalImagesArray) {
      try {
        let urlJPG = null;
        let urlWEBP = null;

        if (imgObj.imagenLocalJpeg) {
          urlJPG = await uploadLocalFileToSupabase(
            imgObj.imagenLocalJpeg,
            "images",
            "image/jpeg"
          );
        }
        if (imgObj.imagenLocalWebp) {
          urlWEBP = await uploadLocalFileToSupabase(
            imgObj.imagenLocalWebp,
            "imagesWEBP",
            "image/webp"
          );
        }

        uploadedImagesData.push({
          urlJPG,
          urlWEBP,
          alt: imgObj.alt || "",
        });
      } catch (imgErr) {
        console.log(`No se pudo subir una imagen: ${imgErr.message}`);
      }
    }

    // Crear producto en BD
    const product = await Product.create({
      model,
      modelUser: modelUser || "",
      description: description || "",
      price,
      stock,
    });

    // Asociar categorías
    await product.addCategories(categoryIds);

    // Crear imágenes en BD vinculadas
    for (const imgData of uploadedImagesData) {
      await Image.create({ ...imgData, productId: product.id });
    }

    // Consultar producto con relaciones
    const fullProduct = await Product.findOne({
      where: { id: product.id },
      include: [
        { model: Category, as: "categories" },
        { model: Image, as: "images" },
      ],
    });

    return res.status(201).json(fullProduct);
  } catch (error) {
    console.error("Error crear producto:", error);
    return res
      .status(500)
      .json({ error: error.message || "Error al crear el producto." });
  }
};
//ACTUALIZAR PRODCUTOS
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    model,
    modelUser,
    description,
    price,
    stock,
    categoryIds,
    alts,
    imageFieldUpdates // Estructura: { [imageId]: { url, urlWEBP, urlZoom, urlZoomWEBP } }
  } = req.body;

  try {
    const product = await Product.findByPk(id, {
      include: [{ model: Image, as: 'images' }],
    });

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const bucket = 'media';

    // === 1. SUBIR archivos de model, modelUser,  ===
    if (req.files) {
      const uploadImageFile = async (file, prefix) => {
        const path = `images/${Date.now()}-${prefix}-${file.originalname}`;
        const { error } = await supabase.storage.from(bucket).upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });
        if (error) throw error;
        return path;
      };

      if (req.files.modelImage) {
        product.model = await uploadImageFile(req.files.modelImage[0] || req.files.modelImage, 'model');
      }
      if (req.files.modelUserImage) {
        product.modelUser = await uploadImageFile(req.files.modelUserImage[0] || req.files.modelUserImage, 'modelUser');
      }

    }

    // === 2. Actualizar campos básicos ===
    if (model) product.model = model;
    if (modelUser) product.modelUser = modelUser;
    if (description) product.description = description;
    if (price) product.price = price;
    if (stock) product.stock = stock;

    await product.save();

    // === 3. Categorías ===
    if (categoryIds) {
      const categories = typeof categoryIds === 'string' ? JSON.parse(categoryIds) : categoryIds;
      const foundCategories = await Category.findAll({ where: { id: categories } });
      await product.setCategories(foundCategories);
    }



    // === 5. Subir nuevas imágenes al array ===
    if (req.files && req.files.images) {
      const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      const altArray = alts ? (Array.isArray(alts) ? alts : [alts]) : [];

      for (let i = 0; i < files.length; i++) {
        const img = files[i];
        const fileName = `images/${Date.now()}-${img.originalname}`;

        const { error } = await supabase.storage.from(bucket).upload(fileName, img.buffer, {
          contentType: img.mimetype,
          upsert: true,
        });
        if (error) throw error;

        await Image.create({
          url: fileName,
          alt: altArray[i] || '',
          productId: product.id,
        });
      }
    }

    // === 6. Actualizar campos de imágenes existentes ===
    if (imageFieldUpdates) {
      const updates = typeof imageFieldUpdates === 'string' ? JSON.parse(imageFieldUpdates) : imageFieldUpdates;

      for (const [imageId, updatesObj] of Object.entries(updates)) {
        const image = await Image.findByPk(imageId);
        if (!image) continue;

        // Eliminar imágenes de supabase si algún campo debe eliminarse
        for (const field of ['urlJPG', 'urlWEBP', 'urlZoom', 'urlZoomWEBP']) {
          if (updatesObj[field] === null && image[field]) {
            await supabase.storage.from(bucket).remove([image[field]]);
            image[field] = null;
          } else if (updatesObj[field]) {
            image[field] = updatesObj[field];
          }
        }

        // Si no queda ninguna imagen, eliminar toda la fila
        if (!image.url && !image.urlWEBP && !image.urlZoom && !image.urlZoomWEBP) {
          await image.destroy();
        } else {
          await image.save();
        }
      }
    }

    // === 7. Retornar producto actualizado ===
    const fullProduct = await Product.findByPk(product.id, {
      include: [
        { model: Category, as: 'categories' },
        { model: Image, as: 'images' },
      ],
    });

    res.status(200).json(fullProduct);
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar el producto.' });
  }
};
//ELIMINAR PRODUCTOS
export const deleteProduct = async (req, res) => {
  // Soporta eliminar por params (uno) o por body (varios)
  const singleId = req.params.id;
  const ids = singleId ? [singleId] : req.body.ids;

  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: "No se proporcionaron IDs para eliminar." });
  }

  try {
    const bucket = "media";
    const deletedProducts = [];
    const failedProducts = [];

    for (const id of ids) {
      const product = await Product.findOne({
        where: { id },
        include: [{ model: Image, as: "images" }],
      });

      if (!product) {
        failedProducts.push({ id, error: "Producto no encontrado." });
        continue;
      }

      // Recolectar todas las rutas de imágenes que hay que borrar en Supabase
      const imagePaths = product.images.flatMap((img) => {
        const paths = [];
        if (img.url) paths.push(img.url.replace(/^media\//, ""));
        if (img.urlWEBP) paths.push(img.urlWEBP.replace(/^media\//, ""));
        if (img.urlZoom) paths.push(img.urlZoom.replace(/^media\//, ""));
        if (img.urlZoomWEBP) paths.push(img.urlZoomWEBP.replace(/^media\//, ""));
        return paths;
      });

      // Eliminar archivos del bucket (si hay)
      if (imagePaths.length > 0) {
        const { error: deleteError } = await supabase.storage.from(bucket).remove(imagePaths);
        if (deleteError) {
          console.error(`Error al eliminar imágenes de producto ${id}:`, deleteError.message);
        }
      }

      // Eliminar registros en BD
      await Image.destroy({ where: { productId: id } });
      await product.setCategories([]); // Quitar asociaciones con categorías
      await Product.destroy({ where: { id } });

      deletedProducts.push({
        id,
        deletedImages: product.images.map(img => img.id),
        deletedFromStorage: imagePaths,
      });
    }

    res.status(200).json({
      message: "Proceso de eliminación finalizado.",
      deleted: deletedProducts,
      failed: failedProducts,
    });
  } catch (error) {
    console.error("Error al eliminar productos:", error);
    res.status(500).json({ error: "Error interno al eliminar productos." });
  }
};

// BUSCAR TODOS LOS PRODUCTOS
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        { model: Category, as: "categories" },
        { model: Image, as: "images" },
      ],
    });

    const productsWithUrls = products.map((product) => {
      const imagesWithUrls = product.images.map((img) => {
        let publicUrlWEBP = img.urlWEBP ? supabase
          .storage
          .from('media') // tu bucket
          .getPublicUrl(img.urlWEBP).data.publicUrl
          : null;

        let publicUrlJPG = img.urlJPG ? supabase
          .storage
          .from('media')
          .getPublicUrl(img.urlJPG).data.publicUrl
          : null;

        return {
          ...img.toJSON(),
          urlWEBP: publicUrlWEBP,
          urlJPG: publicUrlJPG,
        };
      });

      return {
        ...product.toJSON(),
        images: imagesWithUrls,
      };
    });

    res.status(200).json(productsWithUrls);
  } catch (error) {
    console.error("Error al obtener todos los productos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

// BUSCAR TODOS LOS PRODUCTOS DE CATEGORIA ID
export const getProductsByCategory = async (req, res) => {
  try {
    const categoryIds = req.query.categoryIds
      ? req.query.categoryIds.split(",").map(id => Number(id))
      : [];

    if (categoryIds.length === 0) {
      return res.status(400).json({ error: "Debe enviar categoryIds" });
    }

    const products = await Product.findAll({
      include: [
        {
          model: Category,
          as: "categories",
          where: { id: categoryIds },
          required: true,
          through: {
            attributes: ["orden"],
          },
        },
        {
          model: Image,
          as: "images",
        },
      ],
      order: [
        [{ model: Category, as: "categories" }, ProductCategory, "orden", "ASC"],
      ],
    });

    // Construir URLs públicas para las imágenes
    const productsWithUrls = await Promise.all(
      products.map(async (product) => {
        const imagesWithUrls = await Promise.all(
          product.images.map(async (img) => {
            let publicUrlWEBP = null;
            let publicUrlJPG = null;

            if (img.urlWEBP) {
              const { data, error } = supabase
                .storage
                .from('media') // tu bucket en Supabase
                .getPublicUrl(img.urlWEBP);
              publicUrlWEBP = data.publicUrl;
            }

            if (img.urlJPG) {
              const { data, error } = supabase
                .storage
                .from('media') // tu bucket
                .getPublicUrl(img.urlJPG);
              publicUrlJPG = data.publicUrl;
            }

            return {
              ...img.toJSON(),
              urlWEBP: publicUrlWEBP,
              urlJPG: publicUrlJPG,
            };
          })
        );

        return {
          ...product.toJSON(),
          images: imagesWithUrls,
        };
      })
    );

    res.json(productsWithUrls);
  } catch (error) {
    console.error("Error al obtener productos por categoría:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};








//RUTA GET ""/products/detail/:id"" LA USO en detail para buscar un solo producto
export const searchId = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id, {
      include: [
        { model: Category, as: "categories" },
        {

          model: Image, // Incluye las imágenes relacionadas
          as: "images", // Asegúrate de usar el alias correcto definido en tus relaciones
        },
      ],
    });

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
};



//Productos Repetidos
export const productRepetidos = async (req, res) => {
  try {
    const productos = await Product.findAll({
      include: ['categories', 'images'],
    });

    // Contador de modelos
    const contadorModelos = {};
    for (const producto of productos) {
      const modelo = producto.model.trim().toLowerCase();
      if (!contadorModelos[modelo]) {
        contadorModelos[modelo] = [];
      }
      contadorModelos[modelo].push(producto);
    }

    // Filtrar solo los modelos que se repiten
    const repetidos = Object.values(contadorModelos).filter(
      (lista) => lista.length > 1
    );
    
    res.json(repetidos);

  } catch (error) {
    console.error("Error al obtener productos repetidos:", error);
    res.status(500).json({ error: "Error al procesar la solicitud" });
  }
};


export const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByPk(id, {
      include: [
        {
          model: Image,
          as: "images",
          attributes: ["id", "url"], // Solo retorna los campos necesarios
        },
      ],
    });

    if (!product) {
      return res.status(404).json({ message: "Producto no encontrado." });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el producto." });
  }
};


//ORDENAR LOS PRODCUTOS 
export const ordenProducts =async (req, res) => {
try {
    const { ordenIds, categoryId } = req.body;

    if (!Array.isArray(ordenIds) || !categoryId) {
      return res.status(400).json({ error: "Faltan parámetros obligatorios" });
    }

    // Recorremos el array de IDs y actualizamos el orden en la tabla intermedia
    for (let i = 0; i < ordenIds.length; i++) {
      const productId = ordenIds[i];
      const orden = i + 1; // orden empezando en 1

      await ProductCategory.update(
        { orden },
        {
          where: {
            productId,
            categoryId,
          },
        }
      );
    }

    return res.json({ message: "Orden actualizado correctamente" });
  } catch (error) {
    console.error("Error actualizando orden:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};


//ACTUALIZA LOS PRECIOS MASIVAMENTE POR CATEGORIA ID 
export const updatePricesByIds = async (req, res) => {
  try {
    const { selectedIds, formula } = req.body;

    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      return res.status(400).json({ error: "Debe enviar un array de IDs" });
    }

    if (!formula || typeof formula !== "string") {
      return res.status(400).json({ error: "Debe enviar una fórmula válida" });
    }

    const products = await Product.findAll({
      where: {
        id: selectedIds,
      },
    });

    let updatedCount = 0;

    for (let product of products) {
      try {
        const newPrice = eval(`${product.price}${formula}`);
        if (!isNaN(newPrice)) {
          await product.update({ price: newPrice });
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error aplicando fórmula a producto ID ${product.id}:`, error);
      }
    }

    res.json({ message: "✅ Precios actualizados correctamente", count: updatedCount });
  } catch (err) {
    console.error("Error interno:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};


//Ruta para eliminar asociaciones producto-categoría sin eliminar imagenes
export const removeProductsFromCategory = async (req, res) => {
  try {
    const { categoryId, productIds } = req.body;

    if (!categoryId || !productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: "categoryId y productIds son requeridos" });
    }

    // Eliminar asociaciones
    const deleted = await ProductCategory.destroy({
      where: {
        categoryId,
        productId: productIds,  // Sequelize permite array para IN
      },
    });

    res.json({ message: `Se eliminaron ${deleted} asociaciones.` });
  } catch (error) {
    console.error("Error al eliminar asociaciones:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

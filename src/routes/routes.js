import { Router }from 'express';
//HANDLERS
import { createCategory, getAllCategories, deleteCategory } from "../controllers/handlerCategory.js"

import {searchId, createProduct, updateProduct, getAllProducts,
   getProductsByCategory, deleteProduct, productRetidos, ordenProducts,
   updatePricesByIds, removeProductsFromCategory} from '../controllers/handlerProducts.js'

import { deleteImageById } from '../controllers/handlerImages.js';

import { orderLimiter, validateOrder, handlerOrdenes, getOrders, deleteOrden } from '../controllers/handlerOrdenes.js';

import { uploadMedia, getGlbFiles , deleteFileFromStorage } from "../controllers/mediaController.js"

import { ScanProductos, GetJsoNScraping, getAllScrapedProducts, deleteScrapedJSON, 
  deleteAllScrapedJSON,vaciarCarpetaImages, } from "../controllers/handlerScanP.js"

import {filtrarProductosRepetidos, compararScrapingConDB,
   getProductosRepetidos} from "../controllers/hanlderMnatenimiento.js"

import axios from 'axios';
import dotenv from 'dotenv';
import upload from './multer.js'

//para pasar icon a webp
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// fin webp
//inicial
const router = Router();
dotenv.config();


//RUTAS CATEGORIA//
router.get('/getCategorias', getAllCategories);
router.post('/createCategory', createCategory);
router.delete('/deleteCategory', deleteCategory); //http://localhost:3001/api/deleteCategory?id=3 x query

//RUTAS PRODUCTS//
router.get('/all-products', getAllProducts);
router.get('/products/detail/:id', searchId);
router.get('/productos', getProductsByCategory); // busca por categoria categoryIds 
//ADMIN PRODUCTOS
router.get('/productos-repetidos', productRetidos), //busca por model reped
router.post('/createProduct', upload ,createProduct)
router.put('/updateProduct/:id', upload, updateProduct) 
router.delete('/dellProduct/:id', deleteProduct); // eliminar uno
router.delete('/dellProduct', deleteProduct);// eliminar muchos 
router.delete('/category/removeProducts', removeProductsFromCategory);// eliminar asocian de un producto de su categoria sin eliminar img
router.put('/updatePricesByIds', updatePricesByIds )
router.post('/ordenar', ordenProducts);
//FIN ADMIN PRODUCTOS

//RUTAS SERVIR IMAGENES DEL DISEÑO DE LA APPWEB
router.delete('/delete-image/:idImage', deleteImageById);

//RUTa video y 3d
router.post('/uploadMedia', upload, uploadMedia);
router.get('/glbs', getGlbFiles);

//RUTA PARA LAS ORDENES
router.post('/ordenes',orderLimiter, validateOrder, handlerOrdenes);
router.get('/ordenesGet', getOrders);
router.delete('/deleteOrden/:id', deleteOrden)



//ADMIN

// para que no se apague el servidor version fre
router.get('/ping', (req, res) => {
  res.status(200).send("pong");
});

// para crear iconos
router.post('/convert-images-to-webp', upload, async (req, res) => {
  try {
    if (!req.files || !req.files.images || req.files.images.length === 0) {
      return res.status(400).json({ error: 'No se subió ninguna imagen' });
    }

    const imageFile = req.files.images[0];

    const fileName = `${Date.now()}.webp`;
    const outputDir = path.join(__dirname, 'public', 'converted');
    const outputPath = path.join(outputDir, fileName);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

 await sharp(imageFile.buffer)
.resize({ width:130, height: 80, fit: 'inside' })
  .webp({ quality: 60 })
  .toFile(outputPath);

    return res.json({
      message: 'Imagen convertida y redimensionada correctamente',
      path: `/converted/${fileName}`,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al convertir la imagen' });
  }
});



//Mantenimiento:
//Scraper // mantener eliminadas o comentadas djes de trabajr en produccion
router.post('/ScanProductos', ScanProductos); // pasarle url para scraping

router.get('/GetJsoNScraping/:nombre', GetJsoNScraping);// get por nombre del json scraping
router.get('/GetAllJsoNScraping', getAllScrapedProducts);// get todos los json scraping

router.delete('/DELscraping/:nombre', deleteScrapedJSON);     // Elimina uno
router.delete('/DELscraping', deleteAllScrapedJSON);          // Elimina todos
router.delete('/VaciarPublicImage', vaciarCarpetaImages); //vaciar la carpeta public/images

//para cuando haga scraping fijarme dentro de los json si hay productos repetidos
router.get('/filtrarRepetidos', filtrarProductosRepetidos); // productos repetidos de los json de data/scraping.json 
router.get("/getProductosRepetidos", getProductosRepetidos); // muestra los productos repetidos quecrea la ruta /filtrarRepetidos
router.get('/compararScrapingConDB', compararScrapingConDB); // compara productos de los scarping con los del sistema
//Mantenimiento.






//MERCADOPAGO
// Configura el SDK de MercadoPago
// const accesso = process.env.MERCADOPAGO_ACCESS_TOKEN;
// const client = new mercadopago.MercadoPagoConfig({
//   accessToken: accesso,
// });
// // RUTA: Crear preferencia de pago
// router.post('/create_preference', async (req, res) => {
//   const { items } = req.body;
//   const preference = new Preference(client);

//   try {
//     const result = await preference.create({
//       body: {
//         items: items.map((item) => ({
//           title: item.model, // Se usa "title" en lugar de "model" (MercadoPago requiere title)
//           unit_price: Number(item.unit_price),
//           quantity: Number(item.quantity),
//           currency_id: item.currency_id,
//         })),
//         back_urls: {
//           success: 'http://localhost:5173', // Éxito
//           failure: 'http://localhost:5173', // Fallo
//           pending: 'http://localhost:5173', // Pendiente
//         },
//         auto_return: 'approved', // Permite volver automáticamente si se aprueba el pago
//       },
//     });

//     res.json({ id: result.id });
//   } catch (error) {
//     res.status(500).json({ error: 'Error creating preference' });
//   }
// });

// // RUTA: Obtener métodos de pago
// router.get('/metodos-pagos', async (req, res) => {
//   try {
//     // URL de la API de MercadoPago para obtener los medios de pago
//     const url = 'https://api.mercadopago.com/v1/payment_methods';
//     const config = {
//       headers: {
//         Authorization: `Bearer ${client.accessToken}`, 
//       },
//     };
//     // Hace la petición a la API de MercadoPago
//     const response = await axios.get(url, config);

//     // Devuelve los medios de pago
//     res.json(response.data);
//   } catch (error) {
//     res.status(500).json({ error: 'Error al obtener los medios de pago' });
//   }
// });

// // RUTA: Obtener cuotas de pago
// //http://localhost:3001/cuotas?amount=1000&payment_method_id=visa&issuer_id=123&country_code=AR
// router.get('/cuotas', async (req, res) => {
  
//   try {
//     // Parámetros necesarios para la API de MercadoPago
//     const amount = req.query.amount; // Monto del pago
//     const paymentMethodId = req.query.metodopagoID; // ID del medio de pago (ej: "visa")
//     const issuerId = req.query.issuer_id; // ID del banco emisor (opcional)
//     const countryCode = req.query.country_code || 'AR'; // Código de país (ej: "AR" para Argentina)
//     // Validar que los parámetros requeridos estén presentes
//     if (!amount || !paymentMethodId) {
//       return res.status(400).json({ error: 'Faltan parámetros requeridos: amount y payment_method_id' });
//     }
//     // URL de la API de MercadoPago para obtener las cuotas
//     const url = 'https://api.mercadopago.com/v1/payment_methods/installments';
//     // Configuración de la petición
//     const config = {
//       headers: {
//         Authorization: `Bearer ${client.accessToken}`, 
//       },
//       params: {
//         amount: amount,
//         payment_method_id: paymentMethodId,
//         issuer_id: issuerId, // Opcional
//         locale: 'es', // Idioma de la respuesta
//         country_code: countryCode,
//       },
//     };
//     // Hace la petición a la API de MercadoPago
//     const response = await axios.get(url, config);
//     // Devuelve las cuotas
//     res.json(response.data);

//   } catch (error) {
//     res.status(500).json({ error: 'Error al obtener las cuotas' });
//   }
// });







export default router;
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { Ordenes, OrdenesHeader } from '../database/models/modelOrdenes.js';
import Product from '../database/models/amodelProduct.js'; // para validar

//middlewares: para limitar ordenes y para validar datos antes de crear ordenes "handlerOrdenes"
// Rate limiter para evitar spam antes de pasar por el hanlder order
export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: 'Has alcanzado el límite de pedidos. Por favor, intenta de nuevo más tarde.',
});

// Validación de datos antes de pasar por el hanlder order
export const validateOrder = [

  body('fullName')
    .trim()
    .notEmpty().withMessage('Nombre obligatorio')
    .isLength({ min: 3, max: 100 }).withMessage('Nombre debe tener entre 3 y 100 caracteres'),

  body('email')
    .isEmail().withMessage('Email inválido'),

  body('phone')
    .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Teléfono inválido')
    .isLength({ min: 7, max: 20 }).withMessage('Teléfono debe tener entre 7 y 20 caracteres'),

  body('address')
    .trim()
    .notEmpty().withMessage('Dirección obligatoria')
    .isLength({ min: 5, max: 250 }).withMessage('Dirección debe tener entre 5 y 250 caracteres'),

  body('storeName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Nombre del local máximo 100 caracteres'),

  body('paymentMethod')
    .isIn(['Transferencia', 'MercadoPago', 'Efectivo'])
    .withMessage('Método de pago inválido'),

  body('deliveryType')
    .isIn(['Entrega estandar', 'Entrega anticipada'])
    .withMessage('Tipo de entrega inválido'),

  // VALIDAR PRODUCTO SI ESTA EN LA TABLA Y SI ES UN DATO VALIDO
  body('products')
    .isArray({ min: 1 })
    .withMessage('Debes incluir al menos un producto'),

  // Validar productId
  body('products.*.productId')
    .isInt({ gt: 0 })
    .withMessage('productId debe ser un entero positivo'),

  // Validar quantity
  body('products.*.quantity')
    .isInt({ gt: 0 })
    .withMessage('quantity debe ser un entero positivo'),

  // Validar price
  body('products.*.price')
    .custom(value => {
      // Acepta números o cadenas numéricas
      if (typeof value === 'number') return true;
      if (typeof value === 'string' && /^[0-9]+(\.[0-9]+)?$/.test(value)) return true;
      throw new Error('price debe ser un número o cadena numérica');
    }),

  // Detener aquí si alguno de los campos anteriores falló
  body('products').bail(),

  // Validación asíncrona: comprobar existencia en DB
  body('products')
    .custom(async (products) => {
      const ids = products.map(p => p.productId);
      const count = await Product.count({ where: { id: ids } });
      if (count !== ids.length) {
        throw new Error('Alguno de los productId no existe en la base de datos');
      }
      return true;
    }),


  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(410).json({ errors: errors.array() });
    next();
  },
];
// fin de middlewares


export const handlerOrdenes = async (req, res) => {
  try {
    const {
      fullName, email, phone, address, storeName, paymentMethod, deliveryType, products, userId = undefined,
    } = req.body;

    const status = "pending";
    const order = await Ordenes.create({
      fullName,
      email,
      phone,
      address,
      storeName,
      paymentMethod,
      deliveryType,
      userId,
      status,
      items: products.map(p => ({
        productId: Number(p.productId),    // ya viene número, pero por si acaso
        quantity: Number(p.quantity),      // igual, castea
        price: parseFloat(p.price),
      })),
    }, {
      include: [{ model: OrdenesHeader, as: 'items' }],
    });

    return res.status(201).json({ message: 'Pedido creado', orderId: order.id });
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
};


export const getOrders = async (req, res) => {
  try {
    const orders = await Ordenes.findAll({
      include: [{
        model: OrdenesHeader,
        as: 'items',
      }],
      order: [['createdAt', 'DESC']],
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor' });
  }
};

export const deleteOrden = async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: "ID inválido" });
  }
  try {
    // Primero elimina los items relacionados (OrdenesHeader)
    await OrdenesHeader.destroy({ where: { orderId: id } });
    // Luego elimina la orden
    const deleted = await Ordenes.destroy({ where: { id } });

    if (deleted) {
      return res.status(200).json({ message: 'Orden eliminada correctamente.' });
    } else {
      return res.status(404).json({ message: 'Orden no encontrada.' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
};
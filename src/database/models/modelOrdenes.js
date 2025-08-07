import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database.js";

// Modelo principal: la orden (cabecera)
export class Ordenes extends Model {}
Ordenes.init({
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { len: [2, 50], notEmpty: true },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { isEmail: true, notEmpty: true },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true, is: /^[0-9+\-\s()]{7,20}$/ },
  },
  address: {
    type: DataTypes.STRING(250),
    allowNull: false,
    validate: { notEmpty: true },
  },
  storeName: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.ENUM("Transferencia", "MercadoPago", "Efectivo"),
    allowNull: false,
  },
deliveryType: {
  type: DataTypes.ENUM('Entrega estandar', 'Entrega anticipada'),
  allowNull: false,
},
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
  },
  estimatedDeliveryDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Ordenes',
});

// Modelo detalle: los productos que forman parte de una orden
export class OrdenesHeader extends Model {}
OrdenesHeader.init({
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Ordenes,  // referencia al modelo 'Ordenes'
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
}, {
  sequelize,
  modelName: 'OrdenesHeader',
  timestamps: true, // createdAt y updatedAt

});

// Asociaciones


export default Ordenes;


// Explicación:
// Ordenes es la tabla principal con datos generales.

// OrdenesItem es la tabla con cada producto (detalle).

// Cada OrdenesItem tiene un orderId que apunta a la orden correspondiente.

// La asociación permite hacer consultas como:
// const orden = await Ordenes.findByPk(id, {
//   include: [{ model: OrdenesItem, as: 'items' }]
// });

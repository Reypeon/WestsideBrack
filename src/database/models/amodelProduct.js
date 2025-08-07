import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database.js";

class Product extends Model {}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true, // El modelo no debe estar vacío
        len: [2, 100], // Longitud mínima y máxima
      },
    },
    modelUser: {
      type: DataTypes.STRING,
      allowNull: true, // ✅ permite que no venga (y luego podés asignarle '' por código)
      validate: {
        len: [0, 100], // ✅ permite longitud vacía hasta 100
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    price: {
      type: DataTypes.DECIMAL(10, 0), // Precio con dos decimales
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0,
      },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0, // Inicializamos el stock en 0
      validate: {
        isInt: true, // Solo permite enteros
        min: 0,
      },
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 1, // Por ejemplo, para un carrito, inicia en 0
      validate: {
        isInt: true,
        min: 0,
      },
    },
  },
  {
    sequelize,
    modelName: "Product",
    tableName: "Products", // Nombre explícito de la tabla en plural
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
  }
);

export default Product;


// Relaciones con Categoría (N:1)
// Un producto pertenece a una categoría
// Product.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
// // Una categoría tiene muchos productos
// Category.hasMany(Product, { foreignKey: "categoryId", as: "products" });

// // Relaciones con Imágenes (1:N)
// // Un producto tiene muchas imágenes
// Product.hasMany(Image, { foreignKey: "productId", as: "images" });
// // Cada imagen pertenece a un producto
// Image.belongsTo(Product, { foreignKey: "productId", as: "product" });


// models/product.js
// import { DataTypes, Model } from 'sequelize';
// import {sequelize} from '../database.js';
// import Category from './modelCategory.js';

// class Product extends Model {}

// Product.init({
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },
//   model: DataTypes.STRING,
//   description: DataTypes.TEXT,
//   price: DataTypes.DECIMAL(10, 0),  // Sin decimales
//   stock: DataTypes.INTEGER,
//   filename: DataTypes.STRING,
//   size: DataTypes.INTEGER,
//   path: DataTypes.STRING,
//   originalname: DataTypes.STRING,
//   quantity: DataTypes.INTEGER, //para multiplicar en el carrito de compras es relativo
  
//   categoryId: {
//     type: DataTypes.INTEGER,
//     references: {
//       model: 'Categories',
//       key: 'id',
//     },
//   },
// }, {
//   sequelize,
//   modelName: 'Product',
// });
// //: Esto define una relación de pertenencia (belongsTo) donde cada Product pertenece a una Category. La clave foránea es categoryId y el alias es category.
// Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });
// // Esto define una relación de tener muchos (hasMany) donde una Category puede tener muchos Product. La clave foránea es categoryId y el alias es products.
// Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });

// export default Product;

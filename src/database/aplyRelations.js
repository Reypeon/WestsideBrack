import Category from "./models/modelCategory.js";
import Product from "./models/amodelProduct.js";
import Image from "./models/modelimages.js";
import ProductCategory from "./models/ProductCategory.js"; // Importamos el modelo intermedio
//imports ordenes para asociar por itemordenes las ordenes y productos
import { Ordenes, OrdenesHeader } from "./models/modelOrdenes.js"; // o desde donde corresponda


export default async function applyRelationships() {
  // Relación Muchos a Muchos entre Product y Category
Category.belongsToMany(Product, {
  through: ProductCategory,
  foreignKey: "categoryId",
  otherKey: "productId",
  as: "products",
});

Product.belongsToMany(Category, {
  through: ProductCategory,
  foreignKey: "productId",
  otherKey: "categoryId",
  as: "categories",
});
  // Relación Uno a Muchos entre Product e Image
  Product.hasMany(Image, {
    foreignKey: "productId",  // Relación de un producto a muchas imágenes
    as: "images",
  });

  Image.belongsTo(Product, {
    foreignKey: "productId",  // Relación de imagen a producto
    as: "product",
  });
// Asociación Ordenes y OrdenesHeader (orden y items)
  Ordenes.hasMany(OrdenesHeader, {
    as: "items",
    foreignKey: "orderId",
  });
  OrdenesHeader.belongsTo(Ordenes, {
    foreignKey: "orderId",
  });

  // Asociación OrdenesHeader y Product (cada item referencia a un producto)
  OrdenesHeader.belongsTo(Product, {
    foreignKey: "productId",
    as: "product",
 });
}
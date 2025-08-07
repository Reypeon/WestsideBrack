import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database.js";
import Product from "./amodelProduct.js"; // Importa el modelo Product
import Category from "./modelCategory.js"; // Importa el modelo Category

class ProductCategory extends Model {}

ProductCategory.init(
  {
    productId: {
      type: DataTypes.INTEGER,
      references: {
        model: Product,
        key: "id",
      },
      allowNull: false, // Clave foránea obligatoria
    },
    categoryId: {
      type: DataTypes.INTEGER,
      references: {
        model: Category,
        key: "id",
      },
      allowNull: false, // Clave foránea obligatoria
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: true, // Puede ser null inicialmente
    },
  },
  {
    sequelize,
    modelName: "ProductCategory",
    tableName: "ProductCategories", // Nombre explícito para la tabla
    timestamps: true, // Incluye createdAt y updatedAt
    indexes: [
      {
        unique: true, // Evita duplicados
        fields: ["productId", "categoryId"], // Índice único compuesto
      },
    ],
  }
);

export default ProductCategory;

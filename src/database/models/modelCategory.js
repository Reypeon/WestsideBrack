import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database.js";

class Category extends Model {}

Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(50), // límite explícito en la base de datos
      allowNull: false, // campo obligatorio
      unique: true, // nombres únicos en la tabla
      validate: {
        notEmpty: {
          msg: "El nombre no puede estar vacío",
        },
        len: {
          args: [2, 50],
          msg: "El nombre debe tener entre 2 y 50 caracteres",
        },
      },
      
    },
    /*
    // Si necesitás jerarquía (categorías y subcategorías)
    parentCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Categories",
        key: "id",
      },
      onDelete: 'SET NULL',  // Opcional: qué pasa si la categoría padre se elimina
      onUpdate: 'CASCADE',
    },
    */
  },
  {
    sequelize,
    modelName: "Category",
    tableName: "Categories", // Nombre explícito para la tabla
    timestamps: false, // createdAt y updatedAt
    underscored: true, // Si querés columnas created_at y updated_at en lugar de camelCase
    paranoid: false, // Si querés eliminar lógicamente, poner true y usar deletedAt
    indexes: [
      {
        unique: true,
        fields: ['name'],
      },
    ],
  }
);

export default Category;

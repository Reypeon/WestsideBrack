import { DataTypes, Model } from "sequelize";
import { sequelize } from "../database.js";

class Image extends Model {}

Image.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    urlWEBP: {
      type: DataTypes.STRING,
      allowNull: true, // Puede estar vacío
    },

    urlJPG: {
      type: DataTypes.STRING,
      allowNull: true, // Puede estar vacío
    },
    alt: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: '',  // 👈 evita error si no mandás alt
      validate: {
        notEmpty: true,
        len: [3, 5000],
      },
    },

    productId: {
      type: DataTypes.INTEGER,
      references: {
        model: "Products",
        key: "id",
      },
      onDelete: "CASCADE",
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Image",
    tableName: "Images",
    timestamps: true,
  }
);

export default Image;

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

    url: {
      type: DataTypes.STRING,
      allowNull: true, // Ahora puede estar vacío
    },

    urlZoom: {
      type: DataTypes.STRING,
      allowNull: true, // Puede estar vacío
    },

    urlWEBP: {
      type: DataTypes.STRING,
      allowNull: true, // Puede estar vacío
    },

    urlZoomWEBP: {
      type: DataTypes.STRING,
      allowNull: true, // Puede estar vacío
    },
    alt: {
      type: DataTypes.TEXT,
      allowNull: false,
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

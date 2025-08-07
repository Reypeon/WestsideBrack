import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Ignora certificados autofirmados (útil para Supabase)
    },
  },
  logging: false,
});


export { sequelize };


// PARA  CONECTARME A LA BASE DE DATOS LOCAL MANUALMENTE
// import {Sequelize} from "sequelize";
//  const sequelize = new Sequelize('postgres://postgres:admin@localhost:5432/WestsideDBlocal'); // Example 
// export {sequelize}
//No eliminar
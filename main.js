import app from "./src/app.js";
import { sequelize } from "./src/database/database.js";
import applyRelationships from "./src/database/aplyRelations.js";
import dotenv from "dotenv";
// import logger from "./src/logger.js";

dotenv.config();

const PORT = process.env.PORT || 3001;

async function main() {
  try {
    // 1. Aplicar relaciones (si tenés definidas asociaciones entre modelos)
    await applyRelationships();

    // 2. Sincronizar modelos con la base de datos (crea tablas si no existen)
    // force: false -> NO borra las tablas, solo crea las que faltan
    await sequelize.sync({ alter: true });

    // 3. Levantar el servidor para escuchar conexiones
    app.listen(PORT,() => {
      console.log(`Servidor escuchando en puerto ${PORT}`);
    });

  } catch (error) {
    console.error("Error al levantar el server || orm:", error);
    process.exit(1);
  }
}

main();




//npm install helmet
//npm install -g pm2
//npm install -g pm2-windows-service
//pm2-service-install
///npm install @supabase/supabase-js 


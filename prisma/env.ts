// Carga las variables antes que cualquier otro módulo. .env.local (token de Blob generado por
// Vercel) tiene prioridad sobre .env.
import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

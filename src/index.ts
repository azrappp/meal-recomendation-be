import express from "express";
import cors from "cors";
import { clientRoutes } from "./routes/client.routes";
import { screeningRoutes } from "./routes/screening.routes";
const app = express();

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.json({
    message: "Meal screening REST API is running",
  });
});

app.use("/api/clients", clientRoutes);
app.use("/api/screening", screeningRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

import express from "express";
import cors from "cors";
import { clientRoutes } from "./routes/client.routes.js";
import { screeningRoutes } from "./routes/screening.routes.js";
import { mealRecommendationRoutes } from "./routes/meal.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.json({
    message: "Meal screening REST API is running",
  });
});

app.get("/api/vercel-test", (req, res) => {
  res.json({
    message: "Vercel is using this api/index.ts",
    time: new Date().toISOString(),
  });
});
app.use("/api/clients", clientRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/meal", mealRecommendationRoutes);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
export default app;

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
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
export default app;

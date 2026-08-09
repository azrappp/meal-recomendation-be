import { Router } from "express";
import prisma from "../lib/prisma.js";

export const mealRecommendationRoutes = Router();

type DiseaseStatusInput = {
  diabetesStatus: string | null;
  hypertensionStatus: string | null;
  obesityStatus: string | null;
};

type FastApiMealPayload = {
  energy_kcal: number;
  diet_type: string;
  carb_g: number;
  protein_g: number;
  fat_g: number;
  sodium_mg_max: number;
  fiber_g_min: number;
};

type FastApiMealItem = {
  food_name: string;
  category_code: string;
  portion: number;
  urt: string | null;
  gram: number;
  gram_per_portion?: number | null;
  urt_qty?: number | null;
  urt_unit?: string | null;
  energy_kcal: number;
  protein_g: number;
  fat_g: number;
  carb_g: number;
  sodium_mg?: number | null;
  fiber_g?: number | null;
};

type FastApiMeal = {
  meal_time: string;
  items: FastApiMealItem[];
};

type FastApiMealResponse = {
  daily_total: {
    energy_kcal: number;
    protein_g: number;
    fat_g: number;
    carb_g: number;
    sodium_mg: number;
    fiber_g: number;
  };
  meals: FastApiMeal[];
};

type MenuDayWithRecommendation = {
  menuDayId: number;
  dayNumber: number;
  menuDate: Date;
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  menuRecommendation: {
    menuRecommendationId: number;
    screeningId: number;
    dietType: string;
    generatedAt: Date;
  };
};

type NutritionTotals = {
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  sodiumMg: number;
  fiberG: number;
};

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL || "https://menu-api-rust.vercel.app";
/**
 * Get required data for FastAPI meal recommendation
 * This endpoint only checks and previews the payload.
 */
type SavedMenuItem = {
  mealTime: string;
  foodName: string;
  categoryCode: string;
  portion: number;
  urt: string | null;
  gram: number | null;
};
type SavedMenuDay = {
  dayNumber: number;
  menuDate: Date;
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  items: SavedMenuItem[];
};

type SavedWeeklyMenu = {
  menuRecommendationId: number;
  screeningId: number;
  dietType: string;
  targetEnergyKcal: number;
  totalDays: number;
  generatedAt: Date;
  startDate: Date;
  days: SavedMenuDay[];
};

type SimpleMenuItem = {
  foodName: string;
  categoryCode: string;
  portion: number;
  urt: string | null;
  gram: number | null;
};

type SimpleMeal = {
  mealTime: string;
  items: SimpleMenuItem[];
};

type SimpleWeeklyMenuDay = {
  dayNumber: number;
  menuDate: Date;
  summary: {
    energyKcal: number;
    proteinG: number;
    fatG: number;
    carbG: number;
  };
  meals: SimpleMeal[];
};

type SimpleWeeklyMenu = {
  menuRecommendationId: number;
  screeningId: number;
  dietType: string;
  targetEnergyKcal: number;
  totalDays: number;
  generatedAt: Date;
  startDate: Date;
  days: SimpleWeeklyMenuDay[];
};

const WEEKLY_RULES: Record<string, number> = {
  LH: 3,
  LN: 4,
  S: 3,
  B: 3,
  MP: 7,
  SS: 7,
  M: 7,
};

function simplifyWeeklyMenu(
  savedWeeklyMenu: SavedWeeklyMenu,
): SimpleWeeklyMenu {
  return {
    menuRecommendationId: savedWeeklyMenu.menuRecommendationId,
    screeningId: savedWeeklyMenu.screeningId,
    dietType: savedWeeklyMenu.dietType,
    targetEnergyKcal: savedWeeklyMenu.targetEnergyKcal,
    totalDays: savedWeeklyMenu.totalDays,
    generatedAt: savedWeeklyMenu.generatedAt,
    startDate: savedWeeklyMenu.startDate,

    days: savedWeeklyMenu.days.map((day) => ({
      dayNumber: day.dayNumber,
      menuDate: day.menuDate,
      summary: {
        energyKcal: day.energyKcal,
        proteinG: day.proteinG,
        fatG: day.fatG,
        carbG: day.carbG,
      },
      meals: groupItemsByMealSimple(day.items),
    })),
  };
}

function groupItemsByMealSimple(items: SavedMenuItem[]): SimpleMeal[] {
  const mealOrder = [
    "breakfast",
    "morning_snack",
    "lunch",
    "afternoon_snack",
    "dinner",
  ];

  const grouped: Record<string, SimpleMenuItem[]> = {};

  for (const item of items) {
    if (!grouped[item.mealTime]) {
      grouped[item.mealTime] = [];
    }

    grouped[item.mealTime].push({
      foodName: item.foodName,
      categoryCode: item.categoryCode,
      portion: item.portion,
      urt: item.urt,
      gram: item.gram,
    });
  }

  return mealOrder
    .filter((mealTime) => grouped[mealTime])
    .map((mealTime) => ({
      mealTime,
      items: grouped[mealTime],
    }));
}

function buildExcludedFoodNames(
  categoryUsedFoodCounts: Record<string, Record<string, number>>,
): string[] {
  const excluded: string[] = [];

  for (const [categoryCode, foodCounts] of Object.entries(
    categoryUsedFoodCounts,
  )) {
    const maxRepeat = WEEKLY_RULES[categoryCode] ?? 7;

    for (const [foodName, count] of Object.entries(foodCounts)) {
      const useHardExclusion =
        categoryCode === "LH" || categoryCode === "S" || categoryCode === "B";

      if (useHardExclusion && count >= maxRepeat) {
        excluded.push(foodName);
      }
    }
  }

  return excluded;
}

function buildAllowedFoodNamesForDay(day: number): string[] {
  const alwaysAllowed = [
    // MP
    "Nasi",
    "Nasi beras merah",

    // LN
    "Kembang tahu",
    "Oncom",
    "Tempe kedelai, mentah",

    // SS
    "Susu kambing, segar",
    "Susu kerbau, segar",
    "Susu sapi, segar",

    // M
    "Minyak kacang tanah",
    "Minyak kedelai",
    "Minyak kelapa",
    "Minyak zaitun",
    "Mentega",
    //G
    "Gula kelapa",
  ];

  const lhRotation = [
    [
      "Ayam, daging, segar",
      "Ikan kakap, segar",
      "Cumi-cumi, segar",
      "Belut, segar",
    ],
    [
      "Sapi, daging, kurus, segar",
      "Ikan mas, segar",
      "Kerang, segar",
      "Ikan lemuru, segar",
    ],
    [
      "Ayam, daging, segar",
      "Ikan kakap, segar",
      "Ikan mas, segar",
      "Cumi-cumi, segar",
    ],
  ];

  const vegetableRotation = [
    ["Bayam, segar", "Wortel, segar", "Rebung, segar", "Kangkung, segar"],
    [
      "Labu siam, segar",
      "Kacang panjang, segar",
      "Buncis, segar",
      "Sawi, segar",
    ],
    [
      "Daun pepaya, segar",
      "Daun singkong, segar",
      "Kecipir muda, segar",
      "Terong, segar",
    ],
  ];

  const fruitRotation = [
    ["Apel malang, segar", "Duku, segar", "Melon, segar", "Jeruk manis, segar"],
    [
      "Pisang ambon, segar",
      "Mangga, segar",
      "Semangka, segar",
      "Sirsak, segar",
    ],
    [
      "Rambutan, segar",
      "Manggis, segar",
      "Markisa, segar",
      "Jeruk bali, segar",
    ],
  ];

  const index = (day - 1) % 3;

  return [
    ...alwaysAllowed,
    ...lhRotation[index],
    ...vegetableRotation[index],
    ...fruitRotation[index],
  ];
}

function updateWeeklyHistory(
  weeklyHistory: {
    usedFoodCounts: Record<string, number>;
    categoryUsedFoodCounts: Record<string, Record<string, number>>;
  },
  dailyMenu: FastApiMealResponse,
) {
  const foodsUsedToday = new Map<string, string>();

  for (const meal of dailyMenu.meals) {
    for (const item of meal.items) {
      foodsUsedToday.set(item.food_name, item.category_code);
    }
  }

  for (const [foodName, categoryCode] of foodsUsedToday.entries()) {
    weeklyHistory.usedFoodCounts[foodName] =
      (weeklyHistory.usedFoodCounts[foodName] ?? 0) + 1;

    if (!weeklyHistory.categoryUsedFoodCounts[categoryCode]) {
      weeklyHistory.categoryUsedFoodCounts[categoryCode] = {};
    }

    weeklyHistory.categoryUsedFoodCounts[categoryCode][foodName] =
      (weeklyHistory.categoryUsedFoodCounts[categoryCode][foodName] ?? 0) + 1;
  }
}

mealRecommendationRoutes.get("/:screeningId", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

    const { startDate } = req.body as { startDate?: string };

    const baseDate = startDate ? new Date(startDate) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      return res.status(400).json({
        message: "Invalid startDate format. Use YYYY-MM-DD.",
      });
    }
    if (!Number.isInteger(screeningId) || screeningId <= 0) {
      return res.status(400).json({
        message: "Valid screeningId is required",
      });
    }

    const screening = await prisma.screeningSession.findUnique({
      where: {
        screeningId,
      },
      include: {
        client: true,
        screeningResult: true,
        energyRequirement: true,
      },
    });

    if (!screening) {
      return res.status(404).json({
        message: "Screening session not found",
      });
    }

    if (!screening.screeningResult) {
      return res.status(400).json({
        message: "Screening result has not been generated",
      });
    }

    if (!screening.energyRequirement) {
      return res.status(400).json({
        message: "Energy requirement has not been calculated",
      });
    }

    const dietType = buildDietType({
      diabetesStatus: screening.screeningResult.diabetesStatus,
      hypertensionStatus: screening.screeningResult.hypertensionStatus,
      obesityStatus: screening.screeningResult.obesityStatus,
    });

    const fastApiPayload = buildFastApiPayload({
      dietType,
      dailyEnergyKcal: screening.energyRequirement.dailyEnergyKcal,
      carbohydrateGram: screening.energyRequirement.carbohydrateGram,
      proteinGram: screening.energyRequirement.proteinGram,
      fatGram: screening.energyRequirement.fatGram,
    });

    return res.status(200).json({
      message: "Meal recommendation data retrieved successfully",
      data: {
        screeningId: screening.screeningId,
        client: {
          clientId: screening.client.clientId,
          fullName: screening.client.fullName,
          age: screening.client.age,
          gender: screening.client.gender,
        },
        screeningResult: {
          diabetesStatus: screening.screeningResult.diabetesStatus,
          hypertensionStatus: screening.screeningResult.hypertensionStatus,
          obesityStatus: screening.screeningResult.obesityStatus,
          finalScreeningCategory:
            screening.screeningResult.finalScreeningCategory,
        },
        energyRequirement: {
          dailyEnergyKcal: screening.energyRequirement.dailyEnergyKcal,
          carbohydrateGram: screening.energyRequirement.carbohydrateGram,
          proteinGram: screening.energyRequirement.proteinGram,
          fatGram: screening.energyRequirement.fatGram,
        },
        fastApiPayload,
      },
    });
  } catch (error: unknown) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to retrieve meal recommendation data",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Generate menu recommendation from FastAPI.
 * This endpoint calls the MILP engine.
 */
mealRecommendationRoutes.post("/:screeningId/menu", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);
    const { startDate } = req.body as { startDate?: string };
    const baseDate = startDate ? new Date(startDate) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      return res.status(400).json({
        message: "Invalid startDate format. Use YYYY-MM-DD.",
      });
    }

    if (!Number.isInteger(screeningId) || screeningId <= 0) {
      return res.status(400).json({
        message: "Valid screeningId is required",
      });
    }

    const screening = await prisma.screeningSession.findUnique({
      where: {
        screeningId,
      },
      include: {
        client: true,
        screeningResult: true,
        energyRequirement: true,
      },
    });

    if (!screening) {
      return res.status(404).json({
        message: "Screening session not found",
      });
    }

    if (!screening.screeningResult) {
      return res.status(400).json({
        message: "Screening result has not been generated",
      });
    }

    if (!screening.energyRequirement) {
      return res.status(400).json({
        message: "Energy requirement has not been calculated",
      });
    }

    const dietType = buildDietType({
      diabetesStatus: screening.screeningResult.diabetesStatus,
      hypertensionStatus: screening.screeningResult.hypertensionStatus,
      obesityStatus: screening.screeningResult.obesityStatus,
    });

    const fastApiPayload = buildFastApiPayload({
      dietType,
      dailyEnergyKcal: screening.energyRequirement.dailyEnergyKcal,
      carbohydrateGram: screening.energyRequirement.carbohydrateGram,
      proteinGram: screening.energyRequirement.proteinGram,
      fatGram: screening.energyRequirement.fatGram,
    });

    const fastApiResponse = await fetch(`${FASTAPI_BASE_URL}/recommend-menu`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(fastApiPayload),
    });

    const responseBody = await fastApiResponse.json();

    if (!fastApiResponse.ok) {
      return res.status(422).json({
        message: "FastAPI failed to generate menu recommendation",
        fastApiPayload,
        detail: responseBody,
      });
    }

    const savedMenu = await saveGeneratedMenu({
      screeningId,
      dietType,
      fastApiPayload,
      generatedMenu: responseBody,
      startDate: baseDate,
    });

    return res.status(201).json({
      message: "Menu recommendation generated and saved successfully",
      screeningId,
      dietType,
      fastApiPayload,
      data: savedMenu,
    });
  } catch (error: unknown) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

mealRecommendationRoutes.post(
  "/client/:clientId/menu-weekly",
  async (req, res) => {
    try {
      const clientId = Number(req.params.clientId);

      const { startDate } = (req.body ?? {}) as { startDate?: string };

      const baseDate = startDate ? new Date(startDate) : new Date();

      if (Number.isNaN(baseDate.getTime())) {
        return res.status(400).json({
          message: "Invalid startDate format. Use YYYY-MM-DD.",
        });
      }

      if (!Number.isInteger(clientId) || clientId <= 0) {
        return res.status(400).json({
          message: "Valid clientId is required",
        });
      }

      const latestScreening = await prisma.screeningSession.findFirst({
        where: {
          clientId,
        },
        orderBy: [
          {
            screeningId: "desc",
          },
        ],
        include: {
          client: true,
          screeningResult: true,
          energyRequirement: true,
        },
      });

      if (!latestScreening) {
        return res.status(404).json({
          message: "No screening session found for this client",
          clientId,
        });
      }

      if (!latestScreening.screeningResult) {
        return res.status(400).json({
          message: "Latest screening result has not been generated",
          clientId,
          screeningId: latestScreening.screeningId,
        });
      }

      if (!latestScreening.energyRequirement) {
        return res.status(400).json({
          message:
            "Energy requirement has not been calculated for latest screening",
          clientId,
          screeningId: latestScreening.screeningId,
        });
      }

      const screeningId = latestScreening.screeningId;

      const dietType = buildDietType({
        diabetesStatus: latestScreening.screeningResult.diabetesStatus,
        hypertensionStatus: latestScreening.screeningResult.hypertensionStatus,
        obesityStatus: latestScreening.screeningResult.obesityStatus,
      });

      const fastApiPayload = buildFastApiPayload({
        dietType,
        dailyEnergyKcal: latestScreening.energyRequirement.dailyEnergyKcal,
        carbohydrateGram: latestScreening.energyRequirement.carbohydrateGram,
        proteinGram: latestScreening.energyRequirement.proteinGram,
        fatGram: latestScreening.energyRequirement.fatGram,
      });

      const weeklyHistory = {
        usedFoodCounts: {} as Record<string, number>,
        categoryUsedFoodCounts: {} as Record<string, Record<string, number>>,
      };

      const generatedMenus: FastApiMealResponse[] = [];

      for (let day = 1; day <= 7; day++) {
        const rotatedAllowedFoodNames = buildAllowedFoodNamesForDay(day);

        const userExcludedFoods: string[] = [];

        const rotatedPayload = {
          ...fastApiPayload,
          day_number: day,
          allowed_food_names: rotatedAllowedFoodNames,
          excluded_food_names: userExcludedFoods,
          used_food_counts: weeklyHistory.usedFoodCounts,
        };

        const fastApiResponse = await fetch(
          `${FASTAPI_BASE_URL}/recommend-menu`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(rotatedPayload),
          },
        );

        const responseBody = await fastApiResponse.json();

        if (!fastApiResponse.ok) {
          return res.status(422).json({
            message: `FastAPI failed to generate menu recommendation for day ${day}`,
            clientId,
            screeningId,
            day,
            dietType,
            fastApiPayload: rotatedPayload,
            detail: responseBody,
          });
        }

        generatedMenus.push(responseBody);
        updateWeeklyHistory(weeklyHistory, responseBody);
      }

      const savedWeeklyMenu = await saveGeneratedWeeklyMenu({
        screeningId,
        dietType,
        fastApiPayload,
        generatedMenus,
        startDate: baseDate,
      });

      return res.status(201).json({
        message:
          "Weekly menu recommendation generated from latest screening and saved successfully",
        clientId,
        screeningId,
        dietType,
        fastApiPayload,
        weeklyHistory,
        data: simplifyWeeklyMenu(savedWeeklyMenu),
      });
    } catch (error: unknown) {
      console.error(error);

      return res.status(500).json({
        message: "Internal server error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

mealRecommendationRoutes.post("/:screeningId/menu-weekly", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

    const { startDate } = (req.body ?? {}) as { startDate?: string };

    const baseDate = startDate ? new Date(startDate) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      return res.status(400).json({
        message: "Invalid startDate format. Use YYYY-MM-DD.",
      });
    }

    if (!Number.isInteger(screeningId) || screeningId <= 0) {
      return res.status(400).json({
        message: "Valid screeningId is required",
      });
    }

    const screening = await prisma.screeningSession.findUnique({
      where: {
        screeningId,
      },
      include: {
        client: true,
        screeningResult: true,
        energyRequirement: true,
      },
    });

    if (!screening) {
      return res.status(404).json({
        message: "Screening session not found",
      });
    }

    if (!screening.screeningResult) {
      return res.status(400).json({
        message: "Screening result has not been generated",
      });
    }

    if (!screening.energyRequirement) {
      return res.status(400).json({
        message: "Energy requirement has not been calculated",
      });
    }

    const dietType = buildDietType({
      diabetesStatus: screening.screeningResult.diabetesStatus,
      hypertensionStatus: screening.screeningResult.hypertensionStatus,
      obesityStatus: screening.screeningResult.obesityStatus,
    });

    const fastApiPayload = buildFastApiPayload({
      dietType,
      dailyEnergyKcal: screening.energyRequirement.dailyEnergyKcal,
      carbohydrateGram: screening.energyRequirement.carbohydrateGram,
      proteinGram: screening.energyRequirement.proteinGram,
      fatGram: screening.energyRequirement.fatGram,
    });

    const weeklyHistory = {
      usedFoodCounts: {} as Record<string, number>,
      categoryUsedFoodCounts: {} as Record<string, Record<string, number>>,
    };

    const generatedMenus: FastApiMealResponse[] = [];

    for (let day = 1; day <= 7; day++) {
      const rotatedAllowedFoodNames = buildAllowedFoodNamesForDay(day);

      const userExcludedFoods: string[] = [];

      const rotatedPayload = {
        ...fastApiPayload,
        day_number: day,
        allowed_food_names: rotatedAllowedFoodNames,
        excluded_food_names: userExcludedFoods,
      };

      const fastApiResponse = await fetch(
        `${FASTAPI_BASE_URL}/recommend-menu`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(rotatedPayload),
        },
      );

      const responseBody = await fastApiResponse.json();

      if (!fastApiResponse.ok) {
        return res.status(422).json({
          message: `FastAPI failed to generate menu recommendation for day ${day}`,
          day,
          detail: responseBody,
        });
      }
      generatedMenus.push(responseBody);
      updateWeeklyHistory(weeklyHistory, responseBody);
    }

    const savedWeeklyMenu = await saveGeneratedWeeklyMenu({
      screeningId,
      dietType,
      fastApiPayload,
      generatedMenus,
      startDate: baseDate,
    });

    return res.status(201).json({
      message: "Weekly menu recommendation generated and saved successfully",
      screeningId,
      dietType,
      fastApiPayload,
      weeklyHistory,
      data: simplifyWeeklyMenu(savedWeeklyMenu),
    });
  } catch (error: unknown) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

function buildFastApiPayload(params: {
  dietType: string;
  dailyEnergyKcal: number;
  carbohydrateGram: number;
  proteinGram: number;
  fatGram: number;
}): FastApiMealPayload {
  return {
    energy_kcal: Math.round(params.dailyEnergyKcal),
    diet_type: params.dietType,
    carb_g: params.carbohydrateGram,
    protein_g: params.proteinGram,
    fat_g: params.fatGram,
    sodium_mg_max: getSodiumLimitByDietType(params.dietType),
    fiber_g_min: getFiberMinimumByDietType(params.dietType),
  };
}

function buildDietType(status: DiseaseStatusInput): string {
  const hasDM = isPositiveStatus(status.diabetesStatus);
  const hasHT = isPositiveStatus(status.hypertensionStatus);
  const hasObesity = isPositiveStatus(status.obesityStatus);

  if (hasDM && hasHT && hasObesity) return "DM_HT_OBESITY";
  if (hasDM && hasHT) return "DM_HT";
  if (hasDM && hasObesity) return "DM_OBESITY";
  if (hasHT && hasObesity) return "HT_OBESITY";
  if (hasDM) return "DM";
  if (hasHT) return "HT";
  if (hasObesity) return "OBESITY";

  return "GENERAL";
}

function isPositiveStatus(status: string | null): boolean {
  if (!status) return false;

  const normalizedStatus = status.toLowerCase().trim();

  const negativeKeywords = [
    "no",
    "false",
    "negative",
    "negatif",
    "normal",
    "none",
    "tidak",
    "bukan",
    "rendah",
    "low",
  ];

  if (negativeKeywords.some((keyword) => normalizedStatus.includes(keyword))) {
    return false;
  }

  const positiveKeywords = [
    "yes",
    "true",
    "positive",
    "positif",
    "diabetes",
    "dm",
    "hypertension",
    "hipertensi",
    "obesity",
    "obesitas",
    "obese",
    "tinggi",
    "high",
    "abnormal",
  ];

  return positiveKeywords.some((keyword) => normalizedStatus.includes(keyword));
}

function getSodiumLimitByDietType(dietType: string): number {
  if (dietType.includes("HT")) {
    return 2000;
  }

  return 2300;
}

function getFiberMinimumByDietType(dietType: string): number {
  if (dietType.includes("DM")) {
    return 25;
  }

  return 25;
}

async function saveGeneratedMenu(params: {
  screeningId: number;
  dietType: string;
  fastApiPayload: FastApiMealPayload;
  generatedMenu: FastApiMealResponse;
  startDate: Date;
}) {
  const { screeningId, dietType, fastApiPayload, generatedMenu, startDate } =
    params;

  return prisma.menuRecommendation.create({
    data: {
      screeningId,
      dietType,
      targetEnergyKcal: fastApiPayload.energy_kcal,
      targetCarbohydrateG: fastApiPayload.carb_g,
      targetProteinG: fastApiPayload.protein_g,
      targetFatG: fastApiPayload.fat_g,
      sodiumMaxMg: fastApiPayload.sodium_mg_max,
      fiberMinG: fastApiPayload.fiber_g_min,
      totalDays: 1,
      generationStatus: "SUCCESS",

      days: {
        create: [
          {
            dayNumber: 1,
            menuDate: startDate,
            energyKcal: generatedMenu.daily_total.energy_kcal,
            proteinG: generatedMenu.daily_total.protein_g,
            fatG: generatedMenu.daily_total.fat_g,
            carbG: generatedMenu.daily_total.carb_g,
            sodiumMg: generatedMenu.daily_total.sodium_mg,
            fiberG: generatedMenu.daily_total.fiber_g,

            items: {
              create: generatedMenu.meals.flatMap((meal: FastApiMeal) =>
                meal.items.map((item: FastApiMealItem) => ({
                  mealTime: meal.meal_time,
                  foodName: item.food_name,
                  categoryCode: item.category_code,
                  portion: item.portion,
                  urt: item.urt,
                  gram: item.gram,
                  gramPerPortion: item.gram_per_portion ?? null,
                  urtQty: item.urt_qty ?? null,
                  urtUnit: item.urt_unit ?? null,
                  energyKcal: item.energy_kcal,
                  proteinG: item.protein_g,
                  fatG: item.fat_g,
                  carbG: item.carb_g,
                  sodiumMg: item.sodium_mg ?? 0,
                  fiberG: item.fiber_g ?? 0,
                })),
              ),
            },
          },
        ],
      },
    },
    include: {
      days: {
        include: {
          items: true,
        },
      },
    },
  });
}

mealRecommendationRoutes.get("/:screeningId/menus", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

    if (!Number.isInteger(screeningId) || screeningId <= 0) {
      return res.status(400).json({
        message: "Valid screeningId is required",
      });
    }

    const menus = await prisma.menuRecommendation.findMany({
      where: {
        screeningId,
      },
      orderBy: {
        generatedAt: "desc",
      },
      include: {
        days: {
          orderBy: {
            dayNumber: "asc",
          },
          include: {
            items: {
              orderBy: {
                mealTime: "asc",
              },
            },
          },
        },
      },
    });

    return res.status(200).json({
      message: "Saved menu recommendations retrieved successfully",
      screeningId,
      data: menus,
    });
  } catch (error: unknown) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to retrieve saved menu recommendations",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

async function saveGeneratedWeeklyMenu(params: {
  screeningId: number;
  dietType: string;
  fastApiPayload: FastApiMealPayload;
  generatedMenus: FastApiMealResponse[];
  startDate: Date;
}) {
  const { screeningId, dietType, fastApiPayload, generatedMenus, startDate } =
    params;

  const menuRecommendation = await prisma.menuRecommendation.create({
    data: {
      screeningId,
      dietType,
      targetEnergyKcal: fastApiPayload.energy_kcal,
      targetCarbohydrateG: fastApiPayload.carb_g,
      targetProteinG: fastApiPayload.protein_g,
      targetFatG: fastApiPayload.fat_g,
      sodiumMaxMg: fastApiPayload.sodium_mg_max,
      fiberMinG: fastApiPayload.fiber_g_min,
      totalDays: 7,
      generationStatus: "SUCCESS",

      days: {
        create: generatedMenus.map((menu, index) => ({
          dayNumber: index + 1,
          menuDate: addDays(startDate, index),
          energyKcal: menu.daily_total.energy_kcal,
          proteinG: menu.daily_total.protein_g,
          fatG: menu.daily_total.fat_g,
          carbG: menu.daily_total.carb_g,
          sodiumMg: menu.daily_total.sodium_mg,
          fiberG: menu.daily_total.fiber_g,

          items: {
            create: menu.meals.flatMap((meal: FastApiMeal) =>
              meal.items.map((item: FastApiMealItem) => ({
                mealTime: meal.meal_time,
                foodName: item.food_name,
                categoryCode: item.category_code,
                portion: item.portion,
                urt: item.urt,
                gram: item.gram,
                gramPerPortion: item.gram_per_portion ?? null,
                urtQty: item.urt_qty ?? null,
                urtUnit: item.urt_unit ?? null,
                energyKcal: item.energy_kcal,
                proteinG: item.protein_g,
                fatG: item.fat_g,
                carbG: item.carb_g,
                sodiumMg: item.sodium_mg ?? 0,
                fiberG: item.fiber_g ?? 0,
              })),
            ),
          },
        })),
      },
    },
    include: {
      days: {
        orderBy: {
          dayNumber: "asc",
        },
        include: {
          items: true,
        },
      },
    },
  });

  return {
    ...menuRecommendation,
    startDate,
  };
}

mealRecommendationRoutes.get(
  "/menu/:menuRecommendationId",
  async (req, res) => {
    try {
      const menuRecommendationId = Number(req.params.menuRecommendationId);

      if (
        !Number.isInteger(menuRecommendationId) ||
        menuRecommendationId <= 0
      ) {
        return res.status(400).json({
          message: "Valid menuRecommendationId is required",
        });
      }

      const menu = await prisma.menuRecommendation.findUnique({
        where: {
          menuRecommendationId,
        },
        include: {
          days: {
            orderBy: {
              dayNumber: "asc",
            },
            include: {
              items: {
                orderBy: {
                  mealTime: "asc",
                },
              },
            },
          },
        },
      });

      if (!menu) {
        return res.status(404).json({
          message: "Menu recommendation not found",
        });
      }

      return res.status(200).json({
        message: "Menu recommendation retrieved successfully",
        data: menu,
      });
    } catch (error: unknown) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to retrieve menu recommendation",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

type UpdateMenuItemBody = {
  mealTime?: string;
  foodName?: string;
  categoryCode?: string;
  portion?: number;
  urt?: string | null;
  gram?: number | null;
  energyKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbG?: number;
  sodiumMg?: number;
  fiberG?: number;
};

mealRecommendationRoutes.patch("/items/:menuItemId", async (req, res) => {
  try {
    const menuItemId = Number(req.params.menuItemId);
    const body = req.body as UpdateMenuItemBody;

    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      return res.status(400).json({
        message: "Valid menuItemId is required",
      });
    }

    const existingItem = await prisma.menuRecommendationItem.findUnique({
      where: {
        menuItemId,
      },
    });

    if (!existingItem) {
      return res.status(404).json({
        message: "Menu item not found",
      });
    }

    const updatedItem = await prisma.menuRecommendationItem.update({
      where: {
        menuItemId,
      },
      data: {
        ...(body.mealTime !== undefined && { mealTime: body.mealTime }),
        ...(body.foodName !== undefined && { foodName: body.foodName }),
        ...(body.categoryCode !== undefined && {
          categoryCode: body.categoryCode,
        }),
        ...(body.portion !== undefined && { portion: body.portion }),
        ...(body.urt !== undefined && { urt: body.urt }),
        ...(body.gram !== undefined && { gram: body.gram }),
        ...(body.energyKcal !== undefined && { energyKcal: body.energyKcal }),
        ...(body.proteinG !== undefined && { proteinG: body.proteinG }),
        ...(body.fatG !== undefined && { fatG: body.fatG }),
        ...(body.carbG !== undefined && { carbG: body.carbG }),
        ...(body.sodiumMg !== undefined && { sodiumMg: body.sodiumMg }),
        ...(body.fiberG !== undefined && { fiberG: body.fiberG }),
      },
    });

    await recalculateMenuDaySummary(existingItem.menuDayId);

    return res.status(200).json({
      message: "Menu item updated successfully",
      data: updatedItem,
    });
  } catch (error: unknown) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to update menu item",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

mealRecommendationRoutes.delete("/items/:menuItemId", async (req, res) => {
  try {
    const menuItemId = Number(req.params.menuItemId);

    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      return res.status(400).json({
        message: "Valid menuItemId is required",
      });
    }

    const existingItem = await prisma.menuRecommendationItem.findUnique({
      where: {
        menuItemId,
      },
    });

    if (!existingItem) {
      return res.status(404).json({
        message: "Menu item not found",
      });
    }

    const menuDayId = existingItem.menuDayId;

    await prisma.menuRecommendationItem.delete({
      where: {
        menuItemId,
      },
    });

    await recalculateMenuDaySummary(menuDayId);

    return res.status(200).json({
      message: "Menu item deleted successfully",
      deletedMenuItemId: menuItemId,
    });
  } catch (error: unknown) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to delete menu item",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

mealRecommendationRoutes.delete(
  "/menu/:menuRecommendationId",
  async (req, res) => {
    try {
      const menuRecommendationId = Number(req.params.menuRecommendationId);

      if (
        !Number.isInteger(menuRecommendationId) ||
        menuRecommendationId <= 0
      ) {
        return res.status(400).json({
          message: "Valid menuRecommendationId is required",
        });
      }

      const existingMenu = await prisma.menuRecommendation.findUnique({
        where: {
          menuRecommendationId,
        },
      });

      if (!existingMenu) {
        return res.status(404).json({
          message: "Menu recommendation not found",
        });
      }

      await prisma.menuRecommendation.delete({
        where: {
          menuRecommendationId,
        },
      });

      return res.status(200).json({
        message: "Menu recommendation deleted successfully",
        deletedMenuRecommendationId: menuRecommendationId,
      });
    } catch (error: unknown) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to delete menu recommendation",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
async function recalculateMenuDaySummary(menuDayId: number) {
  const items = await prisma.menuRecommendationItem.findMany({
    where: {
      menuDayId,
    },
    select: {
      energyKcal: true,
      proteinG: true,
      fatG: true,
      carbG: true,
      sodiumMg: true,
      fiberG: true,
    },
  });

  const totals = items.reduce<NutritionTotals>(
    (acc: NutritionTotals, item: NutritionTotals): NutritionTotals => {
      acc.energyKcal += item.energyKcal;
      acc.proteinG += item.proteinG;
      acc.fatG += item.fatG;
      acc.carbG += item.carbG;
      acc.sodiumMg += item.sodiumMg;
      acc.fiberG += item.fiberG;

      return acc;
    },
    {
      energyKcal: 0,
      proteinG: 0,
      fatG: 0,
      carbG: 0,
      sodiumMg: 0,
      fiberG: 0,
    },
  );

  return prisma.menuRecommendationDay.update({
    where: {
      menuDayId,
    },
    data: {
      energyKcal: Number(totals.energyKcal.toFixed(2)),
      proteinG: Number(totals.proteinG.toFixed(2)),
      fatG: Number(totals.fatG.toFixed(2)),
      carbG: Number(totals.carbG.toFixed(2)),
      sodiumMg: Number(totals.sodiumMg.toFixed(2)),
      fiberG: Number(totals.fiberG.toFixed(2)),
    },
  });
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

type MarkMenuItemEatenBody = {
  isEaten: boolean;
  userNote?: string | null;
};

mealRecommendationRoutes.patch("/items/:menuItemId/eaten", async (req, res) => {
  try {
    const menuItemId = Number(req.params.menuItemId);
    const { isEaten, userNote } = (req.body ?? {}) as MarkMenuItemEatenBody;

    if (!Number.isInteger(menuItemId) || menuItemId <= 0) {
      return res.status(400).json({
        message: "Valid menuItemId is required",
      });
    }

    if (typeof isEaten !== "boolean") {
      return res.status(400).json({
        message: "isEaten must be boolean",
      });
    }

    const existingItem = await prisma.menuRecommendationItem.findUnique({
      where: {
        menuItemId,
      },
    });

    if (!existingItem) {
      return res.status(404).json({
        message: "Menu item not found",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.menuRecommendationItem.update({
        where: {
          menuItemId,
        },
        data: {
          isEaten,
          eatenAt: isEaten ? new Date() : null,
          ...(userNote !== undefined && { userNote }),
        },
      });

      let multiplier = 0;

      if (existingItem.isEaten === false && isEaten === true) {
        multiplier = 1;
      } else if (existingItem.isEaten === true && isEaten === false) {
        multiplier = -1;
      }

      if (multiplier !== 0) {
        await tx.menuRecommendationDay.update({
          where: {
            menuDayId: existingItem.menuDayId,
          },
          data: {
            eatenEnergyKcal: {
              increment: existingItem.energyKcal * multiplier,
            },
            eatenProteinG: {
              increment: existingItem.proteinG * multiplier,
            },
            eatenFatG: {
              increment: existingItem.fatG * multiplier,
            },
            eatenCarbG: {
              increment: existingItem.carbG * multiplier,
            },
            eatenSodiumMg: {
              increment: existingItem.sodiumMg * multiplier,
            },
            eatenFiberG: {
              increment: existingItem.fiberG * multiplier,
            },
          },
        });
      }

      const updatedDay = await tx.menuRecommendationDay.findUnique({
        where: {
          menuDayId: existingItem.menuDayId,
        },
        include: {
          items: true,
        },
      });

      return {
        updatedItem,
        updatedDay,
      };
    });

    return res.status(200).json({
      message: isEaten
        ? "Menu item marked as eaten"
        : "Menu item marked as not eaten",
      data: result,
    });
  } catch (error: unknown) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to update eaten status",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

mealRecommendationRoutes.get(
  "/clients/:clientId/menu-by-date",
  async (req, res) => {
    try {
      const clientId = Number(req.params.clientId);
      const date = String(req.query.date ?? "");

      if (!Number.isInteger(clientId) || clientId <= 0) {
        return res.status(400).json({
          message: "Valid clientId is required",
        });
      }

      if (!date) {
        return res.status(400).json({
          message: "date query is required. Use YYYY-MM-DD.",
        });
      }

      const targetDate = parseDateOnly(date);

      if (!targetDate) {
        return res.status(400).json({
          message: "Invalid date format. Use YYYY-MM-DD.",
        });
      }

      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const menuDay = await prisma.menuRecommendationDay.findFirst({
        where: {
          menuDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          menuRecommendation: {
            screeningSession: {
              clientId,
            },
          },
        },
        orderBy: {
          menuRecommendation: {
            generatedAt: "desc",
          },
        },
        include: {
          menuRecommendation: {
            include: {
              screeningSession: {
                include: {
                  client: true,
                },
              },
            },
          },
          items: {
            orderBy: {
              mealTime: "asc",
            },
          },
        },
      });

      if (!menuDay) {
        return res.status(404).json({
          message: "No menu found for this client and date",
          clientId,
          date,
        });
      }

      return res.status(200).json({
        message: "Menu by date retrieved successfully",
        data: {
          client: {
            clientId:
              menuDay.menuRecommendation.screeningSession.client.clientId,
            fullName:
              menuDay.menuRecommendation.screeningSession.client.fullName,
            age: menuDay.menuRecommendation.screeningSession.client.age,
            gender: menuDay.menuRecommendation.screeningSession.client.gender,
          },
          menuRecommendationId: menuDay.menuRecommendationId,
          screeningId: menuDay.menuRecommendation.screeningId,
          dietType: menuDay.menuRecommendation.dietType,
          targetEnergyKcal: menuDay.menuRecommendation.targetEnergyKcal,
          targetCarbohydrateG: menuDay.menuRecommendation.targetCarbohydrateG,
          targetProteinG: menuDay.menuRecommendation.targetProteinG,
          targetFatG: menuDay.menuRecommendation.targetFatG,
          day: {
            menuDayId: menuDay.menuDayId,
            dayNumber: menuDay.dayNumber,
            menuDate: menuDay.menuDate,
            summary: {
              energyKcal: menuDay.energyKcal,
              proteinG: menuDay.proteinG,
              fatG: menuDay.fatG,
              carbG: menuDay.carbG,
              sodiumMg: menuDay.sodiumMg,
              fiberG: menuDay.fiberG,
            },
            meals: groupItemsByMealForResponse(menuDay.items),
          },
        },
      });
    } catch (error: unknown) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to retrieve menu by date",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

function parseDateOnly(date: string): Date | null {
  const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(date);

  if (!isValidFormat) {
    return null;
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

type MenuItemForResponse = {
  menuItemId: number;
  mealTime: string;
  foodName: string;
  categoryCode: string;
  portion: number;
  urt: string | null;
  gram: number | null;
  energyKcal: number;
  proteinG: number;
  fatG: number;
  carbG: number;
  sodiumMg: number;
  fiberG: number;
  isEaten?: boolean;
  eatenAt?: Date | null;
  userNote?: string | null;
};

function groupItemsByMealForResponse(items: MenuItemForResponse[]) {
  const mealOrder = [
    "breakfast",
    "morning_snack",
    "lunch",
    "afternoon_snack",
    "dinner",
  ];

  const grouped: Record<string, MenuItemForResponse[]> = {};

  for (const item of items) {
    if (!grouped[item.mealTime]) {
      grouped[item.mealTime] = [];
    }

    grouped[item.mealTime].push(item);
  }

  return mealOrder
    .filter((mealTime) => grouped[mealTime])
    .map((mealTime) => ({
      mealTime,
      items: grouped[mealTime].map((item) => ({
        menuItemId: item.menuItemId,
        foodName: item.foodName,
        categoryCode: item.categoryCode,
        portion: item.portion,
        urt: item.urt,
        gram: item.gram,
        nutrition: {
          energyKcal: item.energyKcal,
          proteinG: item.proteinG,
          fatG: item.fatG,
          carbG: item.carbG,
          sodiumMg: item.sodiumMg,
          fiberG: item.fiberG,
        },
        isEaten: item.isEaten ?? false,
        eatenAt: item.eatenAt ?? null,
        userNote: item.userNote ?? null,
      })),
    }));
}

mealRecommendationRoutes.get(
  "/clients/:clientId/menu-dates",
  async (req, res) => {
    try {
      const clientId = Number(req.params.clientId);

      if (!Number.isInteger(clientId) || clientId <= 0) {
        return res.status(400).json({
          message: "Valid clientId is required",
        });
      }

      const menuDays = await prisma.menuRecommendationDay.findMany({
        where: {
          menuRecommendation: {
            screeningSession: {
              clientId,
            },
          },
        },
        orderBy: {
          menuDate: "asc",
        },
        select: {
          menuDayId: true,
          dayNumber: true,
          menuDate: true,
          energyKcal: true,
          proteinG: true,
          fatG: true,
          carbG: true,
          menuRecommendation: {
            select: {
              menuRecommendationId: true,
              screeningId: true,
              dietType: true,
              generatedAt: true,
            },
          },
        },
      });

      const dates = menuDays.map((day: MenuDayWithRecommendation) => ({
        menuDayId: day.menuDayId,
        menuRecommendationId: day.menuRecommendation.menuRecommendationId,
        screeningId: day.menuRecommendation.screeningId,
        dietType: day.menuRecommendation.dietType,
        dayNumber: day.dayNumber,
        menuDate: day.menuDate,
        generatedAt: day.menuRecommendation.generatedAt,
        summary: {
          energyKcal: day.energyKcal,
          proteinG: day.proteinG,
          fatG: day.fatG,
          carbG: day.carbG,
        },
      }));

      return res.status(200).json({
        message: "Client menu dates retrieved successfully",
        clientId,
        totalDates: dates.length,
        data: dates,
      });
    } catch (error: unknown) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to retrieve client menu dates",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

mealRecommendationRoutes.get(
  "/clients/:clientId/nutrition-progress",
  async (req, res) => {
    try {
      const clientId = Number(req.params.clientId);
      const { startDate, endDate } = req.query;

      if (!Number.isInteger(clientId) || clientId <= 0) {
        return res.status(400).json({
          message: "Valid clientId is required",
        });
      }

      if (typeof startDate !== "string" || typeof endDate !== "string") {
        return res.status(400).json({
          message: "startDate and endDate are required. Format: YYYY-MM-DD",
        });
      }

      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({
          message: "Invalid date format. Use YYYY-MM-DD",
        });
      }

      const days = await prisma.menuRecommendationDay.findMany({
        where: {
          menuDate: {
            gte: start,
            lte: end,
          },
          menuRecommendation: {
            screeningSession: {
              clientId,
            },
          },
        },
        orderBy: {
          menuDate: "asc",
        },
        select: {
          menuDayId: true,
          dayNumber: true,
          menuDate: true,

          energyKcal: true,
          proteinG: true,
          fatG: true,
          carbG: true,
          sodiumMg: true,
          fiberG: true,

          eatenEnergyKcal: true,
          eatenProteinG: true,
          eatenFatG: true,
          eatenCarbG: true,
          eatenSodiumMg: true,
          eatenFiberG: true,
        },
      });

      const chartData = days.map((day) => {
        const energyPercent =
          day.energyKcal > 0 ? (day.eatenEnergyKcal / day.energyKcal) * 100 : 0;

        const proteinPercent =
          day.proteinG > 0 ? (day.eatenProteinG / day.proteinG) * 100 : 0;

        const fatPercent = day.fatG > 0 ? (day.eatenFatG / day.fatG) * 100 : 0;

        const carbPercent =
          day.carbG > 0 ? (day.eatenCarbG / day.carbG) * 100 : 0;

        const sodiumPercent =
          day.sodiumMg > 0 ? (day.eatenSodiumMg / day.sodiumMg) * 100 : 0;

        const fiberPercent =
          day.fiberG > 0 ? (day.eatenFiberG / day.fiberG) * 100 : 0;

        return {
          menuDayId: day.menuDayId,
          dayNumber: day.dayNumber,
          menuDate: day.menuDate,

          energy: {
            target: Number(day.energyKcal.toFixed(2)),
            eaten: Number(day.eatenEnergyKcal.toFixed(2)),
            percent: Number(energyPercent.toFixed(2)),
            unit: "kcal",
          },

          protein: {
            target: Number(day.proteinG.toFixed(2)),
            eaten: Number(day.eatenProteinG.toFixed(2)),
            percent: Number(proteinPercent.toFixed(2)),
            unit: "g",
          },

          fat: {
            target: Number(day.fatG.toFixed(2)),
            eaten: Number(day.eatenFatG.toFixed(2)),
            percent: Number(fatPercent.toFixed(2)),
            unit: "g",
          },

          carbohydrate: {
            target: Number(day.carbG.toFixed(2)),
            eaten: Number(day.eatenCarbG.toFixed(2)),
            percent: Number(carbPercent.toFixed(2)),
            unit: "g",
          },

          sodium: {
            target: Number(day.sodiumMg.toFixed(2)),
            eaten: Number(day.eatenSodiumMg.toFixed(2)),
            percent: Number(sodiumPercent.toFixed(2)),
            unit: "mg",
          },

          fiber: {
            target: Number(day.fiberG.toFixed(2)),
            eaten: Number(day.eatenFiberG.toFixed(2)),
            percent: Number(fiberPercent.toFixed(2)),
            unit: "g",
          },
        };
      });

      const summary = days.reduce(
        (acc, day) => {
          acc.targetEnergyKcal += day.energyKcal;
          acc.eatenEnergyKcal += day.eatenEnergyKcal;

          acc.targetProteinG += day.proteinG;
          acc.eatenProteinG += day.eatenProteinG;

          acc.targetFatG += day.fatG;
          acc.eatenFatG += day.eatenFatG;

          acc.targetCarbG += day.carbG;
          acc.eatenCarbG += day.eatenCarbG;

          acc.targetSodiumMg += day.sodiumMg;
          acc.eatenSodiumMg += day.eatenSodiumMg;

          acc.targetFiberG += day.fiberG;
          acc.eatenFiberG += day.eatenFiberG;

          return acc;
        },
        {
          targetEnergyKcal: 0,
          eatenEnergyKcal: 0,

          targetProteinG: 0,
          eatenProteinG: 0,

          targetFatG: 0,
          eatenFatG: 0,

          targetCarbG: 0,
          eatenCarbG: 0,

          targetSodiumMg: 0,
          eatenSodiumMg: 0,

          targetFiberG: 0,
          eatenFiberG: 0,
        },
      );

      return res.status(200).json({
        message: "Nutrition progress retrieved successfully",
        data: {
          clientId,
          startDate,
          endDate,
          totalDays: days.length,
          summary: {
            energy: {
              target: Number(summary.targetEnergyKcal.toFixed(2)),
              eaten: Number(summary.eatenEnergyKcal.toFixed(2)),
              unit: "kcal",
            },
            protein: {
              target: Number(summary.targetProteinG.toFixed(2)),
              eaten: Number(summary.eatenProteinG.toFixed(2)),
              unit: "g",
            },
            fat: {
              target: Number(summary.targetFatG.toFixed(2)),
              eaten: Number(summary.eatenFatG.toFixed(2)),
              unit: "g",
            },
            carbohydrate: {
              target: Number(summary.targetCarbG.toFixed(2)),
              eaten: Number(summary.eatenCarbG.toFixed(2)),
              unit: "g",
            },
            sodium: {
              target: Number(summary.targetSodiumMg.toFixed(2)),
              eaten: Number(summary.eatenSodiumMg.toFixed(2)),
              unit: "mg",
            },
            fiber: {
              target: Number(summary.targetFiberG.toFixed(2)),
              eaten: Number(summary.eatenFiberG.toFixed(2)),
              unit: "g",
            },
          },
          chartData,
        },
      });
    } catch (error: unknown) {
      console.error(error);

      return res.status(500).json({
        message: "Failed to get nutrition progress",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);

import { Router } from "express";
import { prisma } from "../lib/prisma";

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

const FASTAPI_BASE_URL =
  process.env.FASTAPI_BASE_URL || "http://localhost:8000";

/**
 * Get required data for FastAPI meal recommendation
 * This endpoint only checks and previews the payload.
 */

const weeklyHistory = {
  usedFoodCounts: {} as Record<string, number>,
  categoryUsedFoodCounts: {} as Record<string, Record<string, number>>,
};

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

    days: savedWeeklyMenu.days.map((day) => ({
      dayNumber: day.dayNumber,
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
  dailyMenu: any,
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

mealRecommendationRoutes.post("/:screeningId/menu-weekly", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

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

    // IMPORTANT:
    // weeklyHistory must be created inside this request,
    // not globally outside the route.
    const weeklyHistory = {
      usedFoodCounts: {} as Record<string, number>,
      categoryUsedFoodCounts: {} as Record<string, Record<string, number>>,
    };

    const generatedMenus: any[] = [];

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

      // Update history after each successful daily menu
      updateWeeklyHistory(weeklyHistory, responseBody);
    }

    const savedWeeklyMenu = await saveGeneratedWeeklyMenu({
      screeningId,
      dietType,
      fastApiPayload,
      generatedMenus,
    });

    return res.status(201).json({
      message: "Weekly menu recommendation generated and saved successfully",
      screeningId,
      dietType,
      fastApiPayload,
      weeklyHistory,
      data: simplifyWeeklyMenu(savedWeeklyMenu as SavedWeeklyMenu),
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
  generatedMenu: any;
}) {
  const { screeningId, dietType, fastApiPayload, generatedMenu } = params;

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
            energyKcal: generatedMenu.daily_total.energy_kcal,
            proteinG: generatedMenu.daily_total.protein_g,
            fatG: generatedMenu.daily_total.fat_g,
            carbG: generatedMenu.daily_total.carb_g,
            sodiumMg: generatedMenu.daily_total.sodium_mg,
            fiberG: generatedMenu.daily_total.fiber_g,

            items: {
              create: generatedMenu.meals.flatMap((meal: any) =>
                meal.items.map((item: any) => ({
                  mealTime: meal.meal_time,
                  foodName: item.food_name,
                  categoryCode: item.category_code,
                  portion: item.portion,
                  urt: item.urt,
                  gram: item.gram,
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
  generatedMenus: any[];
}) {
  const { screeningId, dietType, fastApiPayload, generatedMenus } = params;

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
      totalDays: 7,
      generationStatus: "SUCCESS",

      days: {
        create: generatedMenus.map((menu, index) => ({
          dayNumber: index + 1,
          energyKcal: menu.daily_total.energy_kcal,
          proteinG: menu.daily_total.protein_g,
          fatG: menu.daily_total.fat_g,
          carbG: menu.daily_total.carb_g,
          sodiumMg: menu.daily_total.sodium_mg,
          fiberG: menu.daily_total.fiber_g,

          items: {
            create: menu.meals.flatMap((meal: any) =>
              meal.items.map((item: any) => ({
                mealTime: meal.meal_time,
                foodName: item.food_name,
                categoryCode: item.category_code,
                portion: item.portion,
                urt: item.urt,
                gram: item.gram,
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
}

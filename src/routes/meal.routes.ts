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

/**
 * Get required data for FastAPI meal recommendation
 */
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

    const fastApiPayload: FastApiMealPayload = {
      energy_kcal: screening.energyRequirement.dailyEnergyKcal,
      diet_type: dietType,
      carb_g: screening.energyRequirement.carbohydrateGram,
      protein_g: screening.energyRequirement.proteinGram,
      fat_g: screening.energyRequirement.fatGram,
      sodium_mg_max: getSodiumLimitByDietType(dietType),
      fiber_g_min: getFiberMinimumByDietType(dietType),
    };

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
    });
  }
});

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

  return "GENERAL";
}

function isPositiveStatus(status: string | null): boolean {
  if (!status) return false;

  const normalizedStatus = status.toLowerCase().trim();

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

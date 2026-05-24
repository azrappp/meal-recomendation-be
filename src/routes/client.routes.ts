import { Router } from "express";
import prisma from "../lib/prisma";

export const clientRoutes = Router();

/**
 * Create client
 */
clientRoutes.post("/", async (req, res) => {
  try {
    const { fullName, age, gender, occupation, phone } = req.body;

    const client = await prisma.client.create({
      data: {
        fullName,
        age,
        gender,
        occupation,
        phone,
      },
    });

    res.status(201).json({
      message: "Client created successfully",
      data: client,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create client",
    });
  }
});

/**
 * Get all clients
 */
clientRoutes.get("/", async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      message: "Clients retrieved successfully",
      data: clients,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to retrieve clients",
    });
  }
});

/**
 * Get client detail with screening sessions
 */
clientRoutes.get("/:id", async (req, res) => {
  try {
    const clientId = Number(req.params.id);

    const client = await prisma.client.findUnique({
      where: {
        clientId,
      },
      include: {
        screeningSessions: {
          include: {
            anthropometryAssessment: true,
            biochemicalAssessment: true,
            clinicalAssessment: true,
            medicationAssessment: true,
            physicalActivityAssessment: true,
            screeningResult: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    res.json({
      message: "Client detail retrieved successfully",
      data: client,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to retrieve client detail",
    });
  }
});

clientRoutes.get("/:clientId/latest-screening", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);

    if (!clientId || Number.isNaN(clientId)) {
      return res.status(400).json({
        message: "Invalid clientId",
      });
    }

    const client = await prisma.client.findUnique({
      where: {
        clientId,
      },
      select: {
        clientId: true,
        fullName: true,
        age: true,
        gender: true,
        occupation: true,

        screeningSessions: {
          orderBy: [
            {
              screeningDate: "desc",
            },
            {
              createdAt: "desc",
            },
          ],
          take: 1,
          select: {
            screeningId: true,
            screeningDate: true,
            screeningStatus: true,
            createdAt: true,
            anthropometryAssessment: true,
            biochemicalAssessment: true,
            clinicalAssessment: true,
            medicationAssessment: true,
            physicalActivityAssessment: true,
            screeningResult: true,
            energyRequirement: true,
            menuRecommendations: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    const latestScreening = client.screeningSessions[0] ?? null;

    return res.status(200).json({
      message: "Latest screening history retrieved successfully",
      data: {
        clientId: client.clientId,
        fullName: client.fullName,
        age: client.age,
        gender: client.gender,
        occupation: client.occupation,
        latestScreening,
      },
    });
  } catch (error) {
    console.error("Error getting screening history:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});
clientRoutes.get("/:clientId/screening-history", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);

    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({
        message: "Valid clientId is required",
      });
    }

    const client = await prisma.client.findUnique({
      where: {
        clientId,
      },
      include: {
        screeningSessions: {
          orderBy: {
            screeningDate: "asc",
          },
          include: {
            anthropometryAssessment: true,
            biochemicalAssessment: true,
            clinicalAssessment: true,
            screeningResult: true,
            energyRequirement: true,
            physicalActivityAssessment: true,
            medicationAssessment: true,
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    const history = client.screeningSessions.map(
      (session: (typeof client.screeningSessions)[number]) => ({
        screeningId: session.screeningId,
        screeningDate: formatDateOnly(session.screeningDate),
        screeningStatus: session.screeningStatus,

        anthropometry: session.anthropometryAssessment
          ? {
              weightKg: session.anthropometryAssessment.weightKg,
              heightCm: session.anthropometryAssessment.heightCm,
              bmi: session.anthropometryAssessment.bmi,
              waistCircumferenceCm:
                session.anthropometryAssessment.waistCircumferenceCm,
              bmiStatus: session.anthropometryAssessment.bmiStatus,
              waistStatus: session.anthropometryAssessment.waistStatus,
            }
          : null,

        glucose: session.biochemicalAssessment
          ? {
              fastingGlucoseMgDl:
                session.biochemicalAssessment.fastingGlucoseMgDl,
              postprandialGlucoseMgDl:
                session.biochemicalAssessment.postprandialGlucoseMgDl,
              randomGlucoseMgDl:
                session.biochemicalAssessment.randomGlucoseMgDl,
              hba1cPercent: session.biochemicalAssessment.hba1cPercent,
              glucoseStatus: session.biochemicalAssessment.glucoseStatus,
              hba1cStatus: session.biochemicalAssessment.hba1cStatus,
            }
          : null,

        bloodPressure: session.clinicalAssessment
          ? {
              systolicBp: session.clinicalAssessment.systolicBp,
              diastolicBp: session.clinicalAssessment.diastolicBp,
              bloodPressureStatus:
                session.clinicalAssessment.bloodPressureStatus,
            }
          : null,

        clinicalSymptoms: session.clinicalAssessment
          ? {
              headache: session.clinicalAssessment.headache,
              chestPain: session.clinicalAssessment.chestPain,
              visualDisturbance: session.clinicalAssessment.visualDisturbance,
              frequentUrinationNight:
                session.clinicalAssessment.frequentUrinationNight,
              shortnessOfBreath: session.clinicalAssessment.shortnessOfBreath,
              polyphagia: session.clinicalAssessment.polyphagia,
              dizziness: session.clinicalAssessment.dizziness,
              polydipsia: session.clinicalAssessment.polydipsia,
            }
          : null,

        screeningResult: session.screeningResult
          ? {
              diabetesStatus: session.screeningResult.diabetesStatus,
              hypertensionStatus: session.screeningResult.hypertensionStatus,
              obesityStatus: session.screeningResult.obesityStatus,
              finalScreeningCategory:
                session.screeningResult.finalScreeningCategory,
              referralRequired: session.screeningResult.referralRequired,
              referralReason: session.screeningResult.referralReason,
              screeningSummary: session.screeningResult.screeningSummary,
            }
          : null,

        energyRequirement: session.energyRequirement
          ? {
              dailyEnergyKcal: session.energyRequirement.dailyEnergyKcal,
              carbohydrateGram: session.energyRequirement.carbohydrateGram,
              proteinGram: session.energyRequirement.proteinGram,
              fatGram: session.energyRequirement.fatGram,
            }
          : null,

        physicalActivity: session.physicalActivityAssessment
          ? {
              activityLevel: session.physicalActivityAssessment.activityLevel,
              activityScore: session.physicalActivityAssessment.activityScore,
            }
          : null,

        medication: session.medicationAssessment
          ? {
              usesHypertensionDrug:
                session.medicationAssessment.usesHypertensionDrug,
              usesOralAntidiabetic:
                session.medicationAssessment.usesOralAntidiabetic,
              usesInsulin: session.medicationAssessment.usesInsulin,
              hypertensionDrugName:
                session.medicationAssessment.hypertensionDrugName,
              antidiabeticDrugName:
                session.medicationAssessment.antidiabeticDrugName,
              insulinAlertStatus:
                session.medicationAssessment.insulinAlertStatus,
              medicationNotes: session.medicationAssessment.medicationNotes,
            }
          : null,
      }),
    );

    const chartData = history.map((item: (typeof history)[number]) => ({
      screeningDate: item.screeningDate,
      weightKg: item.anthropometry?.weightKg ?? null,
      bmi: item.anthropometry?.bmi ?? null,
      waistCircumferenceCm: item.anthropometry?.waistCircumferenceCm ?? null,
      fastingGlucoseMgDl: item.glucose?.fastingGlucoseMgDl ?? null,
      postprandialGlucoseMgDl: item.glucose?.postprandialGlucoseMgDl ?? null,
      randomGlucoseMgDl: item.glucose?.randomGlucoseMgDl ?? null,
      hba1cPercent: item.glucose?.hba1cPercent ?? null,
      systolicBp: item.bloodPressure?.systolicBp ?? null,
      diastolicBp: item.bloodPressure?.diastolicBp ?? null,
    }));

    return res.status(200).json({
      message: "Client screening history retrieved successfully",
      data: {
        client: {
          clientId: client.clientId,
          fullName: client.fullName,
          age: client.age,
          gender: client.gender,
          occupation: client.occupation,
          createdAt: client.createdAt,
        },
        totalScreenings: history.length,
        history,
        chartData,
      },
    });
  } catch (error: unknown) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to retrieve client screening history",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

type CreateScreeningBody = {
  screeningDate?: string;
  anthropometry?: {
    weightKg?: number;
    heightCm?: number;
    waistCircumferenceCm?: number | null;
  };
  biochemical?: {
    fastingGlucoseMgDl?: number | null;
    postprandialGlucoseMgDl?: number | null;
    randomGlucoseMgDl?: number | null;
    hba1cPercent?: number | null;
  };
  clinical?: {
    systolicBp?: number | null;
    diastolicBp?: number | null;
  };
};

clientRoutes.post("/:clientId/screenings", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    const body = (req.body ?? {}) as CreateScreeningBody;

    if (!Number.isInteger(clientId) || clientId <= 0) {
      return res.status(400).json({
        message: "Valid clientId is required",
      });
    }

    const client = await prisma.client.findUnique({
      where: {
        clientId,
      },
    });

    if (!client) {
      return res.status(404).json({
        message: "Client not found",
      });
    }

    const screeningDate = body.screeningDate
      ? new Date(body.screeningDate)
      : new Date();

    if (Number.isNaN(screeningDate.getTime())) {
      return res.status(400).json({
        message: "Invalid screeningDate format. Use YYYY-MM-DD.",
      });
    }

    const weightKg = Number(body.anthropometry?.weightKg);
    const heightCm = Number(body.anthropometry?.heightCm);
    const waistCircumferenceCm =
      body.anthropometry?.waistCircumferenceCm !== undefined &&
      body.anthropometry?.waistCircumferenceCm !== null
        ? Number(body.anthropometry.waistCircumferenceCm)
        : null;

    if (!weightKg || !heightCm) {
      return res.status(400).json({
        message: "weightKg and heightCm are required",
      });
    }

    const bmi = calculateBmi(weightKg, heightCm);

    const systolicBp =
      body.clinical?.systolicBp !== undefined &&
      body.clinical?.systolicBp !== null
        ? Number(body.clinical.systolicBp)
        : null;

    const diastolicBp =
      body.clinical?.diastolicBp !== undefined &&
      body.clinical?.diastolicBp !== null
        ? Number(body.clinical.diastolicBp)
        : null;

    const createdScreening = await prisma.screeningSession.create({
      data: {
        clientId,
        screeningDate,
        screeningStatus: "COMPLETED",

        anthropometryAssessment: {
          create: {
            weightKg,
            heightCm,
            bmi,
            waistCircumferenceCm,
            bmiStatus: getBmiStatus(bmi),
            waistStatus: getWaistStatus(client.gender, waistCircumferenceCm),
          },
        },

        biochemicalAssessment: {
          create: {
            fastingGlucoseMgDl: body.biochemical?.fastingGlucoseMgDl ?? null,
            postprandialGlucoseMgDl:
              body.biochemical?.postprandialGlucoseMgDl ?? null,
            randomGlucoseMgDl: body.biochemical?.randomGlucoseMgDl ?? null,
            hba1cPercent: body.biochemical?.hba1cPercent ?? null,
            glucoseStatus: getGlucoseStatus({
              fastingGlucoseMgDl: body.biochemical?.fastingGlucoseMgDl ?? null,
              postprandialGlucoseMgDl:
                body.biochemical?.postprandialGlucoseMgDl ?? null,
              randomGlucoseMgDl: body.biochemical?.randomGlucoseMgDl ?? null,
            }),
            hba1cStatus: getHba1cStatus(body.biochemical?.hba1cPercent ?? null),
          },
        },

        clinicalAssessment: {
          create: {
            systolicBp,
            diastolicBp,
            bloodPressureStatus: getBloodPressureStatus(
              systolicBp,
              diastolicBp,
            ),
          },
        },
      },
      include: {
        anthropometryAssessment: true,
        biochemicalAssessment: true,
        clinicalAssessment: true,
      },
    });

    return res.status(201).json({
      message: "Screening ulang berhasil disimpan",
      data: createdScreening,
    });
  } catch (error: unknown) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to create screening data",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

function calculateBmi(weightKg: number, heightCm: number) {
  const heightMeter = heightCm / 100;
  const bmi = weightKg / (heightMeter * heightMeter);

  return Number(bmi.toFixed(2));
}

function getBmiStatus(bmi: number) {
  if (bmi < 18.5) return "UNDERWEIGHT";
  if (bmi < 25) return "NORMAL";
  if (bmi < 30) return "OVERWEIGHT";
  return "OBESITY";
}

function getWaistStatus(gender: string, waistCm: number | null) {
  if (!waistCm) return null;

  const normalizedGender = gender.toLowerCase();

  if (normalizedGender.includes("male") || normalizedGender.includes("laki")) {
    return waistCm >= 90 ? "HIGH_RISK" : "NORMAL";
  }

  if (
    normalizedGender.includes("female") ||
    normalizedGender.includes("perempuan")
  ) {
    return waistCm >= 80 ? "HIGH_RISK" : "NORMAL";
  }

  return waistCm >= 90 ? "HIGH_RISK" : "NORMAL";
}

function getGlucoseStatus(params: {
  fastingGlucoseMgDl: number | null;
  postprandialGlucoseMgDl: number | null;
  randomGlucoseMgDl: number | null;
}) {
  const { fastingGlucoseMgDl, postprandialGlucoseMgDl, randomGlucoseMgDl } =
    params;

  if (
    fastingGlucoseMgDl !== null &&
    fastingGlucoseMgDl !== undefined &&
    fastingGlucoseMgDl >= 126
  ) {
    return "DIABETES_RISK";
  }

  if (
    postprandialGlucoseMgDl !== null &&
    postprandialGlucoseMgDl !== undefined &&
    postprandialGlucoseMgDl >= 200
  ) {
    return "DIABETES_RISK";
  }

  if (
    randomGlucoseMgDl !== null &&
    randomGlucoseMgDl !== undefined &&
    randomGlucoseMgDl >= 200
  ) {
    return "DIABETES_RISK";
  }

  if (
    fastingGlucoseMgDl !== null &&
    fastingGlucoseMgDl !== undefined &&
    fastingGlucoseMgDl >= 100
  ) {
    return "PREDIABETES_RISK";
  }

  return "NORMAL";
}

function getHba1cStatus(hba1cPercent: number | null) {
  if (hba1cPercent === null || hba1cPercent === undefined) return null;

  if (hba1cPercent >= 6.5) return "DIABETES_RISK";
  if (hba1cPercent >= 5.7) return "PREDIABETES_RISK";

  return "NORMAL";
}

function getBloodPressureStatus(
  systolicBp: number | null,
  diastolicBp: number | null,
) {
  if (!systolicBp || !diastolicBp) return null;

  if (systolicBp >= 140 || diastolicBp >= 90) return "HYPERTENSION_RISK";
  if (systolicBp >= 120 || diastolicBp >= 80) return "ELEVATED_RISK";

  return "NORMAL";
}

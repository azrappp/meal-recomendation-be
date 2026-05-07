import { Router } from "express";
import { prisma } from "../lib/prisma";

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

/**
 * Create screening session for a client
 */
clientRoutes.post("/:id/screenings", async (req, res) => {
  try {
    const clientId = Number(req.params.id);

    const {
      screeningDate,
      screeningStatus,

      anthropometry,
      biochemical,
      clinical,
      medication,
      physicalActivity,
      screeningResult,
    } = req.body;

    const screening = await prisma.screeningSession.create({
      data: {
        clientId,
        screeningDate: new Date(screeningDate),
        screeningStatus,

        anthropometryAssessment: anthropometry
          ? {
              create: {
                weightKg: anthropometry.weightKg,
                heightCm: anthropometry.heightCm,
                bmi: anthropometry.bmi,
                waistCircumferenceCm: anthropometry.waistCircumferenceCm,
                bmiStatus: anthropometry.bmiStatus,
                waistStatus: anthropometry.waistStatus,
              },
            }
          : undefined,

        biochemicalAssessment: biochemical
          ? {
              create: {
                fastingGlucoseMgDl: biochemical.fastingGlucoseMgDl,
                postprandialGlucoseMgDl: biochemical.postprandialGlucoseMgDl,
                randomGlucoseMgDl: biochemical.randomGlucoseMgDl,
                hba1cPercent: biochemical.hba1cPercent,
                glucoseStatus: biochemical.glucoseStatus,
                hba1cStatus: biochemical.hba1cStatus,
              },
            }
          : undefined,

        clinicalAssessment: clinical
          ? {
              create: {
                systolicBp: clinical.systolicBp,
                diastolicBp: clinical.diastolicBp,
                bloodPressureStatus: clinical.bloodPressureStatus,
                headache: clinical.headache ?? false,
                chestPain: clinical.chestPain ?? false,
                visualDisturbance: clinical.visualDisturbance ?? false,
                frequentUrinationNight:
                  clinical.frequentUrinationNight ?? false,
                shortnessOfBreath: clinical.shortnessOfBreath ?? false,
                polyphagia: clinical.polyphagia ?? false,
                dizziness: clinical.dizziness ?? false,
                polydipsia: clinical.polydipsia ?? false,
              },
            }
          : undefined,

        medicationAssessment: medication
          ? {
              create: {
                usesHypertensionDrug: medication.usesHypertensionDrug ?? false,
                usesOralAntidiabetic: medication.usesOralAntidiabetic ?? false,
                usesInsulin: medication.usesInsulin ?? false,
                hypertensionDrugName: medication.hypertensionDrugName,
                antidiabeticDrugName: medication.antidiabeticDrugName,
                insulinAlertStatus: medication.insulinAlertStatus,
                medicationNotes: medication.medicationNotes,
              },
            }
          : undefined,

        physicalActivityAssessment: physicalActivity
          ? {
              create: {
                activityLevel: physicalActivity.activityLevel,
                activityScore: physicalActivity.activityScore,
              },
            }
          : undefined,

        screeningResult: screeningResult
          ? {
              create: {
                diabetesStatus: screeningResult.diabetesStatus,
                hypertensionStatus: screeningResult.hypertensionStatus,
                obesityStatus: screeningResult.obesityStatus,
                finalScreeningCategory: screeningResult.finalScreeningCategory,
                referralRequired: screeningResult.referralRequired ?? false,
                referralReason: screeningResult.referralReason,
                screeningSummary: screeningResult.screeningSummary,
              },
            }
          : undefined,
      },
      include: {
        anthropometryAssessment: true,
        biochemicalAssessment: true,
        clinicalAssessment: true,
        medicationAssessment: true,
        physicalActivityAssessment: true,
        screeningResult: true,
      },
    });

    res.status(201).json({
      message: "Screening session created successfully",
      data: screening,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to create screening session",
    });
  }
});

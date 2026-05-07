import { Router } from "express";
import { prisma } from "../lib/prisma";

export const screeningRoutes = Router();

screeningRoutes.post("/identity", async (req, res) => {
  try {
    const { fullName, age, gender, occupation } = req.body;

    if (!fullName || !age || !gender) {
      return res.status(400).json({
        message: "fullName, age, and gender are required",
      });
    }

    const client = await prisma.client.create({
      data: {
        fullName,
        age: Number(age),
        gender,
        occupation,
      },
    });

    return res.status(201).json({
      message: "Identity data saved successfully",
      data: client,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to save identity data",
    });
  }
});

screeningRoutes.post("/:clientId/anthropometry", async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);

    const { weightKg, heightCm, waistCircumferenceCm } = req.body;

    if (!clientId || !weightKg || !heightCm) {
      return res.status(400).json({
        message: "clientId, weightKg, and heightCm are required",
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

    const weight = Number(weightKg);
    const height = Number(heightCm);
    const waist = waistCircumferenceCm ? Number(waistCircumferenceCm) : null;

    const heightMeter = height / 100;
    const bmi = weight / (heightMeter * heightMeter);

    let bmiStatus = "Normal";

    if (bmi < 18.5) {
      bmiStatus = "Underweight";
    } else if (bmi >= 18.5 && bmi < 25) {
      bmiStatus = "Normal";
    } else if (bmi >= 25 && bmi < 30) {
      bmiStatus = "Overweight";
    } else {
      bmiStatus = "Obesity";
    }

    let waistStatus = "Normal";

    if (waist !== null) {
      if (
        (client.gender.toLowerCase() === "male" ||
          client.gender.toLowerCase() === "laki-laki") &&
        waist >= 90
      ) {
        waistStatus = "High Risk";
      } else if (
        (client.gender.toLowerCase() === "female" ||
          client.gender.toLowerCase() === "perempuan") &&
        waist >= 80
      ) {
        waistStatus = "High Risk";
      }
    }

    const screening = await prisma.screeningSession.create({
      data: {
        clientId,
        screeningDate: new Date(),
        screeningStatus: "anthropometry_completed",

        anthropometryAssessment: {
          create: {
            weightKg: weight,
            heightCm: height,
            bmi: Number(bmi.toFixed(2)),
            waistCircumferenceCm: waist,
            bmiStatus,
            waistStatus,
          },
        },
      },
      include: {
        anthropometryAssessment: true,
      },
    });

    return res.status(201).json({
      message: "Anthropometry data saved successfully",
      data: screening,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to save anthropometry data",
    });
  }
});

screeningRoutes.get("/:screeningId/nutrition-status", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

    const anthropometry = await prisma.anthropometryAssessment.findUnique({
      where: {
        screeningId,
      },
    });

    if (!anthropometry) {
      return res.status(404).json({
        message: "Anthropometry data not found",
      });
    }

    return res.json({
      message: "Nutrition status retrieved successfully",
      data: {
        bmi: anthropometry.bmi,
        bmiStatus: anthropometry.bmiStatus,
        heightCm: anthropometry.heightCm,
        weightKg: anthropometry.weightKg,
        waistCircumferenceCm: anthropometry.waistCircumferenceCm,
        waistStatus: anthropometry.waistStatus,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to retrieve nutrition status",
    });
  }
});

screeningRoutes.post("/:screeningId/biochemical", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

    const {
      fastingGlucoseMgDl,
      postprandialGlucoseMgDl,
      randomGlucoseMgDl,
      hba1cPercent,
    } = req.body;

    const screening = await prisma.screeningSession.findUnique({
      where: {
        screeningId,
      },
    });

    if (!screening) {
      return res.status(404).json({
        message: "Screening session not found",
      });
    }

    const fpg =
      fastingGlucoseMgDl !== undefined ? Number(fastingGlucoseMgDl) : null;
    const twoHourPg =
      postprandialGlucoseMgDl !== undefined
        ? Number(postprandialGlucoseMgDl)
        : null;
    const randomPg =
      randomGlucoseMgDl !== undefined ? Number(randomGlucoseMgDl) : null;
    const hba1c = hba1cPercent !== undefined ? Number(hba1cPercent) : null;

    let glucoseStatus = "Normal";
    let hba1cStatus = "Normal";

    /**
     * Basic screening logic.
     * You can adjust this based on your clinical cut-off rule.
     */
    if (
      (fpg !== null && fpg >= 126) ||
      (twoHourPg !== null && twoHourPg >= 200) ||
      (randomPg !== null && randomPg >= 200)
    ) {
      glucoseStatus = "High";
    } else if (fpg !== null && fpg < 70) {
      glucoseStatus = "Low";
    }

    if (hba1c !== null && hba1c >= 6.5) {
      hba1cStatus = "High";
    } else if (hba1c !== null && hba1c < 4) {
      hba1cStatus = "Low";
    }

    const biochemical = await prisma.biochemicalAssessment.upsert({
      where: {
        screeningId,
      },
      update: {
        fastingGlucoseMgDl: fpg,
        postprandialGlucoseMgDl: twoHourPg,
        randomGlucoseMgDl: randomPg,
        hba1cPercent: hba1c,
        glucoseStatus,
        hba1cStatus,
      },
      create: {
        screeningId,
        fastingGlucoseMgDl: fpg,
        postprandialGlucoseMgDl: twoHourPg,
        randomGlucoseMgDl: randomPg,
        hba1cPercent: hba1c,
        glucoseStatus,
        hba1cStatus,
      },
    });

    await prisma.screeningSession.update({
      where: {
        screeningId,
      },
      data: {
        screeningStatus: "biochemical_completed",
      },
    });

    return res.status(201).json({
      message: "Biochemical data saved successfully",
      data: biochemical,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to save biochemical data",
    });
  }
});

screeningRoutes.get("/:screeningId/blood-glucose-status", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

    const biochemical = await prisma.biochemicalAssessment.findUnique({
      where: {
        screeningId,
      },
    });

    if (!biochemical) {
      return res.status(404).json({
        message: "Biochemical data not found",
      });
    }

    let diagnosis = "Normal";

    if (
      biochemical.glucoseStatus === "High" ||
      biochemical.hba1cStatus === "High"
    ) {
      diagnosis = "High";
    } else if (
      biochemical.glucoseStatus === "Low" ||
      biochemical.hba1cStatus === "Low"
    ) {
      diagnosis = "Low";
    }

    return res.json({
      message: "Blood glucose status retrieved successfully",
      data: {
        diagnosis,
        glucoseStatus: biochemical.glucoseStatus,
        hba1cStatus: biochemical.hba1cStatus,
        fastingGlucoseMgDl: biochemical.fastingGlucoseMgDl,
        postprandialGlucoseMgDl: biochemical.postprandialGlucoseMgDl,
        randomGlucoseMgDl: biochemical.randomGlucoseMgDl,
        hba1cPercent: biochemical.hba1cPercent,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to retrieve blood glucose status",
    });
  }
});

screeningRoutes.post("/:screeningId/clinical", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

    const {
      systolicBp,
      diastolicBp,
      headache,
      chestPain,
      visualDisturbance,
      frequentUrinationNight,
      shortnessOfBreath,
      polyphagia,
      dizziness,
      polydipsia,
    } = req.body;

    const screening = await prisma.screeningSession.findUnique({
      where: { screeningId },
      include: {
        biochemicalAssessment: true,
      },
    });

    if (!screening) {
      return res.status(404).json({
        message: "Screening session not found",
      });
    }

    const systolic = Number(systolicBp);
    const diastolic = Number(diastolicBp);

    let bloodPressureStatus = "Normal";

    if (systolic >= 140 || diastolic >= 90) {
      bloodPressureStatus = "Hypertension Stage 2";
    } else if (
      (systolic >= 130 && systolic <= 139) ||
      (diastolic >= 80 && diastolic <= 89)
    ) {
      bloodPressureStatus = "Hypertension Stage 1";
    } else if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
      bloodPressureStatus = "Elevated";
    }

    const clinical = await prisma.clinicalAssessment.upsert({
      where: { screeningId },
      update: {
        systolicBp: systolic,
        diastolicBp: diastolic,
        bloodPressureStatus,
        headache: headache ?? false,
        chestPain: chestPain ?? false,
        visualDisturbance: visualDisturbance ?? false,
        frequentUrinationNight: frequentUrinationNight ?? false,
        shortnessOfBreath: shortnessOfBreath ?? false,
        polyphagia: polyphagia ?? false,
        dizziness: dizziness ?? false,
        polydipsia: polydipsia ?? false,
      },
      create: {
        screeningId,
        systolicBp: systolic,
        diastolicBp: diastolic,
        bloodPressureStatus,
        headache: headache ?? false,
        chestPain: chestPain ?? false,
        visualDisturbance: visualDisturbance ?? false,
        frequentUrinationNight: frequentUrinationNight ?? false,
        shortnessOfBreath: shortnessOfBreath ?? false,
        polyphagia: polyphagia ?? false,
        dizziness: dizziness ?? false,
        polydipsia: polydipsia ?? false,
      },
    });

    let diabetesStatus = "Normal";

    if (
      screening.biochemicalAssessment?.glucoseStatus === "High" ||
      screening.biochemicalAssessment?.hba1cStatus === "High"
    ) {
      diabetesStatus = "Diabetes Mellitus Risk";
    }

    const hypertensionStatus =
      bloodPressureStatus === "Normal" || bloodPressureStatus === "Elevated"
        ? "Normal"
        : "Hypertension";

    await prisma.screeningResult.upsert({
      where: { screeningId },
      update: {
        hypertensionStatus,
        diabetesStatus,
      },
      create: {
        screeningId,
        hypertensionStatus,
        diabetesStatus,
      },
    });

    await prisma.screeningSession.update({
      where: { screeningId },
      data: {
        screeningStatus: "clinical_completed",
      },
    });

    return res.status(201).json({
      message: "Clinical data saved successfully",
      data: clinical,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to save clinical data",
    });
  }
});

screeningRoutes.get("/:screeningId/clinical-analysis", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

    const screening = await prisma.screeningSession.findUnique({
      where: { screeningId },
      include: {
        clinicalAssessment: true,
        biochemicalAssessment: true,
        screeningResult: true,
      },
    });

    if (!screening) {
      return res.status(404).json({
        message: "Screening session not found",
      });
    }

    if (!screening.clinicalAssessment) {
      return res.status(404).json({
        message: "Clinical data not found",
      });
    }

    const hypertensionDiagnosis =
      screening.clinicalAssessment.bloodPressureStatus === "Normal" ||
      screening.clinicalAssessment.bloodPressureStatus === "Elevated"
        ? "Normal"
        : "Hypertension";

    let diabetesDiagnosis = "Normal";

    if (
      screening.biochemicalAssessment?.glucoseStatus === "High" ||
      screening.biochemicalAssessment?.hba1cStatus === "High"
    ) {
      diabetesDiagnosis = "Diabetes Mellitus Risk";
    }

    return res.json({
      message: "Clinical analysis retrieved successfully",
      data: {
        hypertension: {
          diagnosis: hypertensionDiagnosis,
          bloodPressureStatus: screening.clinicalAssessment.bloodPressureStatus,
          systolicBp: screening.clinicalAssessment.systolicBp,
          diastolicBp: screening.clinicalAssessment.diastolicBp,
        },
        diabetesMellitus: {
          diagnosis: diabetesDiagnosis,
          glucoseStatus: screening.biochemicalAssessment?.glucoseStatus ?? null,
          hba1cStatus: screening.biochemicalAssessment?.hba1cStatus ?? null,
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to retrieve clinical analysis",
    });
  }
});

screeningRoutes.post("/:screeningId/medication", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

    const { hypertensionDrugName, antidiabeticDrugName, medicationNotes } =
      req.body;

    const screening = await prisma.screeningSession.findUnique({
      where: { screeningId },
    });

    if (!screening) {
      return res.status(404).json({
        message: "Screening session not found",
      });
    }

    const hasHypertensionDrug =
      hypertensionDrugName &&
      hypertensionDrugName !== "Tidak menggunakan" &&
      hypertensionDrugName !== "";

    const hasAntidiabeticDrug =
      antidiabeticDrugName &&
      antidiabeticDrugName !== "Tidak menggunakan" &&
      antidiabeticDrugName !== "";

    const usesInsulin =
      antidiabeticDrugName &&
      antidiabeticDrugName.toLowerCase().includes("insulin");

    const insulinAlertStatus = usesInsulin
      ? "Please consult further with an internal medicine doctor and dietitian/nutritionist."
      : "No insulin referral alert";

    const medication = await prisma.medicationAssessment.upsert({
      where: { screeningId },
      update: {
        usesHypertensionDrug: Boolean(hasHypertensionDrug),
        usesOralAntidiabetic: Boolean(hasAntidiabeticDrug && !usesInsulin),
        usesInsulin: Boolean(usesInsulin),
        hypertensionDrugName: hypertensionDrugName || null,
        antidiabeticDrugName: antidiabeticDrugName || null,
        insulinAlertStatus,
        medicationNotes: medicationNotes || null,
      },
      create: {
        screeningId,
        usesHypertensionDrug: Boolean(hasHypertensionDrug),
        usesOralAntidiabetic: Boolean(hasAntidiabeticDrug && !usesInsulin),
        usesInsulin: Boolean(usesInsulin),
        hypertensionDrugName: hypertensionDrugName || null,
        antidiabeticDrugName: antidiabeticDrugName || null,
        insulinAlertStatus,
        medicationNotes: medicationNotes || null,
      },
    });

    if (usesInsulin) {
      await prisma.screeningResult.upsert({
        where: { screeningId },
        update: {
          referralRequired: true,
          referralReason:
            "Patient uses insulin. Further consultation with an internal medicine doctor and dietitian/nutritionist is recommended.",
        },
        create: {
          screeningId,
          referralRequired: true,
          referralReason:
            "Patient uses insulin. Further consultation with an internal medicine doctor and dietitian/nutritionist is recommended.",
        },
      });
    }

    await prisma.screeningSession.update({
      where: { screeningId },
      data: {
        screeningStatus: "medication_completed",
      },
    });

    return res.status(201).json({
      message: "Medication data saved successfully",
      data: medication,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to save medication data",
    });
  }
});

screeningRoutes.post("/:screeningId/physical-activity", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);
    const { activityLevel } = req.body;

    if (!activityLevel) {
      return res.status(400).json({
        message: "activityLevel is required",
      });
    }

    const screening = await prisma.screeningSession.findUnique({
      where: { screeningId },
      include: {
        client: true,
        anthropometryAssessment: true,
      },
    });

    if (!screening) {
      return res.status(404).json({
        message: "Screening session not found",
      });
    }

    if (!screening.anthropometryAssessment) {
      return res.status(400).json({
        message:
          "Anthropometry data is required before calculating energy needs",
      });
    }

    const client = screening.client;
    const anthropometry = screening.anthropometryAssessment;

    const weight = anthropometry.weightKg;
    const height = anthropometry.heightCm;
    const age = client.age;
    const gender = client.gender.toLowerCase();

    /**
     * Activity score.
     * You can adjust this based on your application logic.
     */
    let activityScore = 0.2;

    if (activityLevel === "Sangat Rendah") {
      activityScore = 0.2;
    } else if (activityLevel === "Rendah") {
      activityScore = 0.3;
    } else if (activityLevel === "Sedang") {
      activityScore = 0.4;
    } else if (activityLevel === "Tinggi") {
      activityScore = 0.5;
    }

    /**
     * Mifflin-St Jeor Equation
     */
    let rmr = 0;

    if (gender === "laki-laki" || gender === "male") {
      rmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      rmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    /**
     * Total Energy Expenditure:
     * RMR + TEF 10% + physical activity component
     */
    const tef = 0.1 * rmr;
    const physicalActivityEnergy = activityScore * rmr;

    const dailyEnergyKcal = Math.round(rmr + tef + physicalActivityEnergy);

    /**
     * Macronutrient distribution.
     * This can be adjusted later based on dietitian rule.
     */
    const carbohydrateGram = Math.round((0.43 * dailyEnergyKcal) / 4);
    const fatGram = Math.round((0.25 * dailyEnergyKcal) / 9);
    const proteinGram = Math.round((0.26 * dailyEnergyKcal) / 4);

    const physicalActivity = await prisma.physicalActivityAssessment.upsert({
      where: { screeningId },
      update: {
        activityLevel,
        activityScore,
      },
      create: {
        screeningId,
        activityLevel,
        activityScore,
      },
    });

    const energyRequirement = await prisma.energyRequirement.upsert({
      where: { screeningId },
      update: {
        dailyEnergyKcal,
        carbohydrateGram,
        fatGram,
        proteinGram,
        formulaUsed: "Mifflin-St Jeor + TEF 10% + activity factor",
      },
      create: {
        screeningId,
        dailyEnergyKcal,
        carbohydrateGram,
        fatGram,
        proteinGram,
        formulaUsed: "Mifflin-St Jeor + TEF 10% + activity factor",
      },
    });

    await prisma.screeningSession.update({
      where: { screeningId },
      data: {
        screeningStatus: "energy_requirement_completed",
      },
    });

    return res.status(201).json({
      message: "Physical activity and energy requirement saved successfully",
      data: {
        physicalActivity,
        energyRequirement,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to save physical activity and energy requirement",
    });
  }
});

screeningRoutes.get("/:screeningId/energy-requirement", async (req, res) => {
  try {
    const screeningId = Number(req.params.screeningId);

    const energyRequirement = await prisma.energyRequirement.findUnique({
      where: { screeningId },
    });

    if (!energyRequirement) {
      return res.status(404).json({
        message: "Energy requirement data not found",
      });
    }

    return res.json({
      message: "Energy requirement retrieved successfully",
      data: {
        dailyEnergyKcal: energyRequirement.dailyEnergyKcal,
        carbohydrateGram: energyRequirement.carbohydrateGram,
        fatGram: energyRequirement.fatGram,
        proteinGram: energyRequirement.proteinGram,
        formulaUsed: energyRequirement.formulaUsed,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to retrieve energy requirement",
    });
  }
});

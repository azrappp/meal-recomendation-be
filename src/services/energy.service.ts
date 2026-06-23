import { calculateMacros, normalizeText } from "../utils/nutrition.util.js";

type EnergyCalculationInput = {
  weight: number;
  height: number;
  age: number;
  gender: string;
  activityLevel: string;
  diabetesStatus?: string | null;
  hypertensionStatus?: string | null;
  obesityStatus?: string | null;
};

function getBasicActivityFactor(activityLevel: string): number {
  const level = normalizeText(activityLevel);

  if (level.includes("sangat rendah") || level.includes("sedentary")) {
    return 0.1;
  }

  if (level.includes("rendah")) {
    return 0.2;
  }

  if (level.includes("sedang")) {
    return 0.3;
  }

  if (level.includes("sangat tinggi")) {
    return 0.5;
  }

  if (level.includes("tinggi")) {
    return 0.4;
  }

  return 0.1;
}

function getHypertensionActivityFactor(activityLevel: string): number {
  const level = normalizeText(activityLevel);

  if (level.includes("sangat rendah") || level.includes("sedentary")) {
    return 0.1;
  }

  if (level.includes("rendah")) {
    return 0.15;
  }

  if (level.includes("sedang")) {
    return 0.3;
  }

  if (level.includes("tinggi")) {
    return 0.5;
  }

  return 0.1;
}

function calculateDMEnergy({
  weight,
  height, // 1. TAMBAHKAN HEIGHT DI SINI
  age,
  gender,
  activityLevel,
  obesityStatus,
}: EnergyCalculationInput): number {
  const normalizedGender = normalizeText(gender);
  const obesityText = normalizeText(obesityStatus || ""); // Cegah undefined

  const hasObesity =
    obesityText.includes("obesity") ||
    obesityText.includes("obesitas") ||
    obesityText.includes("central obesity");

  // 2. HITUNG BERAT BADAN IDEAL (BBI) - Rumus Broca
  const bbi = height - 100 - 0.1 * (height - 100);

  // 3. TENTUKAN BERAT KALKULASI (Gunakan BBI untuk diet DM)
  const calculationWeight = bbi;

  let basalEnergy =
    normalizedGender.includes("laki") || normalizedGender.includes("male")
      ? 30 * calculationWeight // Kalikan dengan BBI
      : 25 * calculationWeight; // Kalikan dengan BBI

  let ageReduction = 0;

  if (age >= 40 && age <= 59) {
    ageReduction = 0.05;
  } else if (age >= 60 && age <= 69) {
    ageReduction = 0.1;
  } else if (age >= 70) {
    ageReduction = 0.2;
  }

  basalEnergy = basalEnergy - basalEnergy * ageReduction;

  const activityFactor = getBasicActivityFactor(activityLevel);

  let totalEnergy = basalEnergy + basalEnergy * activityFactor;

  if (hasObesity) {
    totalEnergy = totalEnergy - totalEnergy * 0.2;
  } else if (weight > calculationWeight * 1.2) {
    totalEnergy = totalEnergy - totalEnergy * 0.2;
  }

  return Math.round(totalEnergy);
}

function calculateHypertensionEnergy({
  weight,
  height,
  age,
  gender,
  activityLevel,
  obesityStatus,
}: EnergyCalculationInput): number {
  const normalizedGender = normalizeText(gender);

  const hasObesity = isObeseFallback(obesityStatus, weight, height);

  let rmr = 0;

  if (normalizedGender.includes("laki") || normalizedGender.includes("male")) {
    rmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    rmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  const tef = 0.1 * rmr;
  const activityFactor = getHypertensionActivityFactor(activityLevel);
  const physicalActivityEnergy = activityFactor * rmr;

  let totalEnergy = rmr + tef + physicalActivityEnergy;

  if (hasObesity) {
    totalEnergy = totalEnergy - totalEnergy * 0.2;
  }

  return Math.round(totalEnergy);
}

function calculateNormalEnergy({
  weight,
  height, // <-- WAJIB DITAMBAHKAN
  age,
  gender,
  activityLevel,
  obesityStatus,
}: EnergyCalculationInput): number {
  const normalizedGender = normalizeText(gender);

  // Gunakan fungsi pengaman yang baru dibuat
  const hasObesity = isObeseFallback(obesityStatus, weight, height);

  // Hitung Berat Badan Ideal (BBI)
  const bbi = height - 100 - 0.1 * (height - 100);

  // Jika pasien Obesitas, paksa sistem menggunakan BBI sebagai basis kalori
  const calculationWeight = hasObesity ? bbi : weight;

  let basalEnergy =
    normalizedGender.includes("laki") || normalizedGender.includes("male")
      ? 30 * calculationWeight // Menggunakan calculationWeight
      : 25 * calculationWeight; // Menggunakan calculationWeight

  let ageReduction = 0;

  if (age >= 40 && age <= 59) {
    ageReduction = 0.05;
  } else if (age >= 60 && age <= 69) {
    ageReduction = 0.1;
  } else if (age >= 70) {
    ageReduction = 0.2;
  }

  basalEnergy = basalEnergy - basalEnergy * ageReduction;

  const activityFactor = getBasicActivityFactor(activityLevel);

  let totalEnergy = basalEnergy + basalEnergy * activityFactor;

  // Terapkan defisit 20% khusus untuk pasien obesitas agar berat badannya turun
  if (hasObesity) {
    totalEnergy = totalEnergy - totalEnergy * 0.2;
  }

  return Math.round(totalEnergy);
}

export function calculateEnergyRequirement(input: EnergyCalculationInput) {
  const diabetesText = normalizeText(input.diabetesStatus);
  const hypertensionText = normalizeText(input.hypertensionStatus);

  const hasDM =
    diabetesText.includes("dm") || diabetesText.includes("diabetes");

  const hasHypertension =
    hypertensionText.includes("hipertensi") ||
    hypertensionText.includes("hypertension");

  let dailyEnergyKcal = 0;

  if (hasDM) {
    dailyEnergyKcal = calculateDMEnergy(input);
  } else if (hasHypertension) {
    dailyEnergyKcal = calculateHypertensionEnergy(input);
  } else {
    dailyEnergyKcal = calculateNormalEnergy(input);
  }

  const macros = calculateMacros(dailyEnergyKcal);

  return {
    dailyEnergyKcal,
    ...macros,
  };
}

function isObeseFallback(
  obesityStatus: string | null | undefined,
  weight: number,
  height: number,
): boolean {
  const obesityText = normalizeText(obesityStatus || "");

  if (
    obesityText.includes("obesity") ||
    obesityText.includes("obesitas") ||
    obesityText.includes("central obesity")
  ) {
    return true;
  }

  const heightMeter = height / 100;
  const bmi = weight / (heightMeter * heightMeter);

  if (bmi >= 25) {
    return true;
  }

  return false;
}

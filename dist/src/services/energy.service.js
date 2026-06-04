import { calculateMacros, normalizeText } from "../utils/nutrition.util.js";
function getDMActivityFactor(activityLevel) {
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
function getHypertensionActivityFactor(activityLevel) {
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
function calculateDMEnergy({ weight, age, gender, activityLevel, obesityStatus, }) {
    const normalizedGender = normalizeText(gender);
    const obesityText = normalizeText(obesityStatus);
    const hasObesity = obesityText.includes("obesity") ||
        obesityText.includes("obesitas") ||
        obesityText.includes("central obesity");
    let basalEnergy = normalizedGender.includes("laki") || normalizedGender.includes("male")
        ? 30 * weight
        : 25 * weight;
    let ageReduction = 0;
    if (age >= 40 && age <= 59) {
        ageReduction = 0.05;
    }
    else if (age >= 60 && age <= 69) {
        ageReduction = 0.1;
    }
    else if (age >= 70) {
        ageReduction = 0.2;
    }
    basalEnergy = basalEnergy - basalEnergy * ageReduction;
    const activityFactor = getDMActivityFactor(activityLevel);
    let totalEnergy = basalEnergy + basalEnergy * activityFactor;
    if (hasObesity) {
        totalEnergy = totalEnergy - totalEnergy * 0.2;
    }
    return Math.round(totalEnergy);
}
function calculateHypertensionEnergy({ weight, height, age, gender, activityLevel, obesityStatus, }) {
    const normalizedGender = normalizeText(gender);
    const hasObesity = normalizeText(obesityStatus).includes("obesitas");
    let rmr = 0;
    if (normalizedGender.includes("laki") || normalizedGender.includes("male")) {
        rmr = 10 * weight + 6.25 * height - 5 * age + 5;
    }
    else {
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
export function calculateEnergyRequirement(input) {
    const diabetesText = normalizeText(input.diabetesStatus);
    const hypertensionText = normalizeText(input.hypertensionStatus);
    const hasDM = diabetesText.includes("dm") || diabetesText.includes("diabetes");
    const hasHypertension = hypertensionText.includes("hipertensi") ||
        hypertensionText.includes("hypertension");
    let dailyEnergyKcal = 0;
    if (hasDM) {
        dailyEnergyKcal = calculateDMEnergy(input);
    }
    else if (hasHypertension) {
        dailyEnergyKcal = calculateHypertensionEnergy(input);
    }
    else {
        throw new Error("Screening result must indicate DM or hypertension before calculating energy requirement");
    }
    const macros = calculateMacros(dailyEnergyKcal);
    return {
        dailyEnergyKcal,
        ...macros,
    };
}

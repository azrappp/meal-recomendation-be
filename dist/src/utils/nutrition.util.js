export function normalizeText(value) {
    return value?.toLowerCase().trim() ?? "";
}
export function calculateMacros(dailyEnergyKcal) {
    const carbohydratePercent = 0.6;
    const proteinPercent = 0.15;
    const fatPercent = 0.25;
    return {
        carbohydrateGram: Math.round((carbohydratePercent * dailyEnergyKcal) / 4),
        proteinGram: Math.round((proteinPercent * dailyEnergyKcal) / 4),
        fatGram: Math.round((fatPercent * dailyEnergyKcal) / 9),
    };
}

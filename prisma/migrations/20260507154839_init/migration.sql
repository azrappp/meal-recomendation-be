-- CreateTable
CREATE TABLE "clients" (
    "client_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "occupation" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "screening_sessions" (
    "screening_id" SERIAL NOT NULL,
    "client_id" INTEGER NOT NULL,
    "screening_date" DATE NOT NULL,
    "screening_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_sessions_pkey" PRIMARY KEY ("screening_id")
);

-- CreateTable
CREATE TABLE "anthropometry_assessments" (
    "anthropometry_id" SERIAL NOT NULL,
    "screening_id" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "height_cm" DOUBLE PRECISION NOT NULL,
    "bmi" DOUBLE PRECISION NOT NULL,
    "waist_circumference_cm" DOUBLE PRECISION,
    "bmi_status" TEXT,
    "waist_status" TEXT,

    CONSTRAINT "anthropometry_assessments_pkey" PRIMARY KEY ("anthropometry_id")
);

-- CreateTable
CREATE TABLE "biochemical_assessments" (
    "biochemical_id" SERIAL NOT NULL,
    "screening_id" INTEGER NOT NULL,
    "fasting_glucose_mg_dl" DOUBLE PRECISION,
    "postprandial_glucose_mg_dl" DOUBLE PRECISION,
    "random_glucose_mg_dl" DOUBLE PRECISION,
    "hba1c_percent" DOUBLE PRECISION,
    "glucose_status" TEXT,
    "hba1c_status" TEXT,

    CONSTRAINT "biochemical_assessments_pkey" PRIMARY KEY ("biochemical_id")
);

-- CreateTable
CREATE TABLE "clinical_assessments" (
    "clinical_id" SERIAL NOT NULL,
    "screening_id" INTEGER NOT NULL,
    "systolic_bp" DOUBLE PRECISION,
    "diastolic_bp" DOUBLE PRECISION,
    "blood_pressure_status" TEXT,
    "headache" BOOLEAN NOT NULL DEFAULT false,
    "chest_pain" BOOLEAN NOT NULL DEFAULT false,
    "visual_disturbance" BOOLEAN NOT NULL DEFAULT false,
    "frequent_urination_night" BOOLEAN NOT NULL DEFAULT false,
    "shortness_of_breath" BOOLEAN NOT NULL DEFAULT false,
    "polyphagia" BOOLEAN NOT NULL DEFAULT false,
    "dizziness" BOOLEAN NOT NULL DEFAULT false,
    "polydipsia" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "clinical_assessments_pkey" PRIMARY KEY ("clinical_id")
);

-- CreateTable
CREATE TABLE "medication_assessments" (
    "medication_assessment_id" SERIAL NOT NULL,
    "screening_id" INTEGER NOT NULL,
    "uses_hypertension_drug" BOOLEAN NOT NULL DEFAULT false,
    "uses_oral_antidiabetic" BOOLEAN NOT NULL DEFAULT false,
    "uses_insulin" BOOLEAN NOT NULL DEFAULT false,
    "hypertension_drug_name" TEXT,
    "antidiabetic_drug_name" TEXT,
    "insulin_alert_status" TEXT,
    "medication_notes" TEXT,

    CONSTRAINT "medication_assessments_pkey" PRIMARY KEY ("medication_assessment_id")
);

-- CreateTable
CREATE TABLE "physical_activity_assessments" (
    "activity_assessment_id" SERIAL NOT NULL,
    "screening_id" INTEGER NOT NULL,
    "activity_level" TEXT NOT NULL,
    "activity_score" DOUBLE PRECISION,

    CONSTRAINT "physical_activity_assessments_pkey" PRIMARY KEY ("activity_assessment_id")
);

-- CreateTable
CREATE TABLE "screening_results" (
    "result_id" SERIAL NOT NULL,
    "screening_id" INTEGER NOT NULL,
    "diabetes_status" TEXT,
    "hypertension_status" TEXT,
    "obesity_status" TEXT,
    "final_screening_category" TEXT,
    "referral_required" BOOLEAN NOT NULL DEFAULT false,
    "referral_reason" TEXT,
    "screening_summary" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "screening_results_pkey" PRIMARY KEY ("result_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "anthropometry_assessments_screening_id_key" ON "anthropometry_assessments"("screening_id");

-- CreateIndex
CREATE UNIQUE INDEX "biochemical_assessments_screening_id_key" ON "biochemical_assessments"("screening_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_assessments_screening_id_key" ON "clinical_assessments"("screening_id");

-- CreateIndex
CREATE UNIQUE INDEX "medication_assessments_screening_id_key" ON "medication_assessments"("screening_id");

-- CreateIndex
CREATE UNIQUE INDEX "physical_activity_assessments_screening_id_key" ON "physical_activity_assessments"("screening_id");

-- CreateIndex
CREATE UNIQUE INDEX "screening_results_screening_id_key" ON "screening_results"("screening_id");

-- AddForeignKey
ALTER TABLE "screening_sessions" ADD CONSTRAINT "screening_sessions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anthropometry_assessments" ADD CONSTRAINT "anthropometry_assessments_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screening_sessions"("screening_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biochemical_assessments" ADD CONSTRAINT "biochemical_assessments_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screening_sessions"("screening_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_assessments" ADD CONSTRAINT "clinical_assessments_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screening_sessions"("screening_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_assessments" ADD CONSTRAINT "medication_assessments_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screening_sessions"("screening_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physical_activity_assessments" ADD CONSTRAINT "physical_activity_assessments_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screening_sessions"("screening_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screening_results" ADD CONSTRAINT "screening_results_screening_id_fkey" FOREIGN KEY ("screening_id") REFERENCES "screening_sessions"("screening_id") ON DELETE CASCADE ON UPDATE CASCADE;

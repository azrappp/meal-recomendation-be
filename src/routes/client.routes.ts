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

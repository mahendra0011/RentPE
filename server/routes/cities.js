import { Router } from "express";

import { isMongoConnected } from "../config/db.js";
import City from "../models/City.js";
import Room from "../models/Room.js";
import { requireAdmin } from "../middleware/auth.js";

const router = Router();

// In-memory fallback
const memoryCities = ["Bhopal", "Indore", "Delhi", "Mumbai", "Bangalore", "Pune"];

router.use(requireAdmin);

// GET /api/admin/cities - List all cities (from City collection + Room distinct cities)
router.get("/", async (_request, response, next) => {
  try {
    if (isMongoConnected()) {
      // Get cities from City collection
      let cities = await City.find({ isActive: true }).sort({ name: 1 }).lean();

      // If no cities in City collection, seed from Room distinct cities
      if (cities.length === 0) {
        const roomCities = await Room.distinct("city");
        cities = roomCities
          .filter(Boolean)
          .sort()
          .map((name) => ({ name, state: "", isActive: true }));
      }

      response.json(cities);
      return;
    }

    response.json(memoryCities.map((name) => ({ name, state: "", isActive: true })));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/cities - Add a new city
router.post("/", async (request, response, next) => {
  try {
    const { name, state } = request.body;

    if (!name || !name.trim()) {
      response.status(400).json({ message: "City name is required." });
      return;
    }

    const cityName = name.trim();
    const cityState = (state || "").trim();

    if (isMongoConnected()) {
      const exists = await City.findOne({ name: { $regex: `^${cityName}$`, $options: "i" } });
      if (exists) {
        response.status(409).json({ message: `City "${cityName}" already exists.` });
        return;
      }

      const city = await City.create({ name: cityName, state: cityState });
      response.status(201).json(city);
      return;
    }

    const exists = memoryCities.some((c) => c.toLowerCase() === cityName.toLowerCase());
    if (exists) {
      response.status(409).json({ message: `City "${cityName}" already exists.` });
      return;
    }

    memoryCities.push(cityName);
    response.status(201).json({ name: cityName, state: cityState, isActive: true });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/cities/:name - Delete a city
router.delete("/:name", async (request, response, next) => {
  try {
    const cityName = String(request.params.name || "").trim();

    if (!cityName) {
      response.status(400).json({ message: "City name is required." });
      return;
    }

    if (isMongoConnected()) {
      const city = await City.findOneAndDelete({
        name: { $regex: `^${cityName}$`, $options: "i" },
      });

      if (!city) {
        response.status(404).json({ message: `City "${cityName}" not found.` });
        return;
      }

      response.json({ message: `City "${city.name}" deleted.` });
      return;
    }

    const index = memoryCities.findIndex((c) => c.toLowerCase() === cityName.toLowerCase());
    if (index === -1) {
      response.status(404).json({ message: `City "${cityName}" not found.` });
      return;
    }

    memoryCities.splice(index, 1);
    response.json({ message: `City "${cityName}" deleted.` });
  } catch (error) {
    next(error);
  }
});

export default router;
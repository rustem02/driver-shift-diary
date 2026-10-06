import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TripStore } from "./store.js";
import { calculateSummary } from "./summary.js";
import { validateTrip } from "./validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Создаёт Express-приложение. store можно подменить в тестах.
 * @param {{ store?: TripStore }} [options]
 */
export function createApp(options = {}) {
  const store = options.store ?? new TripStore();
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));

  /** GET /api/dates — список дней, по которым есть поездки */
  app.get("/api/dates", async (_req, res) => {
    try {
      const dates = await store.getAvailableDates();
      res.json({ dates });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Не удалось загрузить даты" });
    }
  });

  /**
   * GET /api/trips?date=YYYY-MM-DD
   * Список поездок за день + сводка.
   */
  app.get("/api/trips", async (req, res) => {
    const { date } = req.query;

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res
        .status(400)
        .json({ error: "Параметр date обязателен (формат YYYY-MM-DD)" });
    }

    try {
      const trips = await store.getByDate(date);
      const summary = calculateSummary(trips);
      res.json({ date, trips, summary });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Не удалось загрузить поездки" });
    }
  });

  /**
   * POST /api/trips
   * Добавление поездки с валидацией и защитой от дублей.
   */
  app.post("/api/trips", async (req, res) => {
    const result = validateTrip(req.body);
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }

    try {
      const { trip, created } = await store.addTrip(result.trip);
      res.status(created ? 201 : 200).json({ trip, created });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Не удалось сохранить поездку" });
    }
  });

  return app;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const PORT = Number(process.env.PORT) || 3000;
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Дневник смен: http://localhost:${PORT}`);
  });
}

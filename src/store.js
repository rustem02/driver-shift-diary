import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isSameTrip } from "./validation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_PATH = path.join(__dirname, "..", "data", "trips.json");

export class TripStore {
  /** @param {string} [dataPath] */
  constructor(dataPath = DEFAULT_DATA_PATH) {
    this.dataPath = dataPath;
    /** @type {Array<object>|null} */
    this.trips = null;
  }

  async load() {
    if (this.trips !== null) {
      return this.trips;
    }
    const raw = await fs.readFile(this.dataPath, "utf8");
    this.trips = JSON.parse(raw);
    return this.trips;
  }

  async save() {
    await fs.writeFile(
      this.dataPath,
      JSON.stringify(this.trips, null, 2) + "\n",
      "utf8",
    );
  }

  /**
   * Локальная дата поездки в формате YYYY-MM-DD (по смещению из ISO-строки).
   */
  static tripDate(trip) {
    // Берём календарный день из строки start (YYYY-MM-DD...),
    // чтобы не зависеть от TZ сервера.
    return trip.start.slice(0, 10);
  }

  async getByDate(date) {
    const trips = await this.load();
    return trips
      .filter((t) => TripStore.tripDate(t) === date)
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  }

  async getAvailableDates() {
    const trips = await this.load();
    const dates = new Set(trips.map((t) => TripStore.tripDate(t)));
    return [...dates].sort();
  }

  /**
   * Добавляет поездку. При дубле возвращает существующую без записи.
   * @returns {{ trip: object, created: boolean }}
   */
  async addTrip(trip) {
    const trips = await this.load();
    const existing = trips.find((t) => isSameTrip(t, trip));
    if (existing) {
      return { trip: existing, created: false };
    }

    const newTrip = {
      ...trip,
      id: trip.id || `t${Date.now()}`,
    };
    trips.push(newTrip);
    await this.save();
    return { trip: newTrip, created: true };
  }
}

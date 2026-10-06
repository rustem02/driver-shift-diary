const PAYMENTS = new Set(["cash", "card"]);

/**
 * Валидирует тело запроса на создание поездки.
 * @returns {{ ok: true, trip: object } | { ok: false, error: string }}
 */
export function validateTrip(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Тело запроса должно быть объектом" };
  }

  const { id, start, end, amount, payment, commission } = body;

  if (id !== undefined && (typeof id !== "string" || id.trim() === "")) {
    return { ok: false, error: "id должен быть непустой строкой" };
  }

  if (typeof start !== "string" || Number.isNaN(Date.parse(start))) {
    return { ok: false, error: "start должен быть валидной датой ISO 8601" };
  }

  if (typeof end !== "string" || Number.isNaN(Date.parse(end))) {
    return { ok: false, error: "end должен быть валидной датой ISO 8601" };
  }

  if (Date.parse(end) <= Date.parse(start)) {
    return { ok: false, error: "end должен быть позже start" };
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "amount должен быть числом больше 0" };
  }

  if (!PAYMENTS.has(payment)) {
    return { ok: false, error: "payment должен быть cash или card" };
  }

  if (
    typeof commission !== "number" ||
    !Number.isFinite(commission) ||
    commission < 0
  ) {
    return { ok: false, error: "commission должен быть числом >= 0" };
  }

  if (commission > amount) {
    return { ok: false, error: "commission не может превышать amount" };
  }

  return {
    ok: true,
    trip: {
      id: id?.trim(),
      start,
      end,
      amount,
      payment,
      commission,
    },
  };
}

/**
 * Две поездки считаются одной и той же, если совпадает id
 * или полностью совпадают ключевые поля.
 */
export function isSameTrip(a, b) {
  if (a.id && b.id && a.id === b.id) {
    return true;
  }

  return (
    a.start === b.start &&
    a.end === b.end &&
    a.amount === b.amount &&
    a.payment === b.payment &&
    a.commission === b.commission
  );
}

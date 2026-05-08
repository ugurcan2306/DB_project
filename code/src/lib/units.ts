export function normalizeQuantity(quantity: number, unit: string): { quantity: number; unit: string } {
  const lowerUnit = (unit || "").toLowerCase().trim();
  if (lowerUnit === "kg" || lowerUnit === "kilogram" || lowerUnit === "kilograms") {
    return { quantity: quantity * 1000, unit: "g" };
  }
  if (lowerUnit === "l" || lowerUnit === "liter" || lowerUnit === "liters") {
    return { quantity: quantity * 1000, unit: "ml" };
  }
  return { quantity, unit: lowerUnit };
}

export function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number {
  const normFrom = normalizeQuantity(quantity, fromUnit);
  const normTo = normalizeQuantity(1, toUnit);

  if (normFrom.unit !== normTo.unit) {
    // Fallback if units are incompatible or unrecognized
    return quantity;
  }

  return normFrom.quantity / normTo.quantity;
}

// Lista de locales en un solo lugar (la usan el servidor y la pantalla /generar).
// Para sumar un local nuevo más adelante: agregalo en NEW_STORES con su mes de inicio.

export const BASE_STORES = [
  "Arenales",
  "Bulnes",
  "Echeverria",
  "Guayaquil",
  "Olazabal",
  "Uriarte",
  "Uruguay",
  "Vidal",
] as const;

// Locales que existen solo desde cierto mes. fromMonth es 0-11 (Enero = 0, Octubre = 9).
export const NEW_STORES: { name: string; fromYear: number; fromMonth: number }[] = [
  { name: "Franklin", fromYear: 2026, fromMonth: 9 }, // desde Octubre 2026
];

// Locales que se cargan en un mes dado (mesIdx: 0-11).
export function storesForMonth(mesIdx: number, anio: number): string[] {
  const list: string[] = [...BASE_STORES];
  NEW_STORES.forEach((s) => {
    if (anio > s.fromYear || (anio === s.fromYear && mesIdx >= s.fromMonth)) list.push(s.name);
  });
  return list;
}

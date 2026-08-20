export function getRouteParam(value: string | string[] | undefined, name: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Parametro de rota ausente ou invalido: ${name}`);
  }
  return value;
}

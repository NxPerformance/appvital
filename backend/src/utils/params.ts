export function getRouteParam(value: string | string[] | undefined, name: string) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new Error(`Parametro de rota invalido: ${name}`);
}

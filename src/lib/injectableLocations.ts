// Shared by Injectables.tsx and NewInjectable.tsx (and previously reimplemented
// a second time inside Injectables.tsx itself as a separate label lookup) so
// the list of valid injection sites lives in exactly one place.
export const BODY_LOCATIONS = [
  { value: 'abdomen', label: 'Abdômen' },
  { value: 'coxa', label: 'Coxa' },
  { value: 'braco', label: 'Braço' },
] as const;

export const BODY_LOCATION_LABELS: Record<string, string> = Object.fromEntries(
  BODY_LOCATIONS.map((loc) => [loc.value, loc.label]),
);

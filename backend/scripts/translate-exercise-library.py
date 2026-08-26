# Regenerates prisma/seed-data/exercises.json from the free-exercise-db
# dataset (MIT license). To refresh from source and reapply this dictionary:
#
#   curl -sL https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json \
#     -o /tmp/exercises-raw.json
#   python3 backend/scripts/translate-exercise-library.py
#
# Then re-run `npx tsx prisma/seed-exercises.ts` (from backend/) to reimport.
#
# namePt is only filled in when the ENTIRE exercise name is covered by
# NAME_DICT below - a partial match left raw English fragments mixed into
# the Portuguese name, which reads worse than just keeping the original
# English name. Expand NAME_DICT over time to raise the translated share
# (currently ~90/873); check translate_name()'s all-or-nothing rule stays
# intact if you do.

import json
import re

SRC = "/tmp/exercises-raw.json"
OUT = "../prisma/seed-data/exercises.json"

FORCE_PT = {"pull": "puxada", "push": "empurrada", "static": "estática"}
LEVEL_PT = {"beginner": "iniciante", "intermediate": "intermediário", "expert": "avançado"}
MECHANIC_PT = {"compound": "composto", "isolation": "isolado"}
EQUIPMENT_PT = {
    "bands": "elásticos",
    "barbell": "barra",
    "body only": "peso corporal",
    "cable": "polia",
    "dumbbell": "halteres",
    "e-z curl bar": "barra w",
    "exercise ball": "bola suíça",
    "foam roll": "rolo de espuma",
    "kettlebells": "kettlebell",
    "machine": "máquina",
    "medicine ball": "bola medicinal",
    "other": "outro",
}
CATEGORY_PT = {
    "cardio": "cardio",
    "olympic weightlifting": "levantamento olímpico",
    "plyometrics": "pliometria",
    "powerlifting": "powerlifting",
    "strength": "força",
    "stretching": "alongamento",
    "strongman": "strongman",
}
MUSCLE_PT = {
    "abdominals": "abdômen",
    "abductors": "abdutores",
    "adductors": "adutores",
    "biceps": "bíceps",
    "calves": "panturrilhas",
    "chest": "peitoral",
    "forearms": "antebraços",
    "glutes": "glúteos",
    "hamstrings": "posteriores de coxa",
    "lats": "dorsais",
    "lower back": "lombar",
    "middle back": "meio das costas",
    "neck": "pescoço",
    "quadriceps": "quadríceps",
    "shoulders": "ombros",
    "traps": "trapézio",
    "triceps": "tríceps",
}

# Ordered longest-phrase-first so multi-word terms match before their sub-words.
NAME_DICT = [
    ("Barbell Full Squat", "Agachamento Livre com Barra"),
    ("Barbell Bench Press", "Supino Reto com Barra"),
    ("Barbell Incline Bench Press", "Supino Inclinado com Barra"),
    ("Barbell Decline Bench Press", "Supino Declinado com Barra"),
    ("Dumbbell Bench Press", "Supino Reto com Halteres"),
    ("Dumbbell Incline Bench Press", "Supino Inclinado com Halteres"),
    ("Incline Bench Press", "Supino Inclinado"),
    ("Decline Bench Press", "Supino Declinado"),
    ("Close-Grip Bench Press", "Supino Pegada Fechada"),
    ("Wide-Grip", "Pegada Aberta"),
    ("Close-Grip", "Pegada Fechada"),
    ("Bench Press", "Supino"),
    ("Push-Up", "Flexão"),
    ("Push Up", "Flexão"),
    ("Pull-Up", "Barra Fixa"),
    ("Pull Up", "Barra Fixa"),
    ("Chin-Up", "Barra Fixa (pegada supinada)"),
    ("Chin Up", "Barra Fixa (pegada supinada)"),
    ("Sit-Up", "Abdominal"),
    ("Sit Up", "Abdominal"),
    ("V-Up", "Abdominal em V"),
    ("Leg Press", "Leg Press"),
    ("Leg Curl", "Mesa Flexora"),
    ("Leg Extension", "Cadeira Extensora"),
    ("Leg Raise", "Elevação de Pernas"),
    ("Calf Raise", "Elevação de Panturrilha"),
    ("Hip Thrust", "Elevação de Quadril"),
    ("Glute Bridge", "Ponte de Glúteo"),
    ("Hip Abduction", "Abdução de Quadril"),
    ("Hip Adduction", "Adução de Quadril"),
    ("Lat Pulldown", "Puxada Alta"),
    ("Seated Row", "Remada Sentada"),
    ("Bent Over Row", "Remada Curvada"),
    ("Upright Row", "Remada Alta"),
    ("Cable Row", "Remada na Polia"),
    ("One Arm Row", "Remada Unilateral"),
    ("Bicep Curl", "Rosca Bíceps"),
    ("Hammer Curl", "Rosca Martelo"),
    ("Preacher Curl", "Rosca Scott"),
    ("Concentration Curl", "Rosca Concentrada"),
    ("Wrist Curl", "Rosca de Punho"),
    ("Tricep Extension", "Extensão de Tríceps"),
    ("Skull Crusher", "Tríceps Testa"),
    ("Tricep Pushdown", "Tríceps na Polia"),
    ("Tricep Dip", "Mergulho para Tríceps"),
    ("Overhead Press", "Desenvolvimento"),
    ("Shoulder Press", "Desenvolvimento de Ombros"),
    ("Military Press", "Desenvolvimento Militar"),
    ("Lateral Raise", "Elevação Lateral"),
    ("Front Raise", "Elevação Frontal"),
    ("Rear Delt", "Deltoide Posterior"),
    ("Face Pull", "Face Pull"),
    ("Cable Crossover", "Crucifixo na Polia"),
    ("Chest Fly", "Crucifixo"),
    ("Chest Press", "Supino"),
    ("Pec Deck", "Peck Deck"),
    ("Deadlift", "Levantamento Terra"),
    ("Romanian Deadlift", "Levantamento Terra Romeno"),
    ("Sumo Deadlift", "Levantamento Terra Sumô"),
    ("Good Morning", "Bom Dia"),
    ("Front Squat", "Agachamento Frontal"),
    ("Back Squat", "Agachamento"),
    ("Goblet Squat", "Agachamento Goblet"),
    ("Squat", "Agachamento"),
    ("Lunge", "Afundo"),
    ("Step-Up", "Subida no Banco"),
    ("Step Up", "Subida no Banco"),
    ("Hyperextension", "Hiperextensão"),
    ("Plank", "Prancha"),
    ("Side Plank", "Prancha Lateral"),
    ("Russian Twist", "Torção Russa"),
    ("Mountain Climber", "Escalador"),
    ("Bicycle Crunch", "Abdominal Bicicleta"),
    ("Crunch", "Abdominal Curto"),
    ("Woodchopper", "Lenhador"),
    ("Shrug", "Encolhimento de Ombros"),
    ("Kickback", "Coice"),
    ("Farmer's Walk", "Caminhada do Fazendeiro"),
    ("Box Jump", "Salto na Caixa"),
    ("Jump Rope", "Pular Corda"),
    ("Burpee", "Burpee"),
    ("Clean and Jerk", "Arranco e Arremesso"),
    ("Snatch", "Arranco"),
    ("Clean", "Levantamento Clean"),
    ("Jerk", "Arremesso"),
    ("Thruster", "Thruster"),
    ("Kettlebell Swing", "Balanço com Kettlebell"),
    ("Swing", "Balanço"),
    ("Superman", "Superman"),
    ("Bird Dog", "Cachorro-Pássaro"),
    ("Cat Cow", "Gato-Camelo"),
    ("Wide Stance", "Base Larga"),
    ("Reverse", "Invertido"),
    ("Alternating", "Alternado"),
    ("Single Leg", "Unilateral (perna)"),
    ("Single Arm", "Unilateral (braço)"),
    ("One Arm", "Unilateral"),
    ("Two Arm", "Dois Braços"),
    ("Standing", "em Pé"),
    ("Seated", "Sentado"),
    ("Lying", "Deitado"),
    ("Incline", "Inclinado"),
    ("Decline", "Declinado"),
    ("Overhead", "Acima da Cabeça"),
    ("Barbell", "com Barra"),
    ("Dumbbell", "com Halteres"),
    ("Kettlebell", "com Kettlebell"),
    ("Cable", "na Polia"),
    ("Machine", "na Máquina"),
    ("Band", "com Elástico"),
    ("Smith Machine", "na Máquina Smith"),
    ("Stretch", "Alongamento"),
]


def translate_name(name_en: str):
    remaining = name_en
    translated_parts = []

    for term_en, term_pt in NAME_DICT:
        pattern = re.compile(re.escape(term_en), re.IGNORECASE)
        if pattern.search(remaining):
            remaining = pattern.sub("", remaining)
            translated_parts.append(term_pt)

    # Only accept the translation if the ENTIRE name was covered by the
    # dictionary - a partial match left over as raw English fragments
    # produces broken Portuguese/English Frankenstein names, which is worse
    # than just keeping the original English name untouched.
    leftover = re.sub(r"[\s,\-()]+", "", remaining)
    if not translated_parts or leftover:
        return name_en, False

    result = " ".join(p for p in translated_parts if p).strip()

    # "Bench Press" defaults to "Supino Reto" (flat), but when Incline/Decline
    # also matched separately (source word order didn't line up with one of
    # our compound phrases), that produces a contradiction like "Supino Reto
    # ... Declinado". Drop "Reto" whenever an incline/decline modifier is
    # also present, rather than claiming the exercise is both.
    if "Reto" in result and ("Inclinado" in result or "Declinado" in result):
        result = re.sub(r"\bReto\b\s*", "", result).strip()

    # Same idea for repeated "Levantamento" (e.g. "Clean Deadlift" matching
    # both "Deadlift" -> "Levantamento Terra" and "Clean" -> "Levantamento
    # Clean" independently) - collapse to avoid the word appearing twice.
    words = result.split()
    if words.count("Levantamento") > 1:
        first = words.index("Levantamento")
        words = words[: first + 1] + [w for w in words[first + 1 :] if w != "Levantamento"]
        result = " ".join(words)

    result = re.sub(r"\s{2,}", " ", result).strip()
    return result, True


def main():
    data = json.load(open(SRC, encoding="utf-8"))
    out = []
    translated_count = 0

    for item in data:
        name_pt, matched = translate_name(item["name"])
        if matched:
            translated_count += 1

        out.append(
            {
                "id": item["id"],
                "nameEn": item["name"],
                "namePt": name_pt,
                "force": FORCE_PT.get(item.get("force") or "", item.get("force")),
                "level": LEVEL_PT.get(item.get("level") or "", item.get("level")),
                "mechanic": MECHANIC_PT.get(item.get("mechanic") or "", item.get("mechanic")),
                "equipment": EQUIPMENT_PT.get(item.get("equipment") or "", item.get("equipment")),
                "category": CATEGORY_PT.get(item["category"], item["category"]),
                "primaryMuscles": [MUSCLE_PT.get(m, m) for m in item.get("primaryMuscles") or []],
                "secondaryMuscles": [MUSCLE_PT.get(m, m) for m in item.get("secondaryMuscles") or []],
                "instructions": item.get("instructions") or [],
                "images": [
                    f"https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/{img}"
                    for img in (item.get("images") or [])
                ],
            }
        )

    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"total: {len(out)}, name translated (at least partially): {translated_count}, kept English as-is: {len(out) - translated_count}")


if __name__ == "__main__":
    main()

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleIntegerKeyDown } from "@/lib/inputValidation";

interface ExerciseSet {
  reps: number;
  weight: number;
}

interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

interface ExerciseInputFormProps {
  currentExercise: Exercise;
  onExerciseChange: (exercise: Exercise) => void;
  onAddExercise: () => void;
  onCancelEdit: () => void;
  isEditing: boolean;
}

// WeightInput component to handle decimal input with comma
function WeightInput({ weight, onChange }: { weight: number; onChange: (value: number) => void }) {
  const [displayValue, setDisplayValue] = useState(weight > 0 ? weight.toString().replace(".", ",") : "");
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!isEditingRef.current) {
      const formatted = weight > 0 ? weight.toString().replace(".", ",") : "";
      setDisplayValue(formatted);
    }
  }, [weight]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isEditingRef.current = true;
    let value = e.target.value;
    value = value.replace(/[^0-9,]/g, "");
    const parts = value.split(",");
    if (parts.length > 2) {
      value = parts[0] + "," + parts.slice(1).join("");
    }
    setDisplayValue(value);
  };

  const handleBlur = () => {
    isEditingRef.current = false;
    const numericValue = displayValue.replace(",", ".");
    const parsed = parseFloat(numericValue) || 0;
    onChange(parsed);
    setDisplayValue(parsed > 0 ? parsed.toString().replace(".", ",") : "");
  };

  return (
    <Input
      type="text"
      inputMode="decimal"
      placeholder="Peso (kg)"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className="bg-card border-border text-sm"
    />
  );
}

export function ExerciseInputForm({
  currentExercise,
  onExerciseChange,
  onAddExercise,
  onCancelEdit,
  isEditing,
}: ExerciseInputFormProps) {
  const updateName = (name: string) => {
    onExerciseChange({ ...currentExercise, name });
  };

  const updateSet = (setIndex: number, field: keyof ExerciseSet, value: number) => {
    const updated = { ...currentExercise };
    updated.sets = [...currentExercise.sets];
    updated.sets[setIndex] = { ...updated.sets[setIndex], [field]: value };
    onExerciseChange(updated);
  };

  const addSet = () => {
    onExerciseChange({
      ...currentExercise,
      sets: [...currentExercise.sets, { reps: 0, weight: 0 }],
    });
  };

  const removeSet = (setIndex: number) => {
    if (currentExercise.sets.length > 1) {
      onExerciseChange({
        ...currentExercise,
        sets: currentExercise.sets.filter((_, i) => i !== setIndex),
      });
    }
  };

  return (
    <div className="bg-background rounded-lg p-4 space-y-4 border-2 border-dashed border-accent/30">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-accent">{isEditing ? "Editando Exercício" : "Novo Exercício"}</Label>
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
            className="text-muted-foreground hover:text-foreground h-7 px-2"
          >
            <X className="w-4 h-4 mr-1" />
            Cancelar
          </Button>
        )}
      </div>

      <Input
        placeholder="Nome do exercício (ex: Supino Reto)"
        value={currentExercise.name}
        onChange={(e) => updateName(e.target.value)}
        className="bg-card border-border"
      />

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Séries</Label>

        {currentExercise.sets.map((set, setIndex) => (
          <div key={setIndex} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-6">{setIndex + 1}.</span>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Reps"
                maxLength={4}
                value={set.reps || ""}
                onKeyDown={handleIntegerKeyDown}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, "");
                  updateSet(setIndex, "reps", Number(value) || 0);
                }}
                className="bg-card border-border text-sm"
              />
              <WeightInput weight={set.weight} onChange={(value) => updateSet(setIndex, "weight", value)} />
            </div>
            {currentExercise.sets.length > 1 && (
              <button type="button" onClick={() => removeSet(setIndex)} className="text-destructive/60 hover:text-destructive p-1">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        <Button
          onClick={addSet}
          variant="ghost"
          size="sm"
          className="w-full text-accent hover:text-accent hover:bg-accent/10 mt-2"
        >
          <Plus className="w-3 h-3 mr-1" />
          Adicionar Série
        </Button>
      </div>

      <Button onClick={onAddExercise} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
        {isEditing ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Atualizar Exercício
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            Salvar Exercício
          </>
        )}
      </Button>
    </div>
  );
}

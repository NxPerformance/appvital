import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ExerciseSet {
  reps: number;
  weight: number;
}

interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

interface AddedExerciseCardProps {
  exercise: Exercise;
  index: number;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function AddedExerciseCard({ exercise, index, onEdit, onRemove }: AddedExerciseCardProps) {
  const formatSets = () => {
    const validSets = exercise.sets.filter(s => s.reps > 0 || s.weight > 0);
    if (validSets.length === 0) return `${exercise.sets.length} séries`;
    
    return validSets
      .map(s => `${s.reps}x${s.weight > 0 ? s.weight + 'kg' : ''}`)
      .join(', ');
  };

  return (
    <Card className="bg-background border-border">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-accent">{index + 1}.</span>
              <h4 className="font-medium text-foreground truncate">{exercise.name}</h4>
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {exercise.sets.length} {exercise.sets.length === 1 ? 'série' : 'séries'}: {formatSets()}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(index)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(index)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

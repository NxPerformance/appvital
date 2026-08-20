import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllProfiles, useInsertBioimpedance } from '@/hooks/useAdmin';
import { parseLocaleInteger, parseLocaleNumber } from '@/lib/inputValidation';
import { toast } from '@/hooks/use-toast';

interface FormData {
  user_id: string;
  date: string;
  weight_kg: string;
  body_fat_percent: string;
  muscle_percent: string;
  water_percent: string;
  visceral_fat: string;
  subcutaneous_fat_percent: string;
  fat_free_mass_kg: string;
  protein_percent: string;
  bone_mass_kg: string;
  muscle_mass_kg: string;
  bmi: string;
  fat_weight_kg: string;
  waist_hip_ratio: string;
  bmr_kcal: string;
  ideal_weight_kg: string;
  weight_control_tip: string;
  fat_control_tip: string;
  muscle_control_tip: string;
  daily_calories: string;
  waist_cm: string;
  hip_cm: string;
  arm_cm: string;
  thigh_cm: string;
  shoulder_imbalance_cm: string;
  spine_curvature_cm: string;
  head_tilt_degrees: string;
  trunk_curvature_degrees: string;
  pelvis_tilt_degrees: string;
  head_forward_degrees: string;
  notes: string;
}

const initialFormData: FormData = {
  user_id: '',
  date: new Date().toISOString().split('T')[0],
  weight_kg: '',
  body_fat_percent: '',
  muscle_percent: '',
  water_percent: '',
  visceral_fat: '',
  subcutaneous_fat_percent: '',
  fat_free_mass_kg: '',
  protein_percent: '',
  bone_mass_kg: '',
  muscle_mass_kg: '',
  bmi: '',
  fat_weight_kg: '',
  waist_hip_ratio: '',
  bmr_kcal: '',
  ideal_weight_kg: '',
  weight_control_tip: '',
  fat_control_tip: '',
  muscle_control_tip: '',
  daily_calories: '',
  waist_cm: '',
  hip_cm: '',
  arm_cm: '',
  thigh_cm: '',
  shoulder_imbalance_cm: '',
  spine_curvature_cm: '',
  head_tilt_degrees: '',
  trunk_curvature_degrees: '',
  pelvis_tilt_degrees: '',
  head_forward_degrees: '',
  notes: '',
};

export default function AdminBioimpedance() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { data: profiles, isLoading: profilesLoading } = useAllProfiles();
  const insertMutation = useInsertBioimpedance();

  const [formData, setFormData] = useState<FormData>(initialFormData);

  useEffect(() => {
    if (userId) {
      setFormData((prev) => ({ ...prev, user_id: userId }));
    }
  }, [userId]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.user_id) {
      toast({ title: 'Erro', description: 'Selecione um usuário', variant: 'destructive' });
      return;
    }

    const record = {
      user_id: formData.user_id,
      date: formData.date,
      weight_kg: parseLocaleNumber(formData.weight_kg),
      body_fat_percent: parseLocaleNumber(formData.body_fat_percent),
      muscle_percent: parseLocaleNumber(formData.muscle_percent),
      water_percent: parseLocaleNumber(formData.water_percent),
      visceral_fat: parseLocaleNumber(formData.visceral_fat),
      subcutaneous_fat_percent: parseLocaleNumber(formData.subcutaneous_fat_percent),
      fat_free_mass_kg: parseLocaleNumber(formData.fat_free_mass_kg),
      protein_percent: parseLocaleNumber(formData.protein_percent),
      bone_mass_kg: parseLocaleNumber(formData.bone_mass_kg),
      muscle_mass_kg: parseLocaleNumber(formData.muscle_mass_kg),
      bmi: parseLocaleNumber(formData.bmi),
      fat_weight_kg: parseLocaleNumber(formData.fat_weight_kg),
      waist_hip_ratio: parseLocaleNumber(formData.waist_hip_ratio),
      bmr_kcal: parseLocaleInteger(formData.bmr_kcal),
      ideal_weight_kg: parseLocaleNumber(formData.ideal_weight_kg),
      weight_control_tip: parseLocaleNumber(formData.weight_control_tip),
      fat_control_tip: parseLocaleNumber(formData.fat_control_tip),
      muscle_control_tip: parseLocaleNumber(formData.muscle_control_tip),
      daily_calories: parseLocaleInteger(formData.daily_calories),
      waist_cm: parseLocaleNumber(formData.waist_cm),
      hip_cm: parseLocaleNumber(formData.hip_cm),
      arm_cm: parseLocaleNumber(formData.arm_cm),
      thigh_cm: parseLocaleNumber(formData.thigh_cm),
      shoulder_imbalance_cm: parseLocaleNumber(formData.shoulder_imbalance_cm),
      spine_curvature_cm: parseLocaleNumber(formData.spine_curvature_cm),
      head_tilt_degrees: parseLocaleNumber(formData.head_tilt_degrees),
      trunk_curvature_degrees: parseLocaleNumber(formData.trunk_curvature_degrees),
      pelvis_tilt_degrees: parseLocaleNumber(formData.pelvis_tilt_degrees),
      head_forward_degrees: parseLocaleNumber(formData.head_forward_degrees),
      notes: formData.notes || null,
    };

    try {
      await insertMutation.mutateAsync(record);
      toast({ title: 'Sucesso', description: 'Exame salvo com sucesso!' });
      navigate('/admin/users');
    } catch (error) {
      console.error('Error inserting bioimpedance:', error);
      toast({ title: 'Erro', description: 'Falha ao salvar exame', variant: 'destructive' });
    }
  };

  const selectedUser = profiles?.find((p) => p.id === formData.user_id);

  return (
    <form onSubmit={handleSubmit} className="p-4 pb-24 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/users">
          <Button type="button" variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Nova Bioimpedância</h1>
      </div>

      {/* User Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Usuário e Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Select
              value={formData.user_id}
              onValueChange={(v) => handleChange('user_id', v)}
              disabled={!!userId}
            >
              <SelectTrigger>
                <SelectValue placeholder={profilesLoading ? 'Carregando...' : 'Selecione um usuário'} />
              </SelectTrigger>
              <SelectContent>
                {profiles?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name} ({p.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedUser && (
              <p className="text-sm text-muted-foreground">
                {selectedUser.full_name} - {selectedUser.email}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Data do Exame</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Body Composition */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Composição Corporal</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Peso (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.weight_kg}
              onChange={(e) => handleChange('weight_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Gordura Corporal (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.body_fat_percent}
              onChange={(e) => handleChange('body_fat_percent', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Massa Muscular (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.muscle_percent}
              onChange={(e) => handleChange('muscle_percent', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Água Corporal (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.water_percent}
              onChange={(e) => handleChange('water_percent', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Gordura Visceral</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.visceral_fat}
              onChange={(e) => handleChange('visceral_fat', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Gordura Subcutânea (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.subcutaneous_fat_percent}
              onChange={(e) => handleChange('subcutaneous_fat_percent', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Massa Livre de Gordura (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.fat_free_mass_kg}
              onChange={(e) => handleChange('fat_free_mass_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Proteína (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.protein_percent}
              onChange={(e) => handleChange('protein_percent', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Massa Óssea (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.bone_mass_kg}
              onChange={(e) => handleChange('bone_mass_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Peso Muscular (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.muscle_mass_kg}
              onChange={(e) => handleChange('muscle_mass_kg', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Obesity Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análise de Obesidade</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>IMC</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.bmi}
              onChange={(e) => handleChange('bmi', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Peso da Gordura (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.fat_weight_kg}
              onChange={(e) => handleChange('fat_weight_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Relação Cintura-Quadril</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.waist_hip_ratio}
              onChange={(e) => handleChange('waist_hip_ratio', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>TMB (kcal)</Label>
            <Input
              type="number"
              value={formData.bmr_kcal}
              onChange={(e) => handleChange('bmr_kcal', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recomendações</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Peso Ideal (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.ideal_weight_kg}
              onChange={(e) => handleChange('ideal_weight_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Controle de Peso (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.weight_control_tip}
              onChange={(e) => handleChange('weight_control_tip', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Controle de Gordura (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.fat_control_tip}
              onChange={(e) => handleChange('fat_control_tip', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Ganho de Massa (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.muscle_control_tip}
              onChange={(e) => handleChange('muscle_control_tip', e.target.value)}
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label>Calorias Diárias</Label>
            <Input
              type="number"
              value={formData.daily_calories}
              onChange={(e) => handleChange('daily_calories', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Body Measurements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Medidas Corporais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cintura (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.waist_cm}
              onChange={(e) => handleChange('waist_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Quadril (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.hip_cm}
              onChange={(e) => handleChange('hip_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Braço (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.arm_cm}
              onChange={(e) => handleChange('arm_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Coxa (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.thigh_cm}
              onChange={(e) => handleChange('thigh_cm', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Postural Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Avaliação Postural</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Desnível Ombros (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.shoulder_imbalance_cm}
              onChange={(e) => handleChange('shoulder_imbalance_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Curvatura Coluna (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.spine_curvature_cm}
              onChange={(e) => handleChange('spine_curvature_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Inclinação Cabeça (°)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.head_tilt_degrees}
              onChange={(e) => handleChange('head_tilt_degrees', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Curvatura Tronco (°)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.trunk_curvature_degrees}
              onChange={(e) => handleChange('trunk_curvature_degrees', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Inclinação Pelve (°)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.pelvis_tilt_degrees}
              onChange={(e) => handleChange('pelvis_tilt_degrees', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Projeção Cabeça (°)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.head_forward_degrees}
              onChange={(e) => handleChange('head_forward_degrees', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Observações adicionais..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full"
        disabled={insertMutation.isPending}
      >
        {insertMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        Salvar Exame
      </Button>
    </form>
  );
}

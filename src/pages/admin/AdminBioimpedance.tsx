import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, Search, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllProfiles, useInsertBioimpedance, useAnovatorLookup } from '@/hooks/useAdmin';
import { parseLocaleInteger, parseLocaleNumber } from '@/lib/inputValidation';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api';

const UNAVAILABLE_FIELD_LABELS: Record<string, string> = {
  muscle_mass_kg: 'peso muscular',
  fat_weight_kg: 'peso da gordura',
  waist_cm: 'cintura',
  hip_cm: 'quadril',
  arm_cm: 'braço',
  thigh_cm: 'coxa',
  shoulder_imbalance_cm: 'desnível de ombros',
  spine_curvature_cm: 'curvatura da coluna',
  head_tilt_degrees: 'inclinação da cabeça',
  trunk_curvature_degrees: 'curvatura do tronco',
  pelvis_tilt_degrees: 'inclinação da pelve',
  head_forward_degrees: 'projeção da cabeça',
};

interface FormData {
  user_id: string;
  date: string;
  weight_kg: string;
  body_fat_percent: string;
  body_fat_standard_low: string;
  body_fat_standard_high: string;
  muscle_percent: string;
  muscle_standard_low: string;
  muscle_standard_high: string;
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
  head_length_cm: string;
  upper_body_length_cm: string;
  lower_body_length_cm: string;
  calf_length_cm: string;
  thigh_length_cm: string;
  arm_span_cm: string;
  shoulder_width_cm: string;
  shoulder_ear_distance_cm: string;
  foot_length_cm: string;
  muscle_left_arm_kg: string;
  muscle_right_arm_kg: string;
  fat_left_arm_kg: string;
  fat_right_arm_kg: string;
  muscle_trunk_kg: string;
  fat_trunk_kg: string;
  muscle_left_leg_kg: string;
  muscle_right_leg_kg: string;
  fat_left_leg_kg: string;
  fat_right_leg_kg: string;
  aerobic_calories_kcal: string;
  endurance_calories_kcal: string;
  anaerobic_calories_kcal: string;
  shoulder_imbalance_cm: string;
  spine_curvature_cm: string;
  head_tilt_degrees: string;
  trunk_curvature_degrees: string;
  pelvis_tilt_degrees: string;
  head_forward_degrees: string;
  shoulder_risk_level: string;
  humpback_risk_level: string;
  leg_risk_type: string;
  pelvis_risk_level: string;
  spine_risk_level: string;
  head_risk_level: string;
  knee_risk_level: string;
  front_head_risk_level: string;
  body_shape_risk_level: string;
  posture_risk_level: string;
  // Foto + classificação corporal - preenchidos só via busca automática
  // (não há input manual pra isso, body_image_key/side_image_key são um
  // identificador de arquivo interno da Anovator, não algo editável à mão).
  body_image_key: string;
  side_image_key: string;
  body_shape: string;
  score: string;
  body_age: string;
  notes: string;
  anovator_exam_id: string;
}

const initialFormData: FormData = {
  user_id: '',
  date: new Date().toISOString().split('T')[0],
  weight_kg: '',
  body_fat_percent: '',
  body_fat_standard_low: '',
  body_fat_standard_high: '',
  muscle_percent: '',
  muscle_standard_low: '',
  muscle_standard_high: '',
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
  head_length_cm: '',
  upper_body_length_cm: '',
  lower_body_length_cm: '',
  calf_length_cm: '',
  thigh_length_cm: '',
  arm_span_cm: '',
  shoulder_width_cm: '',
  shoulder_ear_distance_cm: '',
  foot_length_cm: '',
  muscle_left_arm_kg: '',
  muscle_right_arm_kg: '',
  fat_left_arm_kg: '',
  fat_right_arm_kg: '',
  muscle_trunk_kg: '',
  fat_trunk_kg: '',
  muscle_left_leg_kg: '',
  muscle_right_leg_kg: '',
  fat_left_leg_kg: '',
  fat_right_leg_kg: '',
  aerobic_calories_kcal: '',
  endurance_calories_kcal: '',
  anaerobic_calories_kcal: '',
  shoulder_imbalance_cm: '',
  spine_curvature_cm: '',
  head_tilt_degrees: '',
  trunk_curvature_degrees: '',
  pelvis_tilt_degrees: '',
  head_forward_degrees: '',
  shoulder_risk_level: '',
  humpback_risk_level: '',
  leg_risk_type: '',
  pelvis_risk_level: '',
  spine_risk_level: '',
  head_risk_level: '',
  knee_risk_level: '',
  front_head_risk_level: '',
  body_shape_risk_level: '',
  posture_risk_level: '',
  body_image_key: '',
  side_image_key: '',
  body_shape: '',
  score: '',
  body_age: '',
  notes: '',
  anovator_exam_id: '',
};

export default function AdminBioimpedance() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { data: profiles, isLoading: profilesLoading } = useAllProfiles();
  const insertMutation = useInsertBioimpedance();
  const anovatorLookup = useAnovatorLookup();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [reportFile, setReportFile] = useState<File | null>(null);

  useEffect(() => {
    if (userId) {
      setFormData((prev) => ({ ...prev, user_id: userId }));
    }
  }, [userId]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAnovatorLookup = async () => {
    if (!formData.anovator_exam_id) {
      toast({ title: 'Informe o ID do exame', variant: 'destructive' });
      return;
    }

    try {
      const result = await anovatorLookup.mutateAsync(formData.anovator_exam_id);
      const filled: string[] = [];

      setFormData((prev) => {
        const next = { ...prev };
        for (const [key, value] of Object.entries(result.data)) {
          if (value === null || value === undefined) continue;
          if (key === 'date') {
            next.date = String(value);
            filled.push(key);
            continue;
          }
          if (key in next) {
            (next as Record<string, string>)[key] = String(value);
            filled.push(key);
          }
        }
        return next;
      });

      const manualLabels = result.unavailable_fields
        .map((field) => UNAVAILABLE_FIELD_LABELS[field] ?? field)
        .join(', ');

      toast({
        title: 'Dados importados da Anovator',
        description: `${filled.length} campo(s) foram preenchidos automaticamente. Medidas corporais e postura (${manualLabels}) ainda precisam ser preenchidas manualmente.`,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 501) {
        toast({
          title: 'Integração Anovator não configurada',
          description: 'Preencha os dados do exame manualmente por enquanto.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: error instanceof ApiError ? error.message : 'Falha ao buscar dados na Anovator',
          variant: 'destructive',
        });
      }
    }
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
      body_fat_standard_low: parseLocaleNumber(formData.body_fat_standard_low),
      body_fat_standard_high: parseLocaleNumber(formData.body_fat_standard_high),
      muscle_percent: parseLocaleNumber(formData.muscle_percent),
      muscle_standard_low: parseLocaleNumber(formData.muscle_standard_low),
      muscle_standard_high: parseLocaleNumber(formData.muscle_standard_high),
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
      head_length_cm: parseLocaleNumber(formData.head_length_cm),
      upper_body_length_cm: parseLocaleNumber(formData.upper_body_length_cm),
      lower_body_length_cm: parseLocaleNumber(formData.lower_body_length_cm),
      calf_length_cm: parseLocaleNumber(formData.calf_length_cm),
      thigh_length_cm: parseLocaleNumber(formData.thigh_length_cm),
      arm_span_cm: parseLocaleNumber(formData.arm_span_cm),
      shoulder_width_cm: parseLocaleNumber(formData.shoulder_width_cm),
      shoulder_ear_distance_cm: parseLocaleNumber(formData.shoulder_ear_distance_cm),
      foot_length_cm: parseLocaleNumber(formData.foot_length_cm),
      muscle_left_arm_kg: parseLocaleNumber(formData.muscle_left_arm_kg),
      muscle_right_arm_kg: parseLocaleNumber(formData.muscle_right_arm_kg),
      fat_left_arm_kg: parseLocaleNumber(formData.fat_left_arm_kg),
      fat_right_arm_kg: parseLocaleNumber(formData.fat_right_arm_kg),
      muscle_trunk_kg: parseLocaleNumber(formData.muscle_trunk_kg),
      fat_trunk_kg: parseLocaleNumber(formData.fat_trunk_kg),
      muscle_left_leg_kg: parseLocaleNumber(formData.muscle_left_leg_kg),
      muscle_right_leg_kg: parseLocaleNumber(formData.muscle_right_leg_kg),
      fat_left_leg_kg: parseLocaleNumber(formData.fat_left_leg_kg),
      fat_right_leg_kg: parseLocaleNumber(formData.fat_right_leg_kg),
      aerobic_calories_kcal: parseLocaleInteger(formData.aerobic_calories_kcal),
      endurance_calories_kcal: parseLocaleInteger(formData.endurance_calories_kcal),
      anaerobic_calories_kcal: parseLocaleInteger(formData.anaerobic_calories_kcal),
      shoulder_imbalance_cm: parseLocaleNumber(formData.shoulder_imbalance_cm),
      spine_curvature_cm: parseLocaleNumber(formData.spine_curvature_cm),
      head_tilt_degrees: parseLocaleNumber(formData.head_tilt_degrees),
      trunk_curvature_degrees: parseLocaleNumber(formData.trunk_curvature_degrees),
      pelvis_tilt_degrees: parseLocaleNumber(formData.pelvis_tilt_degrees),
      head_forward_degrees: parseLocaleNumber(formData.head_forward_degrees),
      shoulder_risk_level: parseLocaleInteger(formData.shoulder_risk_level),
      humpback_risk_level: parseLocaleInteger(formData.humpback_risk_level),
      leg_risk_type: formData.leg_risk_type || null,
      pelvis_risk_level: parseLocaleInteger(formData.pelvis_risk_level),
      spine_risk_level: parseLocaleInteger(formData.spine_risk_level),
      head_risk_level: parseLocaleInteger(formData.head_risk_level),
      knee_risk_level: parseLocaleInteger(formData.knee_risk_level),
      front_head_risk_level: parseLocaleInteger(formData.front_head_risk_level),
      body_shape_risk_level: parseLocaleInteger(formData.body_shape_risk_level),
      posture_risk_level: parseLocaleInteger(formData.posture_risk_level),
      body_image_key: formData.body_image_key || null,
      side_image_key: formData.side_image_key || null,
      body_shape: parseLocaleInteger(formData.body_shape),
      score: parseLocaleInteger(formData.score),
      body_age: parseLocaleInteger(formData.body_age),
      notes: formData.notes || null,
      anovator_exam_id: formData.anovator_exam_id || null,
    };

    try {
      await insertMutation.mutateAsync({ record, reportFile: reportFile ?? undefined });
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

      {/* Anovator Import */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Importar da Anovator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>ID do Exame</Label>
            <div className="flex gap-2">
              <Input
                placeholder="823481034738368"
                value={formData.anovator_exam_id}
                onChange={(e) => handleChange('anovator_exam_id', e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleAnovatorLookup}
                disabled={anovatorLookup.isPending}
              >
                {anovatorLookup.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Buscar dados
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Preenche automaticamente os campos de composição corporal a partir do exame da balança Anovator.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PDF Report */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Anexar laudo em PDF (opcional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
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
          <div className="space-y-2">
            <Label>Meta de Exercício Aeróbico (kcal)</Label>
            <Input
              type="number"
              value={formData.aerobic_calories_kcal}
              onChange={(e) => handleChange('aerobic_calories_kcal', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Meta de Exercício de Resistência (kcal)</Label>
            <Input
              type="number"
              value={formData.endurance_calories_kcal}
              onChange={(e) => handleChange('endurance_calories_kcal', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Meta de Exercício Anaeróbico (kcal)</Label>
            <Input
              type="number"
              value={formData.anaerobic_calories_kcal}
              onChange={(e) => handleChange('anaerobic_calories_kcal', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Segmental Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análise Segmentada</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Músculo Braço Esquerdo (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.muscle_left_arm_kg}
              onChange={(e) => handleChange('muscle_left_arm_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Músculo Braço Direito (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.muscle_right_arm_kg}
              onChange={(e) => handleChange('muscle_right_arm_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Gordura Braço Esquerdo (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.fat_left_arm_kg}
              onChange={(e) => handleChange('fat_left_arm_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Gordura Braço Direito (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.fat_right_arm_kg}
              onChange={(e) => handleChange('fat_right_arm_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Músculo Tronco (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.muscle_trunk_kg}
              onChange={(e) => handleChange('muscle_trunk_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Gordura Tronco (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.fat_trunk_kg}
              onChange={(e) => handleChange('fat_trunk_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Músculo Perna Esquerda (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.muscle_left_leg_kg}
              onChange={(e) => handleChange('muscle_left_leg_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Músculo Perna Direita (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.muscle_right_leg_kg}
              onChange={(e) => handleChange('muscle_right_leg_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Gordura Perna Esquerda (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.fat_left_leg_kg}
              onChange={(e) => handleChange('fat_left_leg_kg', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Gordura Perna Direita (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.fat_right_leg_kg}
              onChange={(e) => handleChange('fat_right_leg_kg', e.target.value)}
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
            <Label>Coxa - Circunferência (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.thigh_cm}
              onChange={(e) => handleChange('thigh_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Comprimento da Cabeça (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.head_length_cm}
              onChange={(e) => handleChange('head_length_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Comprimento do Tronco Superior (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.upper_body_length_cm}
              onChange={(e) => handleChange('upper_body_length_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Comprimento do Tronco Inferior (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.lower_body_length_cm}
              onChange={(e) => handleChange('lower_body_length_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Comprimento da Panturrilha (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.calf_length_cm}
              onChange={(e) => handleChange('calf_length_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Comprimento da Coxa (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.thigh_length_cm}
              onChange={(e) => handleChange('thigh_length_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Envergadura (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.arm_span_cm}
              onChange={(e) => handleChange('arm_span_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Largura dos Ombros (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.shoulder_width_cm}
              onChange={(e) => handleChange('shoulder_width_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Distância Ombro-Orelha (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.shoulder_ear_distance_cm}
              onChange={(e) => handleChange('shoulder_ear_distance_cm', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Comprimento do Pé (cm)</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.foot_length_cm}
              onChange={(e) => handleChange('foot_length_cm', e.target.value)}
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
          <div className="space-y-2">
            <Label>Risco de Ombro (nível 1-5)</Label>
            <Input
              type="number"
              value={formData.shoulder_risk_level}
              onChange={(e) => handleChange('shoulder_risk_level', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Risco de Cifose (nível 1-5)</Label>
            <Input
              type="number"
              value={formData.humpback_risk_level}
              onChange={(e) => handleChange('humpback_risk_level', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo/Risco de Perna (ex: O3)</Label>
            <Input
              type="text"
              placeholder="ex: O3, X2"
              value={formData.leg_risk_type}
              onChange={(e) => handleChange('leg_risk_type', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Risco de Pelve (nível 1-5)</Label>
            <Input
              type="number"
              value={formData.pelvis_risk_level}
              onChange={(e) => handleChange('pelvis_risk_level', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Risco de Escoliose (nível 1-5)</Label>
            <Input
              type="number"
              value={formData.spine_risk_level}
              onChange={(e) => handleChange('spine_risk_level', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Risco de Inclinação de Cabeça (nível 1-5)</Label>
            <Input
              type="number"
              value={formData.head_risk_level}
              onChange={(e) => handleChange('head_risk_level', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Risco de Joelho (nível 1-5)</Label>
            <Input
              type="number"
              value={formData.knee_risk_level}
              onChange={(e) => handleChange('knee_risk_level', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Risco de Cabeça Projetada (nível 1-5)</Label>
            <Input
              type="number"
              value={formData.front_head_risk_level}
              onChange={(e) => handleChange('front_head_risk_level', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Risco de Forma Corporal (nível 1-5)</Label>
            <Input
              type="number"
              value={formData.body_shape_risk_level}
              onChange={(e) => handleChange('body_shape_risk_level', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Risco Postural Geral (nível 1-5)</Label>
            <Input
              type="number"
              value={formData.posture_risk_level}
              onChange={(e) => handleChange('posture_risk_level', e.target.value)}
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

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-background/95 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3 backdrop-blur">
        <Button
          type="submit"
          className="mx-auto flex w-full max-w-2xl"
          disabled={insertMutation.isPending}
        >
          {insertMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Exame
        </Button>
      </div>
    </form>
  );
}

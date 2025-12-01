import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, CheckCircle, ShieldAlert, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

interface Question {
  id: string;
  label: string;
  description: string;
  category: "estrogen" | "progesterone" | "androgen" | "cortisol" | "safety";
}

const symptomQuestions: Question[] = [
  // Estrogen
  { id: "hot_flashes", label: "Hot Flashes", description: "Sudden feelings of warmth", category: "estrogen" },
  { id: "night_sweats", label: "Night Sweats", description: "Excessive sweating during sleep", category: "estrogen" },
  { id: "vaginal_dryness", label: "Vaginal Dryness", description: "Discomfort or dryness", category: "estrogen" },
  { id: "foggy_thinking", label: "Foggy Thinking", description: "Difficulty concentrating", category: "estrogen" },
  { id: "heart_palpitations", label: "Heart Palpitations", description: "Awareness of heartbeat", category: "estrogen" },
  // Progesterone
  { id: "insomnia", label: "Sleep Disturbances", description: "Difficulty sleeping", category: "progesterone" },
  { id: "anxiety", label: "Anxiety", description: "Feeling worried or on edge", category: "progesterone" },
  { id: "painful_breasts", label: "Breast Tenderness", description: "Painful breast tissue", category: "progesterone" },
  // Androgen
  { id: "low_libido", label: "Low Libido", description: "Decreased interest in intimacy", category: "androgen" },
  { id: "muscle_loss", label: "Muscle Loss", description: "Loss of muscle tone", category: "androgen" },
  { id: "thinning_skin", label: "Thinning Skin", description: "Skin becoming fragile", category: "androgen" },
  { id: "fatigue", label: "Fatigue", description: "Persistent tiredness", category: "androgen" },
  { id: "loss_of_zest", label: "Loss of Zest", description: "Decreased motivation", category: "androgen" },
  // Cortisol
  { id: "stress", label: "Chronic Stress", description: "Ongoing stress", category: "cortisol" },
  { id: "sugar_cravings", label: "Sugar Cravings", description: "Strong cravings", category: "cortisol" },
  { id: "morning_fatigue", label: "Morning Fatigue", description: "Tired upon waking", category: "cortisol" },
];

const safetyQuestions = [
  { id: "acne", label: "Acne", description: "Persistent breakouts" },
  { id: "facial_hair", label: "Excessive Facial Hair", description: "Unwanted hair growth" },
  { id: "oily_skin", label: "Oily Skin", description: "Excessively oily" },
];

const HIGH_RISK_CONDITIONS = [
  { id: "breastCancer", label: "Breast Cancer (Personal History)" },
  { id: "uterineCancer", label: "Uterine/Endometrial Cancer" },
  { id: "bloodClot", label: "Active Blood Clot (DVT/PE)" },
  { id: "pregnantBreastfeeding", label: "Pregnant or Breastfeeding" },
];

const severityLabels = ["None", "Mild", "Moderate", "Severe"];

const PatientIntake = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"symptoms" | "safety" | "medical">("symptoms");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [safetyAnswers, setSafetyAnswers] = useState<Record<string, boolean>>({});
  const [medicalHistory, setMedicalHistory] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = symptomQuestions[currentIndex];
  const progress = step === "symptoms" 
    ? ((currentIndex + 1) / symptomQuestions.length) * 60 
    : step === "safety" ? 70 
    : 90;

  const handleNext = () => {
    if (currentIndex < symptomQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setStep("safety");
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const calculateScores = () => {
    const scores = { estrogen: 0, progesterone: 0, androgen: 0, cortisol: 0 };
    symptomQuestions.forEach((q) => {
      scores[q.category] += answers[q.id] || 0;
    });
    return scores;
  };

  const hasAndrogenExcess = () => {
    const count = safetyQuestions.filter(q => safetyAnswers[q.id]).length;
    return count > 1;
  };

  const isHighRisk = () => {
    return HIGH_RISK_CONDITIONS.some(c => medicalHistory[c.id]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get patient record
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (patientError || !patient) throw new Error("Patient not found");

      const scores = calculateScores();
      const highRisk = isHighRisk();
      const androgenExcess = hasAndrogenExcess();

      // Save symptom log
      const { error: logError } = await supabase.from("symptom_logs").insert([{
        patient_id: patient.id,
        estrogen_score: scores.estrogen,
        progesterone_score: scores.progesterone,
        androgen_score: scores.androgen,
        cortisol_score: scores.cortisol,
        raw_answers: {
          symptoms: answers,
          safety: safetyAnswers,
          androgenExcess,
        },
      }]);

      if (logError) throw logError;

      // Update patient record
      const updateData: Record<string, any> = {
        intake_completed: true,
        onboarding_status: "intake_complete",
        medical_history: medicalHistory,
      };

      if (highRisk) {
        updateData.risk_status = "high_risk_review";
        updateData.safety_flags = HIGH_RISK_CONDITIONS
          .filter(c => medicalHistory[c.id])
          .map(c => c.label);
      }

      await supabase
        .from("patients")
        .update(updateData)
        .eq("id", patient.id);

      toast.success("Intake complete! Lauren will review your results.");
      navigate("/patient/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit intake");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-8">
        <div className="container mx-auto px-4 max-w-xl">
          {/* Progress */}
          <div className="mb-8">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {step === "symptoms" && `Question ${currentIndex + 1} of ${symptomQuestions.length}`}
              {step === "safety" && "Safety Screening"}
              {step === "medical" && "Medical History"}
            </p>
          </div>

          {/* Symptoms Step */}
          {step === "symptoms" && (
            <>
              <Card className="border-border/50 mb-8">
                <CardContent className="pt-8 pb-8">
                  <h2 className="font-cormorant text-2xl text-foreground mb-2">
                    {currentQuestion.label}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-8">
                    {currentQuestion.description}
                  </p>

                  <Slider
                    value={[answers[currentQuestion.id] ?? 0]}
                    onValueChange={(v) => setAnswers({ ...answers, [currentQuestion.id]: v[0] })}
                    max={3}
                    step={1}
                    className="w-full mb-6"
                  />
                  
                  <div className="flex justify-between text-xs">
                    {severityLabels.map((label, i) => (
                      <span 
                        key={label}
                        className={answers[currentQuestion.id] === i ? "text-primary font-semibold" : "text-muted-foreground"}
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" onClick={handlePrev} disabled={currentIndex === 0} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNext} className="flex-1">
                  {currentIndex === symptomQuestions.length - 1 ? "Continue" : "Next"}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {/* Safety Step */}
          {step === "safety" && (
            <>
              <Card className="border-border/50 mb-8">
                <CardContent className="pt-8 pb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert className="w-5 h-5 text-amber-500" />
                    <h2 className="font-cormorant text-xl text-foreground">
                      Androgen Safety Check
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">
                    Do you currently experience any of the following?
                  </p>

                  <div className="space-y-4">
                    {safetyQuestions.map((q) => (
                      <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                        <Checkbox
                          id={q.id}
                          checked={safetyAnswers[q.id] || false}
                          onCheckedChange={(c) => setSafetyAnswers({ ...safetyAnswers, [q.id]: c === true })}
                        />
                        <Label htmlFor={q.id} className="cursor-pointer">
                          <span className="font-medium">{q.label}</span>
                          <p className="text-xs text-muted-foreground">{q.description}</p>
                        </Label>
                      </div>
                    ))}
                  </div>

                  {hasAndrogenExcess() && (
                    <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                      Multiple symptoms detected. Testosterone therapy may require additional evaluation.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => { setStep("symptoms"); setCurrentIndex(symptomQuestions.length - 1); }} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setStep("medical")} className="flex-1">
                  Continue
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {/* Medical History Step */}
          {step === "medical" && (
            <>
              <Card className="border-border/50 mb-8">
                <CardContent className="pt-8 pb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <h2 className="font-cormorant text-xl text-foreground">
                      Medical History
                    </h2>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">
                    Please answer honestly. This ensures your safety.
                  </p>

                  <div className="space-y-4">
                    {HIGH_RISK_CONDITIONS.map((c) => (
                      <div 
                        key={c.id} 
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          medicalHistory[c.id] ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/20" : "border-border"
                        }`}
                      >
                        <Checkbox
                          id={c.id}
                          checked={medicalHistory[c.id] || false}
                          onCheckedChange={(checked) => setMedicalHistory({ ...medicalHistory, [c.id]: checked === true })}
                        />
                        <Label htmlFor={c.id} className="cursor-pointer font-medium">
                          {c.label}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {isHighRisk() && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg text-sm text-red-700 dark:text-red-300">
                      Your intake will be flagged for priority manual review by Lauren.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep("safety")} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Submit Intake
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientIntake;
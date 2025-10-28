import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { SITE_CONFIG } from "@/lib/siteConfig";

interface CompareQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const questions = [
  {
    id: 1,
    question: "Have you been diagnosed with Treatment-Resistant Depression (TRD)?",
    options: [
      { value: "yes", label: "Yes", weight: { spravato: 2, iv: 1 } },
      { value: "no", label: "No", weight: { spravato: 0, iv: 1 } },
      { value: "unsure", label: "Not sure", weight: { spravato: 1, iv: 1 } },
    ],
  },
  {
    id: 2,
    question: "Do you have commercial insurance or Medicare?",
    options: [
      { value: "yes", label: "Yes", weight: { spravato: 2, iv: 1 } },
      { value: "no", label: "No (self-pay)", weight: { spravato: 0, iv: 2 } },
      { value: "unsure", label: "Not sure", weight: { spravato: 1, iv: 1 } },
    ],
  },
  {
    id: 3,
    question: "How do you prefer to receive treatment?",
    options: [
      { value: "infusion", label: "IV infusion", weight: { spravato: 0, iv: 2 } },
      { value: "nasal", label: "Nasal spray", weight: { spravato: 2, iv: 0 } },
      { value: "either", label: "Either is fine", weight: { spravato: 1, iv: 1 } },
    ],
  },
  {
    id: 4,
    question: "Are you currently taking an oral antidepressant?",
    options: [
      { value: "yes", label: "Yes", weight: { spravato: 2, iv: 1 } },
      { value: "no", label: "No", weight: { spravato: 0, iv: 2 } },
      { value: "unsure", label: "Not sure", weight: { spravato: 1, iv: 1 } },
    ],
  },
];

export const CompareQuizModal = ({ isOpen, onClose }: CompareQuizModalProps) => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);

  const handleAnswer = (value: string) => {
    setAnswers({ ...answers, [currentQuestion]: value });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setShowResult(false);
  };

  const handleClose = () => {
    handleRestart();
    onClose();
  };

  const calculateResult = () => {
    let spravatoScore = 0;
    let ivScore = 0;

    Object.entries(answers).forEach(([questionIndex, answerValue]) => {
      const question = questions[parseInt(questionIndex)];
      const selectedOption = question.options.find((opt) => opt.value === answerValue);
      if (selectedOption) {
        spravatoScore += selectedOption.weight.spravato;
        ivScore += selectedOption.weight.iv;
      }
    });

    return spravatoScore > ivScore ? "spravato" : "iv";
  };

  const currentQ = questions[currentQuestion];
  const canProceed = answers[currentQuestion] !== undefined;

  if (showResult) {
    const result = calculateResult();
    const isSpravato = result === "spravato";

    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Your Recommendation</DialogTitle>
            <DialogDescription className="text-base pt-4">
              Based on your responses, {isSpravato ? "SPRAVATO®" : "IV Ketamine"} may be a good fit for you.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              This is only a general guide. A comprehensive evaluation with our physician is required 
              to determine the best treatment for your specific situation.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={handleRestart}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Restart Quiz
            </Button>
            <Button
              onClick={() => {
                navigate(isSpravato ? SITE_CONFIG.routes.spravato : SITE_CONFIG.routes.ivKetamine);
                handleClose();
              }}
              className="w-full sm:w-auto gap-2"
            >
              Learn More
              <ArrowRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Question {currentQuestion + 1} of {questions.length}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {currentQ.question}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={answers[currentQuestion] || ""}
            onValueChange={handleAnswer}
          >
            {currentQ.options.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 mb-3">
                <RadioGroupItem value={option.value} id={`${currentQ.id}-${option.value}`} />
                <Label
                  htmlFor={`${currentQ.id}-${option.value}`}
                  className="text-base cursor-pointer flex-1"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentQuestion > 0 && (
            <Button
              onClick={handleBack}
              variant="outline"
              className="w-full sm:w-auto gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed}
            className="w-full sm:w-auto gap-2"
          >
            {currentQuestion < questions.length - 1 ? "Next" : "See Results"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Brain, Pill, Stethoscope, FileText, ExternalLink } from "lucide-react";
import { ClinicalImpression, Finding, Protocol } from "@/lib/holgateLogic";
import { MedicationRecommendation } from "@/lib/medicationMapping";
import { cn } from "@/lib/utils";

interface HolgateAnalysisPanelProps {
  analysis: ClinicalImpression;
  medications: MedicationRecommendation[];
  pdfUrl?: string | null;
  onApplyToRx?: (medications: MedicationRecommendation[]) => void;
  onClose?: () => void;
}

const priorityColors = {
  high: "bg-destructive/10 border-destructive/30 text-destructive",
  medium: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
  low: "bg-muted border-border text-muted-foreground"
};

const categoryIcons = {
  hormone: "🧬",
  adrenal: "⚡",
  neurotransmitter: "🧠",
  metabolic: "🔥",
  thyroid: "🦋",
  lipid: "❤️"
};

const HolgateAnalysisPanel = ({ 
  analysis, 
  medications, 
  pdfUrl,
  onApplyToRx, 
  onClose 
}: HolgateAnalysisPanelProps) => {
  return (
    <div className="space-y-4">
      {/* Clinical Story */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            Clinical Impression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">
            {analysis.story}
          </p>
        </CardContent>
      </Card>

      {/* Key Findings */}
      {analysis.findings.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Key Findings ({analysis.findings.length})
          </h4>
          <div className="grid gap-2">
            {analysis.findings.slice(0, 5).map((finding, idx) => (
              <FindingCard key={idx} finding={finding} />
            ))}
            {analysis.findings.length > 5 && (
              <p className="text-xs text-muted-foreground text-center py-1">
                +{analysis.findings.length - 5} more findings
              </p>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Protocol Recommendations */}
      {analysis.protocols.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Stethoscope className="w-3.5 h-3.5" />
            Recommended Protocols ({analysis.protocols.length})
          </h4>
          <div className="space-y-2">
            {analysis.protocols.slice(0, 4).map((protocol, idx) => (
              <ProtocolCard key={idx} protocol={protocol} />
            ))}
          </div>
        </div>
      )}

      {/* Medication Recommendations */}
      {medications.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Pill className="w-3.5 h-3.5" />
            Rx Recommendations ({medications.length})
          </h4>
          <div className="bg-card border rounded-lg p-3 space-y-2">
            {medications.map((med, idx) => (
              <div key={idx} className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{med.name}</p>
                  <p className="text-xs text-muted-foreground">{med.strength}</p>
                  <p className="text-xs text-primary/80 mt-0.5">{med.rationale}</p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  #{med.priority}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF Link */}
      {pdfUrl && (
        <a 
          href={pdfUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-primary hover:underline"
        >
          <FileText className="w-3.5 h-3.5" />
          View Original Lab PDF
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Close
        </Button>
        {medications.length > 0 && onApplyToRx && (
          <Button 
            className="flex-1" 
            onClick={() => onApplyToRx(medications)}
          >
            <Pill className="w-4 h-4 mr-2" />
            Apply to Rx Card
          </Button>
        )}
      </div>
    </div>
  );
};

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className={cn(
      "p-2.5 rounded-lg border text-sm",
      priorityColors[finding.priority]
    )}>
      <div className="flex items-start gap-2">
        <span className="text-base">{categoryIcons[finding.category]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{finding.pattern}</span>
            <Badge 
              variant={finding.priority === 'high' ? 'destructive' : 'secondary'} 
              className="text-[10px] px-1.5"
            >
              {finding.priority}
            </Badge>
          </div>
          <p className="text-xs mt-0.5 opacity-90">{finding.description}</p>
        </div>
      </div>
    </div>
  );
}

function ProtocolCard({ protocol }: { protocol: Protocol }) {
  return (
    <div className="p-2.5 bg-secondary/50 rounded-lg border border-border">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{protocol.name}</p>
          <p className="text-xs text-primary">{protocol.dosage}</p>
          <p className="text-xs text-muted-foreground">{protocol.timing}</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Step {protocol.priority}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 italic">
        {protocol.rationale}
      </p>
    </div>
  );
}

export default HolgateAnalysisPanel;

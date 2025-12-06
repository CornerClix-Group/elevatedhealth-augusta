import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplet, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { format } from "date-fns";

interface LabResult {
  id: string;
  collection_date: string;
  lab_source: string;
  hematocrit: number | null;
  psa: number | null;
  alt: number | null;
  ast: number | null;
  a1c: number | null;
  notes: string | null;
  correlation_alert: string | null;
}

interface BloodWorkHistoryProps {
  patientId: string;
  patientName: string;
}

const BloodWorkHistory = ({ patientId, patientName }: BloodWorkHistoryProps) => {
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBloodWorkHistory();
  }, [patientId]);

  const loadBloodWorkHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("lab_results")
        .select("id, collection_date, lab_source, hematocrit, psa, alt, ast, a1c, notes, correlation_alert")
        .eq("patient_id", patientId)
        .eq("lab_source", "labcorp")
        .order("collection_date", { ascending: true });

      if (error) throw error;
      setLabResults(data || []);
    } catch (error) {
      console.error("Error loading blood work history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare chart data
  const chartData = labResults.map((result) => ({
    date: format(new Date(result.collection_date), "MMM d"),
    fullDate: result.collection_date,
    hematocrit: result.hematocrit,
    psa: result.psa,
    alt: result.alt,
    ast: result.ast,
    a1c: result.a1c,
  }));

  const getLatestValue = (key: keyof LabResult) => {
    const latest = labResults[labResults.length - 1];
    return latest ? latest[key] : null;
  };

  const getTrend = (key: keyof LabResult) => {
    if (labResults.length < 2) return null;
    const current = labResults[labResults.length - 1][key] as number | null;
    const previous = labResults[labResults.length - 2][key] as number | null;
    if (current === null || previous === null) return null;
    return current > previous ? "up" : current < previous ? "down" : "stable";
  };

  const getAlertStatus = (key: string, value: number | null) => {
    if (value === null) return null;
    switch (key) {
      case "hematocrit":
        return value > 52 ? { level: "critical", message: "Polycythemia Risk" } : null;
      case "psa":
        return value > 4.0 ? { level: "critical", message: "Prostate Risk" } : null;
      case "alt":
      case "ast":
        return value > 40 ? { level: "warning", message: "Elevated" } : null;
      case "a1c":
        if (value >= 6.5) return { level: "critical", message: "Diabetes Range" };
        if (value >= 5.7) return { level: "warning", message: "Pre-Diabetes" };
        return null;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-48 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (labResults.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Droplet className="h-5 w-5 text-destructive" />
            Blood Work History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No Labcorp blood work results on file for this patient.</p>
        </CardContent>
      </Card>
    );
  }

  const latestHematocrit = getLatestValue("hematocrit") as number | null;
  const latestPSA = getLatestValue("psa") as number | null;
  const hematocritAlert = getAlertStatus("hematocrit", latestHematocrit);
  const psaAlert = getAlertStatus("psa", latestPSA);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Droplet className="h-5 w-5 text-destructive" />
          Blood Work History
          <Badge variant="outline" className="ml-auto">
            {labResults.length} result{labResults.length !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Values Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ValueCard 
            label="Hematocrit" 
            value={latestHematocrit} 
            unit="%" 
            trend={getTrend("hematocrit")}
            alert={hematocritAlert}
          />
          <ValueCard 
            label="PSA" 
            value={latestPSA} 
            unit="ng/mL" 
            trend={getTrend("psa")}
            alert={psaAlert}
          />
          <ValueCard 
            label="ALT" 
            value={getLatestValue("alt") as number | null} 
            unit="U/L" 
            trend={getTrend("alt")}
            alert={getAlertStatus("alt", getLatestValue("alt") as number | null)}
          />
          <ValueCard 
            label="AST" 
            value={getLatestValue("ast") as number | null} 
            unit="U/L" 
            trend={getTrend("ast")}
            alert={getAlertStatus("ast", getLatestValue("ast") as number | null)}
          />
          <ValueCard 
            label="HbA1c" 
            value={getLatestValue("a1c") as number | null} 
            unit="%" 
            trend={getTrend("a1c")}
            alert={getAlertStatus("a1c", getLatestValue("a1c") as number | null)}
          />
        </div>

        {/* Hematocrit Trend Chart */}
        {chartData.some(d => d.hematocrit !== null) && (
          <div>
            <h4 className="text-sm font-medium mb-2">Hematocrit Trend</h4>
            <div className="h-48 bg-muted/30 rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[35, 60]} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`${value}%`, "Hematocrit"]}
                  />
                  <ReferenceLine y={52} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "Risk: 52%", position: "right", fontSize: 10, fill: "hsl(var(--destructive))" }} />
                  <Line 
                    type="monotone" 
                    dataKey="hematocrit" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* PSA Trend Chart */}
        {chartData.some(d => d.psa !== null) && (
          <div>
            <h4 className="text-sm font-medium mb-2">PSA Trend</h4>
            <div className="h-48 bg-muted/30 rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--background))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                    formatter={(value: number) => [`${value} ng/mL`, "PSA"]}
                  />
                  <ReferenceLine y={4} stroke="hsl(var(--destructive))" strokeDasharray="3 3" label={{ value: "Risk: 4.0", position: "right", fontSize: 10, fill: "hsl(var(--destructive))" }} />
                  <Line 
                    type="monotone" 
                    dataKey="psa" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: "#8B5CF6", strokeWidth: 2 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div>
          <h4 className="text-sm font-medium mb-2">All Results</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Date</th>
                  <th className="text-right py-2 px-2 font-medium">Hematocrit</th>
                  <th className="text-right py-2 px-2 font-medium">PSA</th>
                  <th className="text-right py-2 px-2 font-medium">ALT</th>
                  <th className="text-right py-2 px-2 font-medium">AST</th>
                  <th className="text-right py-2 px-2 font-medium">A1c</th>
                  <th className="text-left py-2 px-2 font-medium">Alerts</th>
                </tr>
              </thead>
              <tbody>
                {labResults.slice().reverse().map((result) => (
                  <tr key={result.id} className="border-b border-muted">
                    <td className="py-2 px-2">{format(new Date(result.collection_date), "MMM d, yyyy")}</td>
                    <td className={`text-right py-2 px-2 ${result.hematocrit && result.hematocrit > 52 ? "text-destructive font-medium" : ""}`}>
                      {result.hematocrit ?? "—"}
                    </td>
                    <td className={`text-right py-2 px-2 ${result.psa && result.psa > 4 ? "text-destructive font-medium" : ""}`}>
                      {result.psa ?? "—"}
                    </td>
                    <td className={`text-right py-2 px-2 ${result.alt && result.alt > 40 ? "text-yellow-600 font-medium" : ""}`}>
                      {result.alt ?? "—"}
                    </td>
                    <td className={`text-right py-2 px-2 ${result.ast && result.ast > 40 ? "text-yellow-600 font-medium" : ""}`}>
                      {result.ast ?? "—"}
                    </td>
                    <td className={`text-right py-2 px-2 ${result.a1c && result.a1c >= 6.5 ? "text-destructive font-medium" : result.a1c && result.a1c >= 5.7 ? "text-yellow-600 font-medium" : ""}`}>
                      {result.a1c ?? "—"}
                    </td>
                    <td className="py-2 px-2">
                      {result.correlation_alert && (
                        <Badge variant="destructive" className="text-xs">
                          {result.correlation_alert}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper component for value cards
const ValueCard = ({ 
  label, 
  value, 
  unit, 
  trend,
  alert
}: { 
  label: string; 
  value: number | null; 
  unit: string;
  trend: "up" | "down" | "stable" | null;
  alert: { level: string; message: string } | null;
}) => (
  <div className={`p-3 rounded-lg border ${alert?.level === "critical" ? "border-destructive bg-destructive/5" : alert?.level === "warning" ? "border-yellow-500 bg-yellow-50" : "border-border bg-muted/30"}`}>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="flex items-center gap-1 mt-1">
      <span className={`text-lg font-semibold ${alert?.level === "critical" ? "text-destructive" : alert?.level === "warning" ? "text-yellow-600" : ""}`}>
        {value !== null ? value : "—"}
      </span>
      <span className="text-xs text-muted-foreground">{value !== null ? unit : ""}</span>
      {trend === "up" && <TrendingUp className="h-3 w-3 text-destructive ml-auto" />}
      {trend === "down" && <TrendingDown className="h-3 w-3 text-green-600 ml-auto" />}
    </div>
    {alert && (
      <div className="flex items-center gap-1 mt-1">
        <AlertTriangle className={`h-3 w-3 ${alert.level === "critical" ? "text-destructive" : "text-yellow-600"}`} />
        <span className={`text-xs ${alert.level === "critical" ? "text-destructive" : "text-yellow-600"}`}>
          {alert.message}
        </span>
      </div>
    )}
  </div>
);

export default BloodWorkHistory;

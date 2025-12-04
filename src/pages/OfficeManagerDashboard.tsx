import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Loader2, User, Users, Clock, Package, Phone, Mail, 
  Calendar, CheckCircle, AlertCircle, RefreshCw, Search,
  FileText, CreditCard
} from "lucide-react";
import { Input } from "@/components/ui/input";
import AdminNavbar from "@/components/admin/AdminNavbar";

interface Patient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  onboarding_status: string | null;
  primary_program: string | null;
  created_at: string | null;
  is_archived: boolean | null;
}

interface PendingActivation {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string | null;
  base_membership: string;
  addon_tier: string;
  total_monthly: number;
  sent_at: string;
  status: string;
}

interface KitTracking {
  id: string;
  customer_email: string;
  zrt_kit_status: string;
  tracking_number: string | null;
  patient_id: string | null;
  created_at: string;
}

const OfficeManagerDashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pendingActivations, setPendingActivations] = useState<PendingActivation[]>([]);
  const [kitTrackings, setKitTrackings] = useState<KitTracking[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("patients");

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/admin/login");
        return;
      }

      // Check if user has staff or admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAccess = roles?.some(r => r.role === "admin" || r.role === "staff");
      if (!hasAccess) {
        toast.error("Access denied");
        navigate("/");
        return;
      }

      await loadData();
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/admin/login");
    }
  };

  const loadData = async () => {
    try {
      // Load all patients
      const { data: patientsData, error: patientsError } = await supabase
        .from("patients")
        .select("id, full_name, email, phone, onboarding_status, primary_program, created_at, is_archived")
        .order("created_at", { ascending: false });

      if (patientsError) throw patientsError;
      setPatients(patientsData || []);

      // Load pending activations
      const { data: activationsData, error: activationsError } = await supabase
        .from("activation_links")
        .select("*")
        .eq("status", "pending")
        .order("sent_at", { ascending: false });

      if (activationsError) throw activationsError;
      setPendingActivations(activationsData || []);

      // Load kit trackings
      const { data: kitData, error: kitError } = await supabase
        .from("hormone_mapping_payments")
        .select("id, customer_email, zrt_kit_status, tracking_number, patient_id, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (kitError) throw kitError;
      setKitTrackings(kitData || []);

    } catch (error: any) {
      console.error("Load error:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    toast.success("Data refreshed");
  };

  const getStatusBadge = (status: string | null) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending_invite: { label: "Pending Invite", variant: "outline" },
      invited: { label: "Invited", variant: "outline" },
      intake_pending: { label: "Intake Pending", variant: "secondary" },
      pending_review: { label: "Pending Review", variant: "secondary" },
      consult_scheduled: { label: "Consult Scheduled", variant: "default" },
      pending_pharmacy_order: { label: "Pharmacy Pending", variant: "secondary" },
      treatment_active: { label: "Active", variant: "default" },
      rebooking_fee_required: { label: "Rebooking Fee", variant: "destructive" },
      subscription_canceled: { label: "Canceled", variant: "destructive" },
    };

    const config = statusConfig[status || ""] || { label: status || "Unknown", variant: "outline" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getProgramBadge = (program: string | null) => {
    if (program === "ketamine") {
      return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Ketamine</Badge>;
    }
    return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Hormone/Weight</Badge>;
  };

  const getKitStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      not_ordered: { label: "Not Ordered", color: "bg-gray-100 text-gray-700" },
      ordered: { label: "Ordered", color: "bg-yellow-100 text-yellow-700" },
      shipped: { label: "Shipped", color: "bg-blue-100 text-blue-700" },
      sample_received: { label: "Sample Received", color: "bg-purple-100 text-purple-700" },
      analyzing: { label: "Analyzing", color: "bg-orange-100 text-orange-700" },
      results_ready: { label: "Results Ready", color: "bg-green-100 text-green-700" },
    };

    const config = statusConfig[status] || { label: status, color: "bg-gray-100 text-gray-700" };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const filteredPatients = patients.filter(p => 
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm)
  );

  const stats = {
    total: patients.filter(p => !p.is_archived).length,
    active: patients.filter(p => p.onboarding_status === "treatment_active" && !p.is_archived).length,
    pending: patients.filter(p => 
      ["pending_review", "intake_pending", "pending_pharmacy_order"].includes(p.onboarding_status || "") && !p.is_archived
    ).length,
    pendingActivations: pendingActivations.length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNavbar 
        title="Office Manager Dashboard" 
        subtitle="Patient Overview & Status"
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Patients</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Active Treatment</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending Action</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingActivations}</p>
                  <p className="text-xs text-muted-foreground">Awaiting Payment</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              All Patients
            </TabsTrigger>
            <TabsTrigger value="activations" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Activations ({pendingActivations.length})
            </TabsTrigger>
            <TabsTrigger value="kits" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Kit Tracking
            </TabsTrigger>
          </TabsList>

          {/* All Patients Tab */}
          <TabsContent value="patients">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Patient Directory
                  </CardTitle>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Patient</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contact</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Program</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Enrolled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            {searchTerm ? "No patients match your search" : "No patients found"}
                          </td>
                        </tr>
                      ) : (
                        filteredPatients.map((patient) => (
                          <tr 
                            key={patient.id} 
                            className={`border-b border-border/30 hover:bg-muted/30 ${patient.is_archived ? "opacity-50" : ""}`}
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <User className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium text-foreground">{patient.full_name}</p>
                                  {patient.is_archived && (
                                    <Badge variant="outline" className="text-xs">Archived</Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="space-y-1">
                                {patient.email && (
                                  <a 
                                    href={`mailto:${patient.email}`}
                                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                                  >
                                    <Mail className="w-3 h-3" />
                                    {patient.email}
                                  </a>
                                )}
                                {patient.phone && (
                                  <a 
                                    href={`tel:${patient.phone}`}
                                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                                  >
                                    <Phone className="w-3 h-3" />
                                    {patient.phone}
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              {getProgramBadge(patient.primary_program)}
                            </td>
                            <td className="py-4 px-4">
                              {getStatusBadge(patient.onboarding_status)}
                            </td>
                            <td className="py-4 px-4 text-sm text-muted-foreground">
                              {patient.created_at ? new Date(patient.created_at).toLocaleDateString() : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Activations Tab */}
          <TabsContent value="activations">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Pending Payment Activations
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Patients who received activation links but haven't completed payment
                </p>
              </CardHeader>
              <CardContent>
                {pendingActivations.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p className="text-muted-foreground">All activations complete!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Patient</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Contact</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Membership</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Monthly</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Sent</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Waiting</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingActivations.map((activation) => {
                          const sentDate = new Date(activation.sent_at);
                          const daysWaiting = Math.floor((Date.now() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <tr 
                              key={activation.id} 
                              className={`border-b border-border/30 ${daysWaiting >= 3 ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
                            >
                              <td className="py-4 px-4">
                                <p className="font-medium text-foreground">{activation.patient_name}</p>
                              </td>
                              <td className="py-4 px-4">
                                <div className="space-y-1">
                                  <a 
                                    href={`mailto:${activation.patient_email}`}
                                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                                  >
                                    <Mail className="w-3 h-3" />
                                    {activation.patient_email}
                                  </a>
                                  {activation.patient_phone && (
                                    <a 
                                      href={`tel:${activation.patient_phone}`}
                                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                                    >
                                      <Phone className="w-3 h-3" />
                                      {activation.patient_phone}
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <Badge variant="outline">{activation.base_membership}</Badge>
                                {activation.addon_tier !== "none" && (
                                  <Badge variant="secondary" className="ml-1">{activation.addon_tier}</Badge>
                                )}
                              </td>
                              <td className="py-4 px-4 font-medium">
                                ${activation.total_monthly}/mo
                              </td>
                              <td className="py-4 px-4 text-sm text-muted-foreground">
                                {sentDate.toLocaleDateString()}
                              </td>
                              <td className="py-4 px-4">
                                <Badge 
                                  variant={daysWaiting >= 3 ? "destructive" : "outline"}
                                  className={daysWaiting >= 3 ? "" : ""}
                                >
                                  {daysWaiting} day{daysWaiting !== 1 ? "s" : ""}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Kit Tracking Tab */}
          <TabsContent value="kits">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Diagnostic Kit Status
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track ZRT kit orders and sample processing status
                </p>
              </CardHeader>
              <CardContent>
                {kitTrackings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No kit orders yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Customer Email</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tracking #</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Ordered</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kitTrackings.map((kit) => (
                          <tr key={kit.id} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="py-4 px-4">
                              <a 
                                href={`mailto:${kit.customer_email}`}
                                className="text-sm text-foreground hover:text-primary"
                              >
                                {kit.customer_email}
                              </a>
                            </td>
                            <td className="py-4 px-4">
                              {getKitStatusBadge(kit.zrt_kit_status)}
                            </td>
                            <td className="py-4 px-4 text-sm text-muted-foreground">
                              {kit.tracking_number || "-"}
                            </td>
                            <td className="py-4 px-4 text-sm text-muted-foreground">
                              {new Date(kit.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default OfficeManagerDashboard;

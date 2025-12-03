import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Loader2, UserPlus, Mail, Phone, User, RefreshCw, 
  Trash2, Archive, ArchiveRestore, MoreVertical 
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Patient {
  id: string;
  full_name: string;
  onboarding_status: string;
  risk_status: string;
  created_at: string;
  user_id: string | null;
  is_archived: boolean;
}

const PatientManagement = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [inviteData, setInviteData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load patients");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .insert([{
          full_name: inviteData.name,
          onboarding_status: "onboarding",
          risk_status: "standard",
          invited_at: new Date().toISOString(),
          invited_by: user?.id,
          is_archived: false,
        }])
        .select()
        .single();

      if (patientError) throw patientError;

      const { error: inviteError } = await supabase.functions.invoke("send-patient-invite", {
        body: {
          email: inviteData.email,
          name: inviteData.name,
          patientId: patient.id,
        },
      });

      if (inviteError) throw inviteError;

      toast.success(`Invite sent to ${inviteData.email}!`);
      setInviteData({ name: "", email: "", phone: "" });
      setShowInviteForm(false);
      loadPatients();
    } catch (error: any) {
      toast.error(error.message || "Failed to send invite");
    } finally {
      setIsInviting(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!patientToDelete) return;

    try {
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientToDelete.id);

      if (error) throw error;

      toast.success(`${patientToDelete.full_name} has been permanently deleted`);
      setPatients(patients.filter(p => p.id !== patientToDelete.id));
    } catch (error: any) {
      toast.error(error.message || "Failed to delete patient");
    } finally {
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
    }
  };

  const handleArchivePatient = async (patient: Patient) => {
    try {
      const newArchiveStatus = !patient.is_archived;
      const { error } = await supabase
        .from("patients")
        .update({ is_archived: newArchiveStatus })
        .eq("id", patient.id);

      if (error) throw error;

      toast.success(
        newArchiveStatus 
          ? `${patient.full_name} has been archived` 
          : `${patient.full_name} has been reactivated`
      );
      
      setPatients(patients.map(p => 
        p.id === patient.id ? { ...p, is_archived: newArchiveStatus } : p
      ));
    } catch (error: any) {
      toast.error(error.message || "Failed to update patient");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_invite":
        return <Badge variant="outline">Pending Invite</Badge>;
      case "onboarding":
        return <Badge className="bg-blue-500">Onboarding</Badge>;
      case "intake_complete":
        return <Badge className="bg-purple-500">Intake Complete</Badge>;
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRiskBadge = (status: string) => {
    if (status === "high_risk_review") {
      return <Badge variant="destructive">High Risk</Badge>;
    }
    return null;
  };

  const filteredPatients = showArchived 
    ? patients 
    : patients.filter(p => !p.is_archived);

  const activeCount = patients.filter(p => !p.is_archived).length;
  const archivedCount = patients.filter(p => p.is_archived).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="font-cormorant text-2xl text-foreground">Patient Management</h2>
          <p className="text-sm text-muted-foreground">
            {activeCount} active · {archivedCount} archived
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="text-sm cursor-pointer">
              Show Archived
            </Label>
          </div>
          <Button variant="outline" size="sm" onClick={loadPatients}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowInviteForm(!showInviteForm)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Patient
          </Button>
        </div>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg font-cormorant">Invite New Patient</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="invite-name"
                      placeholder="Jane Doe"
                      value={inviteData.name}
                      onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="jane@example.com"
                      value={inviteData.email}
                      onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-phone">Phone (Optional)</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="invite-phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={inviteData.phone}
                      onChange={(e) => setInviteData({ ...inviteData, phone: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  Send Invite
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Patient List */}
      <Card className="border-border/50">
        <CardContent className="pt-6">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>
                {showArchived 
                  ? "No patients found." 
                  : "No active patients. Invite your first patient to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className={`flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-secondary/30 transition-colors ${
                    patient.is_archived ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      patient.is_archived ? "bg-muted" : "bg-primary/10"
                    }`}>
                      <User className={`w-5 h-5 ${patient.is_archived ? "text-muted-foreground" : "text-primary"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{patient.full_name}</p>
                        {patient.is_archived && (
                          <Badge variant="secondary" className="text-xs">Archived</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(patient.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRiskBadge(patient.risk_status)}
                    {getStatusBadge(patient.onboarding_status)}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleArchivePatient(patient)}>
                          {patient.is_archived ? (
                            <>
                              <ArchiveRestore className="mr-2 h-4 w-4" />
                              Reactivate
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            setPatientToDelete(patient);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Permanently
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Patient Permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{patientToDelete?.full_name}</strong> and all their 
              associated data (symptom logs, lab results, orders, etc.). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePatient}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PatientManagement;
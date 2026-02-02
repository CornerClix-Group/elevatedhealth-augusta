import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileText, Plus, Lock, Clock, User, ChevronDown, ChevronUp } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ClinicalNote {
  id: string;
  patient_id: string;
  provider_id: string | null;
  note_type: string;
  content: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

interface PatientNotesCardProps {
  patientId: string;
  providerName?: string;
}

const PatientNotesCard = ({ patientId, providerName = "Provider" }: PatientNotesCardProps) => {
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  
  // New note form state
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("general");
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadNotes();
    }
  }, [patientId]);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("clinical_notes")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error loading notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNote = async () => {
    if (!newContent.trim()) {
      toast.error("Please enter note content");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("clinical_notes")
        .insert({
          patient_id: patientId,
          provider_id: user?.id,
          note_type: newType,
          content: newContent.trim(),
          is_private: isPrivate,
        });

      if (error) throw error;
      
      toast.success("Note saved");
      setNewContent("");
      setNewType("general");
      setIsPrivate(false);
      setIsAdding(false);
      loadNotes();
    } catch (error: any) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const getNoteTypeBadge = (type: string) => {
    const types: Record<string, { label: string; className: string }> = {
      general: { label: "General", className: "bg-gray-100 text-gray-700" },
      clinical: { label: "Clinical", className: "bg-blue-100 text-blue-700" },
      phone_call: { label: "Phone Call", className: "bg-purple-100 text-purple-700" },
      follow_up: { label: "Follow-Up", className: "bg-green-100 text-green-700" },
    };
    return types[type] || types.general;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Clinical Notes
            {notes.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {notes.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!isAdding && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAdding(true)}
                className="h-7 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Note
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-2">
          {isAdding && (
            <div className="mb-4 p-3 rounded-lg border bg-muted/30 space-y-3">
              <div className="flex items-center gap-3">
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="clinical">Clinical</SelectItem>
                    <SelectItem value="phone_call">Phone Call</SelectItem>
                    <SelectItem value="follow_up">Follow-Up</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2">
                  <Switch
                    id="private"
                    checked={isPrivate}
                    onCheckedChange={setIsPrivate}
                  />
                  <Label htmlFor="private" className="text-xs flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Private
                  </Label>
                </div>
              </div>
              
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Enter clinical note..."
                rows={3}
                className="text-sm resize-none"
              />
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAdding(false);
                    setNewContent("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={saveNote}
                  disabled={isSaving || !newContent.trim()}
                >
                  {isSaving ? "Saving..." : "Save Note"}
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No clinical notes yet
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {notes.map(note => {
                const typeBadge = getNoteTypeBadge(note.note_type);
                return (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg border bg-background text-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={`${typeBadge.className} text-xs`}>
                        {typeBadge.label}
                      </Badge>
                      {note.is_private && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Lock className="w-3 h-3" />
                          Private
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-foreground whitespace-pre-wrap">{note.content}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      {providerName} • {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default PatientNotesCard;

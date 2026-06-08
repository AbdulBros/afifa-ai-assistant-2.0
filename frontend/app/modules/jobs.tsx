// Job Assistant: track applications + AI resume analysis + cover letter.

import { useFocusEffect } from "expo-router";
import { Trash2, FileText, Sparkles } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ChipRow } from "@/src/components/ChipRow";
import { GlassCard } from "@/src/components/GlassCard";
import { NeonButton } from "@/src/components/NeonButton";
import { NeonInput } from "@/src/components/NeonInput";
import { Screen } from "@/src/components/Screen";
import { useToast } from "@/src/components/Toast";
import { Jobs } from "@/src/lib/api";
import { useTheme } from "@/src/theme/ThemeContext";

type App = {
  application_id: string;
  company: string;
  role: string;
  status: string;
  url?: string;
};

const TABS = [
  { id: "list", label: "Applications" },
  { id: "analyze", label: "Resume Match" },
  { id: "cover", label: "Cover Letter" },
];

const STATUSES = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
];

export default function JobAssistant() {
  const { tokens } = useTheme();
  const toast = useToast();
  const [tab, setTab] = useState("list");
  const [apps, setApps] = useState<App[]>([]);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("applied");
  const [busy, setBusy] = useState(false);

  // Analyze
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [cover, setCover] = useState("");

  const load = useCallback(async () => {
    try {
      const r: any = await Jobs.list();
      setApps(r.applications);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    if (!company.trim() || !role.trim()) {
      toast.show("Add company and role", "error");
      return;
    }
    setBusy(true);
    try {
      const r: any = await Jobs.create({ company, role, status });
      setApps((prev) => [r.application, ...prev]);
      setCompany(""); setRole("");
      toast.show("Saved", "success");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    } finally { setBusy(false); }
  };

  const remove = async (jid: string) => {
    await Jobs.delete(jid);
    setApps((prev) => prev.filter((a) => a.application_id !== jid));
  };

  const analyze = async () => {
    if (!resume.trim() || !jd.trim()) {
      toast.show("Paste resume and job description", "error");
      return;
    }
    setBusy(true);
    setAnalysis("");
    try {
      const r: any = await Jobs.analyze(resume, jd);
      setAnalysis(r.analysis);
    } catch (e: any) {
      toast.show(e?.message ?? "Failed", "error");
    } finally { setBusy(false); }
  };

  const genCover = async () => {
    if (!resume.trim() || !jd.trim()) {
      toast.show("Paste resume and job description first", "error");
      return;
    }
    setBusy(true);
    setCover("");
    try {
      const r: any = await Jobs.cover(resume, jd);
      setCover(r.cover_letter);
    } catch (e: any) {
      toast.show(e?.message ?? "Failed", "error");
    } finally { setBusy(false); }
  };

  return (
    <Screen title="Job Assistant" back testID="jobs-screen">
      <View style={{ marginHorizontal: -20 }}>
        <ChipRow items={TABS} value={tab} onChange={setTab} testID="jobs-tabs" />
      </View>

      {tab === "list" && (
        <View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <NeonInput label="Company" value={company} onChangeText={setCompany} testID="job-company" />
            </View>
            <View style={{ flex: 1 }}>
              <NeonInput label="Role" value={role} onChangeText={setRole} testID="job-role" />
            </View>
          </View>
          <View style={{ marginHorizontal: -20 }}>
            <ChipRow items={STATUSES} value={status} onChange={setStatus} testID="job-status" />
          </View>
          <NeonButton label="Add application" onPress={create} loading={busy} testID="job-add" />

          <Text style={[styles.sec, { color: tokens.textDim }]}>YOUR APPLICATIONS</Text>
          {apps.length === 0 ? (
            <Text style={{ color: tokens.textMuted, fontSize: 13 }}>None yet.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {apps.map((a) => (
                <GlassCard key={a.application_id} testID={`job-${a.application_id}`}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lbl, { color: tokens.text }]}>{a.company}</Text>
                      <Text style={[styles.sub, { color: tokens.textDim }]}>{a.role}</Text>
                      <Text style={[styles.tag, { color: tokens.primary }]}>{a.status.toUpperCase()}</Text>
                    </View>
                    <Pressable onPress={() => remove(a.application_id)} testID={`job-delete-${a.application_id}`}>
                      <Trash2 size={16} color={tokens.textMuted} />
                    </Pressable>
                  </View>
                </GlassCard>
              ))}
            </View>
          )}
        </View>
      )}

      {tab === "analyze" && (
        <View>
          <NeonInput label="Your résumé" value={resume} onChangeText={setResume} multiline placeholder="Paste your résumé text here…" testID="resume-input" />
          <NeonInput label="Job description" value={jd} onChangeText={setJd} multiline placeholder="Paste the JD here…" testID="jd-input" />
          <NeonButton label="Analyze match" onPress={analyze} loading={busy} icon={<Sparkles size={16} color="#000" />} testID="analyze-run" />
          {analysis ? (
            <GlassCard style={{ marginTop: 16 }}>
              <Text style={{ color: tokens.text, fontSize: 14, lineHeight: 20 }} selectable testID="analysis-output">
                {analysis}
              </Text>
            </GlassCard>
          ) : null}
        </View>
      )}

      {tab === "cover" && (
        <View>
          <NeonInput label="Your résumé" value={resume} onChangeText={setResume} multiline testID="cover-resume" />
          <NeonInput label="Job description" value={jd} onChangeText={setJd} multiline testID="cover-jd" />
          <NeonButton label="Generate cover letter" onPress={genCover} loading={busy} icon={<FileText size={16} color="#000" />} testID="cover-generate" />
          {cover ? (
            <GlassCard style={{ marginTop: 16 }}>
              <Text style={{ color: tokens.text, fontSize: 14, lineHeight: 20 }} selectable testID="cover-output">
                {cover}
              </Text>
            </GlassCard>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sec: { fontSize: 11, fontWeight: "700", letterSpacing: 1.4, marginTop: 16, marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  lbl: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 13, marginTop: 2 },
  tag: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginTop: 6 },
});

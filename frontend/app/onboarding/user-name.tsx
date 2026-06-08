import { useRouter } from "expo-router";
import { useState } from "react";

import { useAuth } from "@/src/auth/AuthContext";
import { NeonInput } from "@/src/components/NeonInput";
import { OnboardingShell } from "@/src/components/OnboardingShell";
import { useToast } from "@/src/components/Toast";
import { Profile } from "@/src/lib/api";

export default function UserName() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(profile?.user_name ?? "");
  const [busy, setBusy] = useState(false);

  const next = async () => {
    if (!name.trim()) {
      toast.show("Please enter your name", "error");
      return;
    }
    setBusy(true);
    try {
      await Profile.update({ user_name: name.trim() });
      await refreshProfile();
      router.push("/onboarding/ai-name");
    } catch (e: any) {
      toast.show(e?.message ?? "Save failed", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <OnboardingShell
      step={2}
      title="What should I call you?"
      subtitle="This is how I'll greet you. You can change it any time."
      primary={{ label: "Continue", onPress: next, loading: busy, disabled: !name.trim() }}
      testID="onboarding-user-name"
    >
      <NeonInput
        label="Your name"
        placeholder="e.g. Alex"
        value={name}
        onChangeText={setName}
        autoFocus
        autoCapitalize="words"
        returnKeyType="next"
        testID="onboarding-user-name-input"
      />
    </OnboardingShell>
  );
}

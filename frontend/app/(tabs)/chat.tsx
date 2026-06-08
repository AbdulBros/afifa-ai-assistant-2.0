import { useFocusEffect, useRouter } from "expo-router";
import { ChevronDown, Send, MessageSquarePlus, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/src/auth/AuthContext";
import { GlassCard } from "@/src/components/GlassCard";
import { useToast } from "@/src/components/Toast";
import { Chat } from "@/src/lib/api";
import { MODELS } from "@/src/lib/catalog";
import { useTheme } from "@/src/theme/ThemeContext";

type Msg = {
  message_id: string;
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  created_at: string;
};

type Conv = {
  conversation_id: string;
  title: string;
  provider: string;
  model: string;
  last_message?: string;
};

export default function ChatTab() {
  const { tokens } = useTheme();
  const { profile } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);

  const loadConversations = useCallback(async () => {
    try {
      const r: any = await Chat.list();
      setConversations(r.conversations);
      if (!activeId && r.conversations.length) {
        setActiveId(r.conversations[0].conversation_id);
      }
    } catch (e: any) {
      // ignore — handled by toast on send
    }
  }, [activeId]);

  const loadMessages = useCallback(async (cid: string) => {
    try {
      const r: any = await Chat.getMessages(cid);
      setMessages(r.messages);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 30);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  useEffect(() => {
    if (activeId) loadMessages(activeId);
  }, [activeId, loadMessages]);

  const newChat = async () => {
    try {
      const r: any = await Chat.create({
        provider: profile?.model_provider ?? "openai",
        model: profile?.model_name ?? "gpt-5.4",
      });
      const c = r.conversation;
      setConversations((prev) => [c, ...prev]);
      setActiveId(c.conversation_id);
      setMessages([]);
      setSidebarOpen(false);
    } catch (e: any) {
      toast.show(e?.message ?? "Could not create chat", "error");
    }
  };

  const deleteChat = async (cid: string) => {
    try {
      await Chat.delete(cid);
      setConversations((prev) => prev.filter((c) => c.conversation_id !== cid));
      if (activeId === cid) {
        setActiveId(null);
        setMessages([]);
      }
    } catch {}
  };

  const send = async () => {
    const value = text.trim();
    if (!value || busy) return;
    let cid = activeId;
    if (!cid) {
      try {
        const r: any = await Chat.create({});
        cid = r.conversation.conversation_id;
        setActiveId(cid);
        setConversations((prev) => [r.conversation, ...prev]);
      } catch (e: any) {
        toast.show(e?.message ?? "Could not start chat", "error");
        return;
      }
    }
    const optimistic: Msg = {
      message_id: `tmp_${Date.now()}`,
      role: "user",
      content: value,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setText("");
    setBusy(true);
    try {
      const r: any = await Chat.send(
        cid!,
        value,
        profile?.model_provider,
        profile?.model_name,
      );
      setMessages((prev) =>
        prev
          .filter((m) => m.message_id !== optimistic.message_id)
          .concat([r.user_message, r.assistant_message]),
      );
      loadConversations();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 30);
    } catch (e: any) {
      toast.show(e?.message ?? "Send failed", "error");
      setMessages((prev) => prev.filter((m) => m.message_id !== optimistic.message_id));
    } finally {
      setBusy(false);
    }
  };

  const activeConv = conversations.find((c) => c.conversation_id === activeId);

  return (
    <View style={[styles.wrap, { backgroundColor: tokens.bg, paddingTop: insets.top }]} testID="chat-screen">
      <View style={styles.header}>
        <Pressable
          onPress={() => setSidebarOpen((v) => !v)}
          testID="chat-toggle-sidebar"
          style={[styles.iconBtn, { borderColor: tokens.border }]}
        >
          <MessageSquarePlus size={18} color={tokens.text} />
        </Pressable>
        <Pressable
          onPress={() => setPickerOpen((v) => !v)}
          testID="chat-model-picker"
          style={[styles.modelPill, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
        >
          <Text style={[styles.modelText, { color: tokens.text }]}>
            {activeConv ? `${activeConv.provider}/${activeConv.model}` : "Pick a model"}
          </Text>
          <ChevronDown size={14} color={tokens.text} />
        </Pressable>
        <Pressable
          onPress={newChat}
          testID="chat-new"
          style={[styles.iconBtn, { borderColor: tokens.primary, backgroundColor: tokens.primary + "22" }]}
        >
          <Text style={{ color: tokens.primary, fontSize: 16, fontWeight: "800" }}>+</Text>
        </Pressable>
      </View>

      {pickerOpen && (
        <View
          style={[styles.picker, { borderColor: tokens.border, backgroundColor: tokens.surfaceHi }]}
        >
          {MODELS.map((m) => (
            <Pressable
              key={`${m.provider}-${m.model}`}
              testID={`chat-model-${m.provider}-${m.model}`}
              onPress={() => {
                if (activeId)
                  setConversations((prev) =>
                    prev.map((c) =>
                      c.conversation_id === activeId
                        ? { ...c, provider: m.provider, model: m.model }
                        : c,
                    ),
                  );
                setPickerOpen(false);
              }}
              style={styles.pickerItem}
            >
              <Text style={{ color: tokens.text, fontSize: 14, fontWeight: "600" }}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {sidebarOpen && (
        <View style={[styles.sidebar, { borderColor: tokens.border, backgroundColor: tokens.surfaceHi }]}>
          <Text style={[styles.sectionLbl, { color: tokens.textDim }]}>RECENT</Text>
          {conversations.length === 0 ? (
            <Text style={{ color: tokens.textMuted, fontSize: 13, marginTop: 8 }}>No chats yet</Text>
          ) : (
            conversations.map((c) => (
              <View key={c.conversation_id} style={styles.sidebarRow}>
                <Pressable
                  onPress={() => {
                    setActiveId(c.conversation_id);
                    setSidebarOpen(false);
                  }}
                  testID={`chat-select-${c.conversation_id}`}
                  style={{ flex: 1 }}
                >
                  <Text
                    style={{
                      color: c.conversation_id === activeId ? tokens.primary : tokens.text,
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                    numberOfLines={1}
                  >
                    {c.title}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => deleteChat(c.conversation_id)}
                  testID={`chat-delete-${c.conversation_id}`}
                >
                  <Trash2 size={14} color={tokens.textMuted} />
                </Pressable>
              </View>
            ))
          )}
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.message_id}
          renderItem={({ item }) => <Bubble msg={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 12 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: tokens.text }]}>
                Ask {profile?.ai_name || "Afifa"} anything
              </Text>
              <Text style={[styles.emptySub, { color: tokens.textDim }]}>
                Draft an email, debug code, brainstorm names, or just chat.
              </Text>
            </View>
          }
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        />

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: tokens.surfaceHi,
              borderColor: tokens.border,
              marginBottom: Math.max(insets.bottom, 12) + 64,
            },
          ]}
        >
          <TextInput
            testID="chat-input"
            value={text}
            onChangeText={setText}
            placeholder={`Message ${profile?.ai_name || "AFIFA"}…`}
            placeholderTextColor={tokens.textMuted}
            style={[styles.input, { color: tokens.text }]}
            multiline
            onSubmitEditing={send}
            blurOnSubmit={false}
          />
          <Pressable
            onPress={send}
            testID="chat-send"
            disabled={busy}
            style={[
              styles.sendBtn,
              {
                backgroundColor: text.trim() ? tokens.primary : tokens.surface,
                opacity: busy ? 0.6 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Send size={18} color={text.trim() ? "#000" : tokens.text} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const { tokens } = useTheme();
  const isUser = msg.role === "user";
  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: isUser ? "flex-end" : "flex-start" },
      ]}
    >
      {!isUser && msg.model ? (
        <View style={[styles.modelBadge, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
          <Text style={{ color: tokens.textDim, fontSize: 10, fontWeight: "700" }}>{msg.model}</Text>
        </View>
      ) : null}
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: tokens.primary + "1A", borderColor: tokens.primary + "55" }
            : { backgroundColor: tokens.surface, borderColor: tokens.border },
        ]}
      >
        <Text style={{ color: tokens.text, fontSize: 15, lineHeight: 22 }} selectable>
          {msg.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modelPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 999,
    gap: 6,
  },
  modelText: { fontSize: 12, fontWeight: "700" },
  picker: {
    position: "absolute",
    top: 64,
    left: 60,
    right: 60,
    zIndex: 50,
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
  },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 10 },
  sidebar: {
    position: "absolute",
    top: 64,
    left: 16,
    bottom: 100,
    width: 250,
    zIndex: 40,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  sectionLbl: { fontSize: 10, fontWeight: "700", letterSpacing: 1.4 },
  sidebarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 8,
  },
  empty: { alignItems: "center", padding: 32 },
  emptyTitle: { fontSize: 22, fontWeight: "700" },
  emptySub: { fontSize: 14, marginTop: 6, textAlign: "center" },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end" },
  bubble: { borderWidth: 1, borderRadius: 18, padding: 12, maxWidth: "85%" },
  modelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 6,
    marginBottom: 4,
  },
  inputBar: {
    marginHorizontal: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1,
  },
  input: { flex: 1, color: "#fff", fontSize: 15, maxHeight: 120, paddingVertical: 8 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

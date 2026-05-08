import { messages } from '@/src/data/mockData';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Message } from '@/src/data/mockData';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [inbox, setInbox] = useState<Message[]>(messages);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);
  const [reply, setReply] = useState('');

  const handleSelect = (msg: Message) => {
    setSelectedMsg(msg);
    setInbox(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
  };

  const handleSendReply = () => {
    if (!reply.trim()) return;
    setReply('');
    // In a real app, this would send via API
  };

  if (selectedMsg) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Thread header */}
          <View style={[styles.threadHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setSelectedMsg(null)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={AppColors.primary} />
            </Pressable>
            <View style={[styles.threadAvatar, { backgroundColor: AppColors.primary + '20' }]}>
              <Text style={[styles.threadAvatarText, { color: AppColors.primary }]}>
                {selectedMsg.sender_name.charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={[styles.threadName, { color: theme.text }]}>{selectedMsg.sender_name}</Text>
              <Text style={[styles.threadStatus, { color: theme.subtext }]}>Student</Text>
            </View>
          </View>

          {/* Message bubble */}
          <View style={styles.bubbleContainer}>
            <View style={[styles.bubble, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.bubbleText, { color: theme.text }]}>{selectedMsg.content}</Text>
              <Text style={[styles.bubbleTime, { color: theme.subtext }]}>{timeAgo(selectedMsg.timestamp)}</Text>
            </View>
          </View>

          {/* Reply input */}
          <View style={[styles.replyBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.replyInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
              value={reply}
              onChangeText={setReply}
              placeholder="Type a reply..."
              placeholderTextColor={theme.subtext}
              multiline
            />
            <Pressable
              style={[styles.sendBtn, !reply.trim() && styles.sendBtnDisabled]}
              onPress={handleSendReply}
              disabled={!reply.trim()}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Messages</Text>
        <View style={styles.headerRight}>
          {inbox.filter(m => !m.is_read).length > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{inbox.filter(m => !m.is_read).length}</Text>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={inbox}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.messageCard,
              { backgroundColor: theme.card, borderColor: theme.border },
              !item.is_read && styles.unreadCard,
            ]}
            onPress={() => handleSelect(item)}
          >
            <View style={[styles.msgAvatar, { backgroundColor: AppColors.primary + '20' }]}>
              <Text style={[styles.msgAvatarText, { color: AppColors.primary }]}>
                {item.sender_name.charAt(0)}
              </Text>
            </View>
            <View style={styles.msgBody}>
              <View style={styles.msgTop}>
                <Text style={[styles.senderName, { color: theme.text }, !item.is_read && styles.senderNameBold]}>
                  {item.sender_name}
                </Text>
                <Text style={[styles.msgTime, { color: theme.subtext }]}>{timeAgo(item.timestamp)}</Text>
              </View>
              <Text style={[styles.msgPreview, { color: theme.subtext }]} numberOfLines={1}>
                {item.content}
              </Text>
            </View>
            {!item.is_read && <View style={styles.dot} />}
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={48} color={theme.subtext} />
            <Text style={[styles.emptyText, { color: theme.subtext }]}>No messages</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 24, fontWeight: '800' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  unreadBadge: {
    backgroundColor: AppColors.primary, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  unreadBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  list: { padding: 16, gap: 8 },
  messageCard: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 12,
    padding: 14, borderWidth: 1, gap: 12,
  },
  unreadCard: { borderLeftWidth: 3, borderLeftColor: AppColors.primary },
  msgAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  msgAvatarText: { fontSize: 18, fontWeight: '700' },
  msgBody: { flex: 1 },
  msgTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  senderName: { fontSize: 14, color: '#11181C' },
  senderNameBold: { fontWeight: '700' },
  msgTime: { fontSize: 11 },
  msgPreview: { fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: AppColors.primary },
  threadHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  threadAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  threadAvatarText: { fontSize: 16, fontWeight: '700' },
  threadName: { fontSize: 16, fontWeight: '700' },
  threadStatus: { fontSize: 12 },
  bubbleContainer: { flex: 1, padding: 16 },
  bubble: {
    borderRadius: 14, padding: 14, borderWidth: 1,
    alignSelf: 'flex-start', maxWidth: '85%',
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTime: { fontSize: 11, marginTop: 6, textAlign: 'right' },
  replyBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, borderTopWidth: 1, gap: 10,
  },
  replyInput: {
    flex: 1, borderWidth: 1, borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, maxHeight: 100,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: AppColors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#ccc' },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});

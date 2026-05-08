import { useAuth } from '@/src/context/AuthContext';
import { AppColors, Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={[styles.heroCard, { backgroundColor: theme.card }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.full_name?.charAt(0)}</Text>
          </View>
          {editing ? (
            <TextInput
              style={[styles.nameInput, { color: theme.text, borderColor: theme.border }]}
              value={name}
              onChangeText={setName}
            />
          ) : (
            <Text style={[styles.name, { color: theme.text }]}>{user?.full_name}</Text>
          )}
          <View style={[styles.roleBadge, { backgroundColor: AppColors.primaryLight }]}>
            <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Edit toggle */}
        <View style={styles.editRow}>
          <Pressable
            style={[styles.editBtn, editing && { backgroundColor: AppColors.success }]}
            onPress={() => setEditing(e => !e)}
          >
            <Ionicons name={editing ? 'checkmark-outline' : 'pencil-outline'} size={16} color="#fff" />
            <Text style={styles.editBtnText}>{editing ? 'Save Changes' : 'Edit Profile'}</Text>
          </Pressable>
        </View>

        {/* Contact info */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Contact Information</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <FieldRow
              icon="mail-outline"
              label="Email"
              value={email}
              editing={editing}
              onChange={setEmail}
              theme={theme}
              last={false}
            />
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <FieldRow
              icon="call-outline"
              label="Phone"
              value={phone}
              editing={editing}
              onChange={setPhone}
              theme={theme}
              last={true}
            />
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.settingRow}>
              <Ionicons name="notifications-outline" size={20} color={AppColors.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Push Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: '#ddd', true: AppColors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={AppColors.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldRow({
  icon,
  label,
  value,
  editing,
  onChange,
  theme,
  last,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  theme: any;
  last: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <Ionicons name={icon} size={18} color={AppColors.primary} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.fieldLabel, { color: theme.subtext }]}>{label}</Text>
        {editing ? (
          <TextInput
            style={[styles.fieldInput, { color: theme.text, borderColor: theme.border }]}
            value={value}
            onChangeText={onChange}
          />
        ) : (
          <Text style={[styles.fieldValue, { color: theme.text }]}>{value}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroCard: {
    alignItems: 'center', padding: 32,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: AppColors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  nameInput: {
    fontSize: 20, fontWeight: '700', borderBottomWidth: 2,
    paddingBottom: 4, marginBottom: 10, textAlign: 'center', minWidth: 200,
  },
  name: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '700', color: AppColors.primary },
  editRow: { alignItems: 'center', marginTop: 16 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: AppColors.primary, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  editBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  section: { padding: 20, paddingBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  fieldLabel: { fontSize: 11, marginBottom: 2 },
  fieldValue: { fontSize: 14, fontWeight: '600' },
  fieldInput: {
    fontSize: 14, fontWeight: '600', borderBottomWidth: 1, paddingBottom: 2,
  },
  divider: { height: 1, marginLeft: 44 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
  },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, padding: 14,
    backgroundColor: AppColors.dangerLight, borderWidth: 1, borderColor: AppColors.danger + '40',
  },
  logoutText: { color: AppColors.danger, fontSize: 15, fontWeight: '700' },
});

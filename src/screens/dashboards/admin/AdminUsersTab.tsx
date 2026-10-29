import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../../../api/client';
import { AdminApi } from '../../../api/endpoints';
import { Button, Card, Chip, EmptyState, KeyValue, StatusBadge } from '../../../components/ui';
import { useAuth } from '../../../context/AuthContext';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { colors } from '../../../theme';
import type { AdminUser, Role } from '../../../types';
import { Alert } from '../../../utils/dialog';
import CreateTechnicianModal from './CreateTechnicianModal';

type Filter = '' | Role;

const FILTERS: { key: Filter; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'customer', label: 'Customers' },
  { key: 'technician', label: 'Technicians' },
  { key: 'admin', label: 'Admins' },
];

const ROLE_BADGE: Record<Role, string> = { customer: 'pending', technician: 'in_progress', admin: 'confirmed' };

/** Admin: monitor every account, add technicians, switch accounts on/off. */
export default function AdminUsersTab({ header, onChanged }: { header: React.ReactElement; onChanged: () => void }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filter, setFilter] = useState<Filter>('');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await AdminApi.users(filter || undefined));
    } catch (e) {
      if (refreshing) Alert.alert('Could not refresh', errorMessage(e));
    }
  }, [filter, refreshing]);

  useAutoRefresh(load, 30000);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const toggleActive = (u: AdminUser) => {
    const verb = u.is_active ? 'Deactivate' : 'Activate';
    Alert.alert(`${verb} account?`, `${u.full_name} (${u.email}) will ${u.is_active ? 'no longer be able to log in' : 'be able to log in again'}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: verb,
        onPress: async () => {
          try {
            await AdminApi.setUserActive(u.id, !u.is_active);
            await load();
            onChanged();
          } catch (e) {
            Alert.alert('Could not update account', errorMessage(e));
          }
        },
      },
    ]);
  };

  return (
    <>
      <FlatList
        data={users}
        keyExtractor={(u) => String(u.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View>
            {header}
            <Button title="＋ Add technician" onPress={() => setShowCreate(true)} style={{ marginBottom: 12 }} />
            <View style={styles.chips}>
              {FILTERS.map((f) => (
                <Chip key={f.key || 'all'} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={<EmptyState text="No users found." />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>{item.full_name}</Text>
              <StatusBadge value={ROLE_BADGE[item.role]} label={item.role} />
            </View>
            <KeyValue k="Email" v={item.email} />
            <KeyValue k="Phone" v={item.phone_number} />
            <KeyValue k="Joined" v={new Date(item.date_joined).toLocaleDateString()} />
            {item.role !== 'admin' && <KeyValue k={item.role === 'technician' ? 'Jobs assigned' : 'Bookings'} v={String(item.job_count)} />}
            <View style={[styles.rowBetween, { marginTop: 8 }]}>
              <StatusBadge value={item.is_active ? 'paid' : 'failed'} label={item.is_active ? 'Active' : 'Deactivated'} />
              {item.role !== 'admin' && item.id !== me?.id && (
                <Button
                  title={item.is_active ? 'Deactivate' : 'Activate'}
                  variant={item.is_active ? 'danger' : 'outline'}
                  onPress={() => toggleActive(item)}
                  style={{ minHeight: 36, paddingVertical: 8, paddingHorizontal: 14 }}
                />
              )}
            </View>
          </Card>
        )}
      />
      <CreateTechnicianModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          load();
          onChanged();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '800', color: colors.text, flexShrink: 1, marginRight: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
});

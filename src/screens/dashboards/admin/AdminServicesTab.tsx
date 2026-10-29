import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { errorMessage } from '../../../api/client';
import { AdminApi } from '../../../api/endpoints';
import { Button, Card, EmptyState, StatusBadge } from '../../../components/ui';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import { colors } from '../../../theme';
import type { Service } from '../../../types';
import { Alert } from '../../../utils/dialog';
import ServiceFormModal from './ServiceFormModal';

/** Admin: the service catalog customers book from (add, edit, hide). */
export default function AdminServicesTab({ header }: { header: React.ReactElement }) {
  const [services, setServices] = useState<Service[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setServices(await AdminApi.services());
    } catch (e) {
      if (refreshing) Alert.alert('Could not refresh', errorMessage(e));
    }
  }, [refreshing]);

  useAutoRefresh(load, 30000);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (s: Service) => {
    setEditing(s);
    setFormOpen(true);
  };

  return (
    <>
      <FlatList
        data={services}
        keyExtractor={(s) => String(s.id)}
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
            <Button title="＋ Add service" onPress={openCreate} style={{ marginBottom: 12 }} />
          </View>
        }
        ListEmptyComponent={<EmptyState text="No services yet. Add the first one." />}
        renderItem={({ item }) => (
          <Card style={item.is_active === false ? { opacity: 0.65 } : undefined}>
            <View style={styles.rowBetween}>
              <Text style={styles.title}>
                {item.icon} {item.name}
              </Text>
              <Text style={styles.price}>₹{item.base_price}</Text>
            </View>
            {!!item.description && <Text style={styles.muted}>{item.description}</Text>}
            <View style={[styles.rowBetween, { marginTop: 10 }]}>
              <View style={{ flexDirection: 'row', gap: 6, flexShrink: 1 }}>
                <StatusBadge
                  value={item.service_type === 'installation' ? 'confirmed' : 'pending'}
                  label={item.service_type === 'installation' ? 'Installation' : 'Service complaint'}
                />
                <StatusBadge value={item.is_active === false ? 'failed' : 'paid'} label={item.is_active === false ? 'Hidden' : 'Active'} />
              </View>
              <Button title="Edit" variant="outline" onPress={() => openEdit(item)} style={{ minHeight: 36, paddingVertical: 8, paddingHorizontal: 18 }} />
            </View>
          </Card>
        )}
      />
      <ServiceFormModal visible={formOpen} service={editing} onClose={() => setFormOpen(false)} onSaved={load} />
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '800', color: colors.text, flexShrink: 1, marginRight: 8 },
  price: { color: colors.success, fontWeight: '800', fontSize: 15 },
  muted: { color: colors.muted, marginTop: 4, fontSize: 13 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});

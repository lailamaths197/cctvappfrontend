import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { NotificationApi } from '../api/endpoints';
import { colors } from '../theme';
import type { AppNotification } from '../types';

/**
 * Header bell: polls /notifications/ every 15 s, shows an unread badge, and
 * opens the list (marking everything read) when tapped.
 * Self-contained on purpose - it imports nothing from ui.tsx, which imports it.
 */
export default function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await NotificationApi.list();
      setItems(data.results);
      setUnread(data.unread);
    } catch {
      /* silent: the bell must never interrupt the screen */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const openPanel = async () => {
    await load();
    setOpen(true);
    try {
      await NotificationApi.markAllRead();
      setUnread(0); // list keeps its "new" highlighting until the next poll
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <Pressable onPress={openPanel} hitSlop={8} style={styles.bell} accessibilityLabel="Notifications">
        <Text style={styles.bellIcon}>🔔</Text>
        {unread > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Notifications</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>
            <FlatList
              data={items}
              keyExtractor={(n) => String(n.id)}
              ListEmptyComponent={<Text style={styles.empty}>No notifications yet.</Text>}
              renderItem={({ item }) => (
                <View style={[styles.row, !item.is_read && styles.rowNew]}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.rowMsg}>{item.message}</Text>
                  <Text style={styles.rowTime}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bell: { marginRight: 16, padding: 2 },
  bellIcon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    width: '100%',
    maxWidth: 560,
    maxHeight: '75%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  close: { color: colors.primary, fontWeight: '700' },
  empty: { color: colors.muted, textAlign: 'center', padding: 24 },
  row: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, marginBottom: 6 },
  rowNew: { backgroundColor: '#eff6ff' },
  rowTitle: { fontWeight: '700', color: colors.text },
  rowMsg: { color: colors.text, marginTop: 2, fontSize: 13 },
  rowTime: { color: colors.muted, marginTop: 4, fontSize: 11 },
});

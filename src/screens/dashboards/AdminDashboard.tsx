import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '../../api/client';
import { AdminApi, BookingApi, PaymentApi } from '../../api/endpoints';
import BookingImages from '../../components/BookingImages';
import { Button, Card, EmptyState, KeyValue, ScreenHeader, Segmented, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { colors } from '../../theme';
import type { AdminStats, Booking, Payment, Person } from '../../types';
import { Alert } from '../../utils/dialog';
import AdminServicesTab from './admin/AdminServicesTab';
import AdminUsersTab from './admin/AdminUsersTab';

type Tab = 'assign' | 'all' | 'payments' | 'users' | 'services';

function Stat({ label, value, tint }: { label: string; value: string | number; tint?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, tint ? { color: tint } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [technicians, setTechnicians] = useState<Person[]>([]);
  const [tab, setTab] = useState<Tab>('assign');
  const [refreshing, setRefreshing] = useState(false);

  const [assigning, setAssigning] = useState<Booking | null>(null); // booking whose technician picker is open
  const [assignBusy, setAssignBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, b, p, t] = await Promise.all([AdminApi.stats(), BookingApi.list(), PaymentApi.history(), AdminApi.technicians()]);
      setStats(s);
      setBookings(b);
      setPayments(p);
      setTechnicians(t);
    } catch (e) {
      if (refreshing) Alert.alert('Could not refresh', errorMessage(e));
    }
  }, [refreshing]);

  useAutoRefresh(load, 20000);

  const unassigned = useMemo(() => bookings.filter((b) => b.status === 'pending' && !b.technician), [bookings]);

  const assign = async (tech: Person) => {
    if (!assigning) return;
    setAssignBusy(true);
    try {
      await BookingApi.assign(assigning.id, tech.id);
      setAssigning(null);
      await load();
    } catch (e: any) {
      // 409 = that technician is already booked in this date + slot
      const clash = e?.response?.status === 409;
      Alert.alert(clash ? 'Technician unavailable' : 'Assignment failed', errorMessage(e));
    } finally {
      setAssignBusy(false);
    }
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
    />
  );

  const header = (
    <View>
      {stats && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <Stat label="Bookings" value={stats.total_bookings} />
          <Stat label="Need assigning" value={stats.unassigned_pending} tint={stats.unassigned_pending ? colors.warning : undefined} />
          <Stat label="Revenue" value={`₹${stats.total_revenue}`} tint={colors.success} />
          
          {/* Real-time calculated technician field incentive pool tracker */}
          <Stat label="Tech Incentives" value={`₹${stats.total_technician_incentives ?? '0.00'}`} tint="#6366F1" />
          
          <Stat label="Paid" value={stats.paid_payments} />
          <Stat label="Unpaid" value={stats.unpaid_bookings} tint={stats.unpaid_bookings ? colors.danger : undefined} />
          <Stat label="In progress" value={stats.bookings_by_status.in_progress ?? 0} />
          <Stat label="Completed" value={stats.bookings_by_status.completed ?? 0} />
          <Stat label="Customers" value={stats.customers} />
          <Stat label="Technicians" value={stats.technicians} />
        </ScrollView>
      )}
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { key: 'assign', label: `Assign (${unassigned.length})` },
          { key: 'all', label: 'Bookings' },
          { key: 'payments', label: 'Payments' },
          { key: 'users', label: 'Users' },
          { key: 'services', label: 'Services' },
        ]}
      />
    </View>
  );

  const bookingCard = (item: Booking, withAssign: boolean) => {
    const extraCharge = parseFloat(item?.extra_service_charge || '0');

    return (
      <Card>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>
            #{item.id} · {item.service.name}
          </Text>
          <StatusBadge value={item.status} label={item.status_label} />
        </View>
        <KeyValue k="Type" v={item.service.service_type === 'installation' ? 'Installation' : 'Service complaint'} />
        <KeyValue k="When" v={`${item.date} · ${item.time_slot_label}`} />
        <KeyValue k="Customer" v={`${item.customer.full_name} (${item.customer.phone_number})`} />
        <KeyValue k="Address" v={item.address.full_address} />
        {!!item.issue_description && <KeyValue k="Details" v={item.issue_description} />}
        <KeyValue k="Technician" v={item.technician?.full_name ?? 'Unassigned'} />
        
        <BookingImages images={item.images} />
        {/* 👇 INSERT THE GLOBAL REVIEWS METRIC LOGIC PANEL HERE 👇 */}
  {item.review ? (
    <View style={styles.adminReviewCardBox}>
      <Text style={styles.adminReviewTitleHeader}>🌟 Customer Feedback Submitted</Text>
      <KeyValue k="Star Rating" v={`${item.review.rating} / 5 Stars`} />
      {!!item.review.comment && (
        <Text style={styles.adminReviewCommentText}>
          "{item.review.comment}"
        </Text>
      )}
    </View>
  ) : null}
        {/* Dynamic visibility panel parsing field up-sells */}
        {extraCharge > 0 ? (
          <View style={styles.adminExtra}>
            <Text style={styles.extraHead}>Out-of-Scope Field Upsell Logged:</Text>
            <KeyValue k="Service Item" v={item.extra_service_title || ''} />
            <KeyValue k="Extra Charge" v={`₹${item.extra_service_charge}`} />
            <KeyValue k="Commission (15%)" v={`₹${item.technician_incentive}`} />
          </View>
        ) : null}

        <View style={[styles.rowBetween, { marginTop: 8, borderTopWidth: extraCharge > 0 ? 0.5 : 0, borderColor: colors.border, paddingTop: extraCharge > 0 ? 6 : 0 }]}>
          <Text style={styles.price}>
            ₹{extraCharge > 0 ? item.total_payable_amount : item.amount}
          </Text>
          <StatusBadge value={item.is_paid ? 'paid' : 'unpaid'} />
        </View>
        {withAssign && <Button title="Assign technician" onPress={() => setAssigning(item)} style={{ marginTop: 10 }} />}
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Admin" subtitle={user?.full_name} onLogout={logout} />
      <View style={styles.body}>
        {tab === 'assign' && (
          <FlatList
            data={unassigned}
            keyExtractor={(b) => String(b.id)}
            refreshControl={refreshControl}
            ListHeaderComponent={header}
            ListEmptyComponent={<EmptyState text="All pending jobs have a technician. 🎉" />}
            renderItem={({ item }) => bookingCard(item, true)}
          />
        )}
        {tab === 'all' && (
          <FlatList
            data={bookings}
            keyExtractor={(b) => String(b.id)}
            refreshControl={refreshControl}
            ListHeaderComponent={header}
            ListEmptyComponent={<EmptyState text="No bookings yet." />}
            renderItem={({ item }) => bookingCard(item, false)}
          />
        )}
        {tab === 'payments' && (
          <FlatList
            data={payments}
            keyExtractor={(p) => String(p.id)}
            refreshControl={refreshControl}
            ListHeaderComponent={header}
            ListEmptyComponent={<EmptyState text="No transactions yet." />}
            renderItem={({ item }) => (
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.title}>{item.service_name}</Text>
                  <StatusBadge value={item.status} />
                </View>
                <KeyValue k="Receipt" v={item.receipt_no} />
                <KeyValue k="Customer" v={item.customer_name} />
                <KeyValue k="Amount" v={`copy ₹${item.amount} ${item.currency}`} />
                <KeyValue k="Booking" v={`#${item.booking_id}`} />
                <KeyValue k="Order" v={item.razorpay_order_id} />
                <KeyValue k="Date" v={new Date(item.paid_at ?? item.created_at).toLocaleString()} />
              </Card>
            )}
          />
        )}
        {tab === 'users' && <AdminUsersTab header={header} onChanged={load} />}
        {tab === 'services' && <AdminServicesTab header={header} />}
      </View>

            {/* Technician picker overlay modal sheet sheet */}
      <Modal visible={!!assigning} transparent animationType="slide" onRequestClose={() => setAssigning(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Assign booking #{assigning?.id}</Text>
            <Text style={styles.sheetSub}>
              {assigning?.date} · {assigning?.time_slot_label}
            </Text>
            <ScrollView style={{ maxHeight: 320, marginTop: 8 }} showsVerticalScrollIndicator={false}>
              {technicians.length === 0 && <EmptyState text='No technicians yet. Add one from the "Users" tab.' />}
              {technicians.map((t) => (
                <Pressable key={t.id} disabled={assignBusy} onPress={() => assign(t)} style={styles.techRow}>
                  <Text style={styles.techName}>{t.full_name}</Text>
                  <Text style={styles.techPhone}>{t.phone_number}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button title="Cancel" variant="outline" onPress={() => setAssigning(null)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: colors.primary 
  },
  body: { 
    flex: 1, 
    backgroundColor: colors.bg, 
    padding: 14 
  },
  title: { 
    fontSize: 15, 
    fontWeight: '800', 
    color: colors.text, 
    flexShrink: 1, 
    marginRight: 8 
  },
  price: { 
    color: colors.success, 
    fontWeight: '800', 
    fontSize: 15 
  },
  rowBetween: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  stat: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    marginRight: 10, 
    minWidth: 96, 
    alignItems: 'center', 
    elevation: 1 
  },
  statValue: { 
    fontSize: 20, 
    fontWeight: '800', 
    color: colors.primary 
  },
  statLabel: { 
    fontSize: 12, 
    color: colors.muted, 
    marginTop: 2 
  },
  backdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(15,23,42,0.5)', 
    justifyContent: 'flex-end', 
    alignItems: 'center' 
  },
  sheet: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    padding: 20, 
    paddingBottom: 32, 
    width: '100%', 
    maxWidth: 560 
  },
  sheetTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: colors.text 
  },
  sheetSub: { 
    color: colors.muted, 
    marginTop: 2 
  },
  techRow: { 
    paddingVertical: 14, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderColor: colors.border 
  },
  techName: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: colors.text 
  },
  techPhone: { 
    color: colors.muted, 
    marginTop: 2 
  },
  // Custom Styles Added for Ad-hoc Field Revisions
  adminExtra: { 
    backgroundColor: '#F8FAFC', 
    padding: 10, 
    borderRadius: 6, 
    marginVertical: 8, 
    borderWidth: 0.5, 
    borderColor: '#CBD5E1' 
  },
  extraHead: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: '#475569', 
    marginBottom: 4 
  }, // 🌟 Global Customer Review Analytics Styles Matrix
  adminReviewCardBox: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  adminReviewTitleHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 6,
  },
  adminReviewCommentText: {
    fontSize: 12,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 16,
  }
});

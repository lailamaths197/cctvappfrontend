import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import { FlatList, Linking, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View,TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '../../api/client';
import { BookingApi, PaymentApi } from '../../api/endpoints';
import BookingImages from '../../components/BookingImages';
import { Button, Card, EmptyState, KeyValue, ScreenHeader, Segmented, StatusBadge,FormField } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { usePayBooking } from '../../hooks/usePayBooking';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme';
import type { Booking, Payment, Service } from '../../types';
import { Alert } from '../../utils/dialog';

type Tab = 'services' | 'bookings' | 'payments';

const typeLabel = (t: Service['service_type']) => (t === 'installation' ? 'Installation' : 'Service complaint');

export default function CustomerDashboard() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();

  const [tab, setTab] = useState<Tab>('services');
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  const load = useCallback(async () => {
    try {
      const [s, b, p] = await Promise.all([BookingApi.services(), BookingApi.list(), PaymentApi.history()]);
      setServices(s);
      setBookings(b);
      setPayments(p);
    } catch (e) {
      // Polling failures are silent; only surface them on explicit pull-to-refresh.
      if (refreshing) Alert.alert('Could not refresh', errorMessage(e));
    }
  }, [refreshing]);

  // Statuses stay current: refresh on focus and every 15 s.
  useAutoRefresh(load, 15000);

  const { pay, payingId } = usePayBooking(load);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />;
  const paidPayments = payments.filter((p) => p.status === 'paid');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={`Hi, ${user?.full_name.split(' ')[0] ?? ''}`} subtitle="Customer dashboard" onLogout={logout} />
      <View style={styles.body}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'services', label: 'Services' },
            { key: 'bookings', label: `My Bookings (${bookings.length})` },
            { key: 'payments', label: `Receipts (${paidPayments.length})` },
          ]}
        />

        {tab === 'services' && (
          <FlatList
            data={services}
            keyExtractor={(s) => String(s.id)}
            refreshControl={refreshControl}
            ListEmptyComponent={<EmptyState text="No services available right now." />}
            renderItem={({ item }) => (
              <Pressable onPress={() => navigation.navigate('Booking', { serviceId: item.id })}>
                <Card>
                  <Text style={styles.icon}>{item.icon}</Text>
                  <View style={styles.rowBetween}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <StatusBadge value={item.service_type === 'installation' ? 'confirmed' : 'pending'} label={typeLabel(item.service_type)} />
                  </View>
                  <Text style={styles.muted}>{item.description}</Text>
                  <View style={styles.rowBetween}>
                    <Text style={styles.price}>₹{item.base_price}</Text>
                    <Text style={styles.link}>Book now ›</Text>
                  </View>
                </Card>
              </Pressable>
            )}
          />
        )}

                {tab === 'bookings' && (
          <FlatList
            data={bookings}
            keyExtractor={(b) => String(b.id)}
            refreshControl={refreshControl}
            ListEmptyComponent={<EmptyState text="No bookings yet. Pick a service to get started." />}
                      renderItem={({ item }) => (
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{item.service.name}</Text>
                <StatusBadge value={item.status} label={item.status_label} />
              </View>
              <KeyValue k="Booking" v={`#${item.id}`} />
              <KeyValue k="When" v={`${item.date} · ${item.time_slot_label}`} />
              <KeyValue k="Address" v={item.address.full_address} />
              <KeyValue k="Technician" v={item.technician ? `${item.technician.full_name} (${item.technician.phone_number})` : 'Not assigned yet'} />
              {!!item.issue_description && <KeyValue k="Details" v={item.issue_description} />}

              <BookingImages images={item.images} />
              {/* Insert this layout block inside your bookings card element right below the Technician KeyValue row */}
{/* Wrap your buttons in this layout view to safely size them without using 'small' or broken inline styles */}
<View style={styles.actionGridButtonContainer}>
  {item.technician ? (
    <Button
      title="📞 Secure Call"
      variant="outline"
      onPress={async () => {
        try {
          const data = await BookingApi.initiateSecureCall(item.id);
          if (data && data.proxy_number) {
            Linking.openURL(`tel:${data.proxy_number}`);
          } else {
            Alert.alert("Notice", "Secure proxy connection could not be allocated.");
          }
        } catch (err) {
          Alert.alert("Connection Refused", "Anonymization channels are temporarily offline.");
        }
      }}
    />
  ) : null}
</View>

{item.status === 'completed' && !item.review ? (
  <View style={styles.reviewPromptBox}>
    <Text style={styles.reviewPromptTitle}>🌟 Rate Your Service Experience</Text>
    <Text style={styles.muted}>Let Vetri IT Systems know how your engineering team performed.</Text>
    
    {/* Simple Star Selection Row */}
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((num) => (
        <TouchableOpacity key={num} onPress={() => setSelectedRating(num)}>
          <Text style={[styles.starText, selectedRating >= num ? styles.activeStar : styles.inactiveStar]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>

    <FormField
  label="Review Comments" // 🌟 Added required label attribute prop here
  placeholder="Write an optional review comment..."
  value={reviewBookingId === item.id ? reviewComment : ''}
  onChangeText={(txt: string) => {
    setReviewBookingId(item.id);
    setReviewComment(txt);
  }}
/>

    <Button
      title={submittingReview && reviewBookingId === item.id ? "Submitting..." : "Submit Review"}
      onPress={async () => {
        if (!selectedRating) return;
        setSubmittingReview(true);
        try {
          await BookingApi.submitReview(item.id, selectedRating, reviewComment);
          Alert.alert("Thank You", "Your feedback was logged successfully.");
          setReviewComment('');
          setReviewBookingId(null);
          load(); // Re-trigger auto-refresh layout loop
        } catch (err) {
          Alert.alert("Submission Failure", errorMessage(err));
        } finally {
          setSubmittingReview(false);
        }
      }}
      style={{ marginTop: 8 }}
    />
  </View>
) : null}
              
              {/* --- INTEGRATED AD-HOC FIELD SERVICE BANNER ALERT --- */}
              {parseFloat(item?.extra_service_charge || '0') > 0 ? (
                <View style={styles.extraWorkBanner}>
                  <Text style={styles.bannerHeader}>⚠️ Additional On-Site Work Appended</Text>
                  <KeyValue k="Extra Task" v={item?.extra_service_title || ''} />
                  <KeyValue k="Task Details" v={item?.extra_service_description || ''} />
                  <KeyValue k="Extra Cost" v={`+ ₹${item?.extra_service_charge || '0'}`} />
                </View>
              ) : null}

              <View style={[styles.rowBetween, { marginTop: 10 }]}>
                <Text style={styles.price}>
                  ₹{parseFloat(item?.extra_service_charge || '0') > 0 ? item?.total_payable_amount : item?.amount}
                </Text>
                <StatusBadge value={item.is_paid ? 'paid' : 'unpaid'} />
              </View>

              {!item.is_paid && item.status !== 'cancelled' ? (
                <Button 
                  title={parseFloat(item?.extra_service_charge || '0') > 0 ? "Pay Outstanding Balance" : "Pay now"} 
                  onPress={() => pay(item.id, item)} 
                  loading={payingId === item.id} 
                  style={{ marginTop: 10 }} 
                />
              ) : null}

              {!item.is_paid && item.status === 'in_progress' ? (
                <Text style={styles.warn}>Your technician can only finish the job after payment.</Text>
              ) : null}
            </Card>
            
          )}

          
          />
        )}


        {tab === 'payments' && (
          <FlatList
            data={payments}
            keyExtractor={(p) => String(p.id)}
            refreshControl={refreshControl}
            ListEmptyComponent={<EmptyState text="No transactions yet." />}
            renderItem={({ item }) => (
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{item.service_name}</Text>
                  <StatusBadge value={item.status} />
                </View>
                <KeyValue k="Amount" v={`₹${item.amount} ${item.currency}`} />
                <KeyValue k="Booking" v={`#${item.booking_id}`} />
                <KeyValue k="Date" v={new Date(item.paid_at ?? item.created_at).toLocaleString()} />
                {item.status === 'paid' && <Button title="View receipt" variant="outline" onPress={() => setReceipt(item)} style={{ marginTop: 10 }} />}
              </Card>
            )}
          />
        )}
      </View>

      <Pressable style={styles.fab} onPress={() => navigation.navigate('Booking')}>
        <Text style={styles.fabText}>＋ New booking</Text>
      </Pressable>

      {/* Payment receipt */}
      <Modal visible={!!receipt} transparent animationType="slide" onRequestClose={() => setReceipt(null)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <ScrollView>
              <Text style={styles.receiptHead}>Payment receipt</Text>
              <Text style={styles.receiptNo}>{receipt?.receipt_no}</Text>
              <View style={styles.divider} />
              <KeyValue k="Customer" v={receipt?.customer_name ?? ''} />
              <KeyValue k="Service" v={receipt?.service_name ?? ''} />
              <KeyValue k="Booking" v={`#${receipt?.booking_id}`} />
              <KeyValue k="Service date" v={`${receipt?.booking_date} · ${receipt?.time_slot_label}`} />
              <KeyValue k="Address" v={receipt?.address ?? ''} />
              <View style={styles.divider} />
              <KeyValue k="Amount paid" v={`₹${receipt?.amount} ${receipt?.currency}`} />
              <KeyValue k="Paid on" v={receipt?.paid_at ? new Date(receipt.paid_at).toLocaleString() : '-'} />
              <KeyValue k="Order ID" v={receipt?.razorpay_order_id ?? ''} />
              <KeyValue k="Payment ID" v={receipt?.razorpay_payment_id ?? ''} />
              <Button title="Close" onPress={() => setReceipt(null)} style={{ marginTop: 18 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // =========================================================================
  // Layout & Container Styles
  // =========================================================================
  safe: { 
    flex: 1, 
    backgroundColor: colors.primary 
  },
  body: { 
    flex: 1, 
    backgroundColor: colors.bg,
    padding: 14
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 10
  },

  // =========================================================================
  // Typography Styles
  // =========================================================================
  icon: {
    fontSize: 30
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    flexShrink: 1,
    marginRight: 8
  },
  muted: {
    color: colors.muted,
    marginTop: 4
  },
  price: {
    color: colors.success,
    fontWeight: '800',
    fontSize: 15
  },
  link: {
    color: colors.primary,
    fontWeight: '700'
  },
  warn: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8
  },

  // =========================================================================
  // Floating Action Button (FAB)
  // =========================================================================
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 999,
    elevation: 5
  },
  fabText: {
    color: '#fff',
    fontWeight: '800'
  },

  // =========================================================================
  // Bottom Sheet / Modal Styles
  // =========================================================================
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
    width: '100%',
    maxWidth: 560,
    maxHeight: '85%'
  },
  receiptHead: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary
  },
  receiptNo: {
    color: colors.muted,
    marginTop: 2
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  actionGridButton: {
    flex: 1,
    height: 38,
  },
  actionGridButtonContainer: {
    flex: 1,
    marginHorizontal: 4,
    marginTop: 8,
  },
    reviewPromptBox: {
    backgroundColor: '#f8fafc',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  reviewPromptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  starsRow: {
    flexDirection: 'row',
    marginVertical: 8,
    gap: 6,
  },
  starText: {
    fontSize: 26,
  },
  activeStar: {
    color: '#eab308', // Amber yellow star fill
  },
  inactiveStar: {
    color: '#cbd5e1', // Slate grey star fill
  },

  // =========================================================================
  // Custom Add-on On-Site Service Banner Styles
  // =========================================================================
  extraWorkBanner: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 4,
    borderColor: '#D97706',
    padding: 12,
    borderRadius: 6,
    marginVertical: 10
  },
  bannerHeader: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 4
  }
});

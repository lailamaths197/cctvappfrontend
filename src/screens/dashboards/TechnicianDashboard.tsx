import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { errorMessage } from '../../api/client';
import { BookingApi } from '../../api/endpoints';
import BookingImages from '../../components/BookingImages';
import EvidenceModal, { evidenceLabel, EvidenceStatus } from '../../components/EvidenceModal';
import AddExtraServiceModal from '../../components/AddExtraServiceModal'; // Imported new modal component
import { Button, Card, EmptyState, KeyValue, ScreenHeader, Segmented, StatusBadge } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { colors } from '../../theme';
import type { Booking } from '../../types';
import { Alert } from '../../utils/dialog';

type Tab = 'active' | 'done';

export default function TechnicianDashboard() {
  const { user, logout } = useAuth();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [tab, setTab] = useState<Tab>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [evidence, setEvidence] = useState<{ job: Booking; status: EvidenceStatus } | null>(null);
  
  // --- STATE PARAMETERS FOR ON-SITE ALTERATIONS ---
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [extraModalVisible, setExtraModalVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      setJobs(await BookingApi.list()); 
    } catch (e) {
      if (refreshing) Alert.alert('Could not refresh', errorMessage(e));
    }
  }, [refreshing]);

  useAutoRefresh(load, 20000);

  const visible = useMemo(() => {
    const list = jobs.filter((j) => (tab === 'active' ? j.status !== 'completed' && j.status !== 'cancelled' : j.status === 'completed'));
    return list.sort((a, b) => `${a.date}${a.time_slot}`.localeCompare(`${b.date}${b.time_slot}`));
  }, [jobs, tab]);

  const startJob = (job: Booking) => setEvidence({ job, status: 'in_progress' });

  const completeJob = (job: Booking) => {
    if (!job.is_paid) {
      Alert.alert('Payment pending', 'The customer has not paid yet. You can complete this job once the payment is received.');
      return;
    }
    setEvidence({ job, status: 'completed' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={`Hi, ${user?.full_name.split(' ')[0] ?? ''}`} subtitle="Technician dashboard" onLogout={logout} />
      <View style={styles.body}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { key: 'active', label: 'Active jobs' },
            { key: 'done', label: 'Completed' },
          ]}
        />
        <FlatList
          data={visible}
          keyExtractor={(j) => String(j.id)}
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
          ListEmptyComponent={<EmptyState text={tab === 'active' ? 'No jobs assigned to you right now.' : 'No completed jobs yet.'} />}
          renderItem={({ item }) => {
            const extraCharge = parseFloat(item?.extra_service_charge || '0');
            
            return (
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.title}>{item.service.name}</Text>
                  <StatusBadge value={item.status} label={item.status_label} />
                </View>

                <KeyValue k="Job" v={`#${item.id}`} />
                <KeyValue k="Type" v={item.service.service_type === 'installation' ? 'Installation' : 'Service complaint'} />
                <KeyValue k="When" v={`${item.date} · ${item.time_slot_label}`} />
                <KeyValue k="Customer" v={item.customer.full_name} />
                <KeyValue k="Phone" v={item.customer.phone_number} />
                <KeyValue k="Address" v={item.address.full_address} />
                {!!item.issue_description && <KeyValue k="Issue" v={item.issue_description} />}
                {/* 👇 INSERT THE NEW REVIEW CARD BLOCK HERE 👇 */}
    {item.review ? (
      <View style={styles.technicianReviewBox}>
        <Text style={styles.reviewLabel}>
          ⭐ Customer Rating: {item.review.rating} / 5
        </Text>
        {!!item.review.comment && (
          <Text style={styles.reviewCommentText}>
            "{item.review.comment}"
          </Text>
        )}
      </View>
    ) : null}
                {/* --- ON-SITE EXTRA SERVICE INCENTIVES CARD ROW --- */}
                {extraCharge > 0 ? (
                  <View style={styles.extraContainer}>
                    <Text style={styles.extraHead}>Out-of-Scope Field Task Logged:</Text>
                    <KeyValue k="Extra Task" v={item.extra_service_title || ''} />
                    <KeyValue k="Extra Fee" v={`+ ₹${item.extra_service_charge}`} />
                    <KeyValue k="Your Incentive (15%)" v={`₹${item.technician_incentive}`} />
                  </View>
                ) : null}

                <View style={[styles.rowBetween, { marginTop: 8 }]}>
                  <Text style={styles.muted}>Dynamic Grand Total</Text>
                  <Text style={styles.price}>
                    ₹{extraCharge > 0 ? item.total_payable_amount : item.amount}
                  </Text>
                </View>

                <View style={[styles.rowBetween, { marginTop: 4 }]}>
                  <Text style={styles.muted}>Customer payment</Text>
                  <StatusBadge value={item.is_paid ? 'paid' : 'unpaid'} />
                </View>

                <BookingImages images={item.images} />

                {item.status === 'in_progress' && !item.is_paid && (
                  <Text style={styles.warn}>Waiting for the customer to pay before this job can be completed.</Text>
                )}
                <View style={styles.actions}>
  {/* 📞 Secure Voice Proxy Integration Block */}
  <Button
    title="📞 Call Customer"
    variant="outline"
    onPress={async () => {
      try {
        // Queries the backend Twilio caller masking action token directly
        const data = await BookingApi.initiateSecureCall(item.id);
        if (data && data.proxy_number) {
          Linking.openURL(`tel:${data.proxy_number}`);
        } else {
          Alert.alert("Privacy Guard", "Masked routing proxy could not be allocated.");
        }
      } catch (err) {
        Alert.alert("Connection Error", "Anonymized network paths are busy.");
      }
    }}
    style={{ flex: 1 }}
  />

  {/* 🛰️ Interactive Map Geocoding Navigation Route Guide */}
  <Button
    title="🗺️ Navigate"
    variant="outline"
    onPress={() => {
      const addressQuery = encodeURIComponent(item.address.full_address);
      const url =   Platform.select({
        ios: `maps:0,0?q=${addressQuery}`,
        android: `geo:0,0?q=${addressQuery}`,
      });
      if (url) Linking.openURL(url);
    }}
    style={{ flex: 1 }}
  />
</View>

                <View style={styles.actions}>
                  <Button title="📞 Call" variant="outline" onPress={() => Linking.openURL(`tel:${item.customer.phone_number}`)} style={{ flex: 1 }} />
                  
                  {/* Technician Add-on Service Upsell Trigger Option Button */}
                  {item.status === 'in_progress' ? (
                    <Button 
                      title="+ Add Extra" 
                      variant="outline" 
                      onPress={() => { setSelectedBookingId(item.id); setExtraModalVisible(true); }} 
                      style={{ flex: 1, borderColor: '#4F46E5' }} 
                    />
                  ) : null}

                  {item.status === 'confirmed' && (
                    <Button title="Start job" onPress={() => startJob(item)} style={{ flex: 1 }} />
                  )}
                  {item.status === 'in_progress' && (
                    <Button
                      title="Complete job"
                      onPress={() => completeJob(item)}
                      style={{ flex: 1, backgroundColor: item.is_paid ? colors.success : colors.muted }}
                    />
                  )}
                </View>
                {item.status === 'confirmed' && <Text style={styles.hintText}>Starting needs "{evidenceLabel(item, 'in_progress')}".</Text>}
                {item.status === 'in_progress' && <Text style={styles.hintText}>Completing needs "{evidenceLabel(item, 'completed')}".</Text>}
              </Card>
            );
          }}
        />
      </View>

      <EvidenceModal
        job={evidence?.job ?? null}
        status={evidence?.status ?? null}
        onClose={() => setEvidence(null)}
        onDone={(updated) => {
          setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
          setEvidence(null);
        }}
      />

      {/* --- ADD-ON ON-SITE Dynamic Work OVERLAY MODAL MANAGER --- */}
      {selectedBookingId !== null ? (
        <AddExtraServiceModal
          visible={extraModalVisible}
          bookingId={selectedBookingId}
          onClose={() => { setExtraModalVisible(false); setSelectedBookingId(null); }}
          onRefresh={load}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primary },
  body: { flex: 1, backgroundColor: colors.bg, padding: 14 },
  title: { fontSize: 16, fontWeight: '800', color: colors.text, flexShrink: 1, marginRight: 8 },
  muted: { color: colors.muted, fontSize: 13 },
  price: { color: colors.success, fontWeight: '800', fontSize: 15 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  warn: { color: colors.warning, fontSize: 12, fontWeight: '600', marginTop: 8 },
  hintText: { color: colors.muted, fontSize: 12, marginTop: 6 },
    technicianReviewBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  reviewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  reviewCommentText: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Custom Styles Added for Add-on Upsells
  extraContainer: { backgroundColor: '#F1F5F9', padding: 10, borderRadius: 6, marginVertical: 8, borderWidth: 0.5, borderColor: '#CBD5E1' },
  extraHead: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 4 }
});

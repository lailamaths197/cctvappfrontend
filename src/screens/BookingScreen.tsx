import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  Dimensions 
} from 'react-native';
import * as Location from 'expo-location'; 
import MapView, { Marker } from 'react-native-maps';

import { errorMessage } from '../api/client';
import { BookingApi, BackendAvailableSlot } from '../api/endpoints';
import DatePicker from '../components/DatePicker';
import ImagePickerField from '../components/ImagePickerField';
import { Button, Chip, FormField } from '../components/ui';
import { colors } from '../theme';
import type { Service } from '../types';
import { Alert } from '../utils/dialog';
import { appendImages, PickedImage } from '../utils/upload';
import { validatePincode, validateRequired } from '../utils/validation';
import { usePayBooking } from '../hooks/usePayBooking';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

const MAX_IMAGES = 6;
const pad = (n: number) => String(n).padStart(2, '0');
const toISODate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const tomorrow = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
};

export default function BookingScreen({ navigation, route }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [serviceId, setServiceId] = useState<number | undefined>(route.params?.serviceId);
  const [date, setDate] = useState<Date>(tomorrow());
  
  const [availableSlots, setAvailableSlots] = useState<BackendAvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [timeSlot, setTimeSlot] = useState<string>('');
  const [isSlotModalVisible, setIsSlotModalVisible] = useState(false);

  const [description, setDescription] = useState('');
  
  const [addressMode, setAddressMode] = useState<'gps' | 'manual'>('gps');

  const [houseNo, setHouseNo] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  
  const [locating, setLocating] = useState(false); 
  const [gpsResolvedAddress, setGpsResolvedAddress] = useState<string>('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  const [images, setImages] = useState<PickedImage[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);

  const { pay } = usePayBooking(() => {});

  useEffect(() => {
    BookingApi.services()
      .then(setServices)
      .catch((e) => Alert.alert('Could not load services', errorMessage(e)))
      .finally(() => setLoadingServices(false));
  }, []);

  useEffect(() => {
    if (!serviceId) return;
    setLoadingSlots(true);
    setTimeSlot('');

    BookingApi.getAvailableSlots(serviceId, toISODate(date))
      .then((res: any) => {
        const verifiedAvailable = (res.slots || []).filter(
          (s: BackendAvailableSlot) => s.available_technicians > 0
        );
        setAvailableSlots(verifiedAvailable);
      })
      .catch(() => Alert.alert('Error', 'Could not load technician scheduling metadata.'))
      .finally(() => setLoadingSlots(false));
  }, [serviceId, date]);

  const handleFetchGpsLocation = async () => {
    setLocating(true);
    setGpsResolvedAddress('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location access to pinpoint your installation site.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = location.coords;
      setCoordinates({ latitude, longitude });

      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      
      if (geocode && geocode.length > 0) {
        const addr = geocode[0];
        
        const summary = [
          addr.name || addr.streetNumber,
          addr.street,
          addr.district,
          addr.city,
          addr.postalCode
        ].filter(Boolean).join(', ');

        setGpsResolvedAddress(summary);

        setHouseNo(addr.name || addr.streetNumber || 'GPS Location');
        setStreet(addr.street || addr.district || 'Detected Area');
        setCity(addr.city || addr.subregion || '');
        setState(addr.region || '');
        setPincode(addr.postalCode || '');
      }
    } catch (err) {
      Alert.alert('Tracking Error', 'Could not resolve satellite telemetry into a structural physical address.');
    } finally {
      setLocating(false);
    }
  };

  const selected = services.find((s) => s.id === serviceId);
  const descriptionRequired = selected?.service_type === 'service_complaint';

  const errors = useMemo(
    () => ({
      service: serviceId ? '' : 'Choose a service.',
      slot: timeSlot ? '' : 'Choose an operational time slot window.',
      description: descriptionRequired
        ? validateRequired('Issue description', description, 10, 1000)
        : description.trim().length > 1000
        ? 'Description must be at most 1000 characters.'
        : '',
      gpsAddress: addressMode === 'gps' && !coordinates ? 'You must query telemetry mapping tracking data.' : '',
      houseNo: addressMode === 'manual' ? validateRequired('House / Flat no', houseNo, 1, 50) : '',
      street: addressMode === 'manual' ? validateRequired('Street / Locality', street, 3, 200) : '',
      city: addressMode === 'manual' ? validateRequired('City', city, 2, 100) : '',
      state: addressMode === 'manual' ? validateRequired('State', state, 2, 100) : '',
      pincode: addressMode === 'manual' ? validatePincode(pincode) : '',
    }),
    [serviceId, timeSlot, descriptionRequired, description, addressMode, coordinates, houseNo, street, city, state, pincode],
  );
  
  const show = (e: string) => (attempted ? e : '');

  const submit = async () => {
    setAttempted(true);
    if (Object.values(errors).some(Boolean)) {
      Alert.alert('Check the form', 'Please resolve layout validation metrics.');
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.append('service', String(serviceId));
      form.append('date', toISODate(date));
      form.append('time_slot', timeSlot);
      form.append('issue_description', description.trim());
      form.append('address_mode', addressMode);
      
      form.append('house_no', houseNo.trim());
      form.append('street', street.trim());
      form.append('landmark', landmark.trim());
      form.append('city', city.trim());
      form.append('state', state.trim());
      form.append('pincode', pincode.trim());
      
      if (coordinates) {
        form.append('latitude', String(coordinates.latitude));
        form.append('longitude', String(coordinates.longitude));
      }
      
      await appendImages(form, 'images', images);
      const created = await BookingApi.create(form);
      const goBack = () => navigation.goBack();

      if (created.payment) {
        const simulatedBooking: any = {
          id: created.id, amount: created.amount, extra_service_charge: '0.00', total_payable_amount: created.amount
        };
        Alert.alert('Booking placed', `Booking #${created.id} created. Pay ₹${created.amount} now?`, [
          { text: 'Pay later', style: 'cancel', onPress: goBack },
          { text: 'Pay now', onPress: () => pay(created.id, simulatedBooking).finally(goBack) },
        ]);
      } else {
        Alert.alert('Booking placed', created.payment_error ?? 'You can pay from My Bookings.', [{ text: 'OK', onPress: goBack }]);
      }
    } catch (err) {
      Alert.alert('Could not place booking', errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const selectedSlotLabel = availableSlots.find(s => s.id === timeSlot)?.label || 'Tap to select an available window';

    return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: colors.bg }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Book CCTV Service</Text>

        {/* 1. Service Selection Chips */}
        <Text style={styles.label}>Select Service Category *</Text>
        {loadingServices ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.chipRow}>
            {services.map((item) => (
              <Chip
                key={item.id}
                label={`${item.name} (₹${item.base_price})`}
                selected={serviceId === item.id}
                onPress={() => setServiceId(item.id)}
              />
            ))}
          </View>
        )}
        {show(errors.service) ? <Text style={styles.errorText}>{errors.service}</Text> : null}

        {/* 2. Date Selection Picker */}
        <Text style={styles.label}>Select Service Date *</Text>
        <DatePicker minimumDate={tomorrow()} value={date} onChange={setDate} />

        {/* 3. Time Slot Trigger Block */}
        <Text style={styles.label}>Preferred Time Window *</Text>
        <TouchableOpacity 
          style={[styles.dropdownTrigger, show(errors.slot) ? styles.inputError : null]} 
          onPress={() => setIsSlotModalVisible(true)}
          disabled={loadingSlots || !serviceId}
        >
          {loadingSlots ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={timeSlot ? styles.dropdownText : styles.dropdownPlaceholder}>
              {selectedSlotLabel}
            </Text>
          )}
        </TouchableOpacity>
        {show(errors.slot) ? <Text style={styles.errorText}>{errors.slot}</Text> : null}

        {/* 4. Issue Description Textarea */}
        <FormField
          label={`Issue / Requirement Summary ${descriptionRequired ? '*' : '(Optional)'}`}
          placeholder="Describe your CCTV camera issues or layout configuration metrics..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          error={show(errors.description)}
        />

        {/* 5. Address Tab Navigation Toggle Row */}
        <Text style={styles.sectionTitleHeader}>Installation Site Address</Text>
        <View style={styles.tabToggleRow}>
          <TouchableOpacity 
            style={[styles.tabButton, addressMode === 'gps' && styles.activeTabButton]}
            onPress={() => { setAddressMode('gps'); setAttempted(false); }}
          >
            <Text style={[styles.tabText, addressMode === 'gps' && styles.activeTabText]}>🛰️ Tracking Live GPS</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabButton, addressMode === 'manual' && styles.activeTabButton]}
            onPress={() => { setAddressMode('manual'); setAttempted(false); }}
          >
            <Text style={[styles.tabText, addressMode === 'manual' && styles.activeTabText]}>✏️ Manual Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Address Tab 1: Live Interactive GPS Maps Tracker */}
        {addressMode === 'gps' && (
          <View style={styles.tabCardPanel}>
            <Text style={styles.tabInstruction}>
              Target your precise CCTV setup area on the live tracking map below or adjust the pointer pin manually.
            </Text>
            
            <Button
              title={locating ? "Pinpointing Hardware Coordinates..." : "Locate My Current Position"}
              onPress={handleFetchGpsLocation}
              disabled={locating}
              style={styles.gpsTrackingBtn}
            />

            <View style={styles.mapViewContainer}>
              <MapView
                style={styles.mapEngineStyle}
                loadingEnabled={true}
                region={{
                  latitude: coordinates ? coordinates.latitude : 13.0827,
                  longitude: coordinates ? coordinates.longitude : 80.2707,
                  latitudeDelta: coordinates ? 0.005 : 0.06,
                  longitudeDelta: coordinates ? 0.005 : 0.06,
                }}
                onPress={(e: any) => setCoordinates(e.nativeEvent.coordinate)}
              >
                {coordinates && (
                  <Marker
                    coordinate={coordinates}
                    title="CCTV Deployment Site"
                    description="Hold and drag pin precisely to your hardware setup point"
                    draggable
                    onDragEnd={(e: any) => setCoordinates(e.nativeEvent.coordinate)}
                    pinColor={colors.primary}
                  />
                )}
              </MapView>
            </View>

            {gpsResolvedAddress ? (
              <View style={styles.gpsSuccessBox}>
                <Text style={styles.gpsSuccessTitle}>🛰️ Deployment Coordinates Locked</Text>
                <Text style={styles.gpsSuccessBody}>{gpsResolvedAddress}</Text>
              </View>
            ) : null}
            {show(errors.gpsAddress) ? <Text style={styles.errorText}>{errors.gpsAddress}</Text> : null}

            <FormField
              label="Landmark / Gateway Access Instructions (Optional)"
              placeholder="e.g., Suite 402, 4th block near server elevator array"
              value={landmark}
              onChangeText={setLandmark}
            />
          </View>
        )}

        {/* Address Tab 2: Manual Form Multi-Field Grid Layout */}
        {addressMode === 'manual' && (
          <View style={styles.tabCardPanel}>
            <FormField
              label="House / Flat / Building No *"
              placeholder="e.g., Door No. 4B, Balaji Apartments"
              value={houseNo}
              onChangeText={setHouseNo}
              error={show(errors.houseNo)}
            />
            <FormField
              label="Street Name / Locality *"
              placeholder="e.g., 2nd Main Road, Anna Nagar"
              value={street}
              onChangeText={setStreet}
              error={show(errors.street)}
            />
            <FormField
              label="Landmark (Optional)"
              placeholder="e.g., Opposite the park gate"
              value={landmark}
              onChangeText={setLandmark}
            />
            <View style={styles.rowFields}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <FormField
                  label="City *"
                  placeholder="Chennai"
                  value={city}
                  onChangeText={setCity}
                  error={show(errors.city)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormField
                  label="State *"
                  placeholder="Tamil Nadu"
                  value={state}
                  onChangeText={setState}
                  error={show(errors.state)}
                />
              </View>
            </View>
            <FormField
              label="Postal Pincode *"
              placeholder="600040"
              keyboardType="number-pad"
              maxLength={6}
              value={pincode}
              onChangeText={setPincode}
              error={show(errors.pincode)}
            />
          </View>
        )}

        {/* 6. Hardware Multi-Photo Evidence Upload Grid */}
        <Text style={[styles.label, { marginTop: 24 }]}>Site Layout Images / Defective Hardware Photos</Text>
        <Text style={styles.subLabel}>Attach up to {MAX_IMAGES} reference snapshots for the installation engineer team.</Text>
        <ImagePickerField 
  label="Site Photos" 
  images={images} 
  onChange={setImages} 
/>


        {/* 7. Action Form Submission Button */}
        <Button
          title={busy ? "Processing Request Pipeline..." : "Confirm & Schedule Booking"}
          onPress={submit}
          loading={busy}
          style={styles.submitBtn}
        />
      </ScrollView>

      {/* 🕐 Time Slots Bottom Overlay Panel Modal Sheet */}
      <Modal
        visible={isSlotModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSlotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Available Booking Windows</Text>
            {availableSlots.length === 0 ? (
              <Text style={styles.noSlotsText}>No technical structural slots for this timestamp. Change scheduling.</Text>
            ) : (
              <FlatList
                data={availableSlots}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.slotItem, timeSlot === item.id && styles.selectedSlotItem]}
                    onPress={() => {
                      setTimeSlot(item.id);
                      setIsSlotModalVisible(false);
                    }}
                  >
                    <Text style={styles.slotLabel}>{item.label}</Text>
                    <Text style={styles.slotCount}>{item.available_technicians} engineers free</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            <Button 
              title="Close Panel" 
              onPress={() => setIsSlotModalVisible(false)} 
              variant="outline"
              style={styles.modalCloseBtn}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 14,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 4,
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  dropdownText: {
    fontSize: 15,
    color: colors.text,
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: colors.muted,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  sectionTitleHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 26,
    marginBottom: 10,
  },
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: colors.card,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  activeTabText: {
    color: colors.primary,
  },
  tabCardPanel: {
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabInstruction: {
    fontSize: 13,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  gpsTrackingBtn: {
    marginVertical: 4,
  },
  mapViewContainer: {
    height: 240,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  mapEngineStyle: {
    flex: 1,
  },
  gpsSuccessBox: {
    backgroundColor: '#dcfce7',
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginVertical: 12,
  },
  gpsSuccessTitle: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  gpsSuccessBody: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 16,
  },
  gpsCoordinatesText: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 6,
  },
  rowFields: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loader: {
    marginVertical: 10,
  },
  submitBtn: {
    marginTop: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: Dimensions.get('window').height * 0.6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  slotItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectedSlotItem: {
    backgroundColor: colors.bg,
  },
  slotLabel: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  slotCount: {
    fontSize: 13,
    color: colors.success,
  },
  noSlotsText: {
    textAlign: 'center',
    color: colors.muted,
    marginVertical: 30,
  },
  modalCloseBtn: {
    marginTop: 16,
  },
});

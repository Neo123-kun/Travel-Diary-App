import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useDiary, TravelEntry } from '../context/Diarycontext';
import { useTheme } from '../context/Themecontext';
import { createAddEntryStyles } from '../screenDesigns/Addentrystyles';
import { Entypo } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';


// Types
interface AddEntryScreenProps {
  navigation: {
    goBack: () => void;
  };
}

interface EntryDraft {
  photoUri: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

type PermissionStatus = 'idle' | 'granted' | 'denied';

// Notification Setup
Notifications.setNotificationHandler({
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
});

// Component
const AddEntryScreen: React.FC<AddEntryScreenProps> = ({ navigation }) => {
  const { addEntry } = useDiary();
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = createAddEntryStyles(colors);

  const [draft, setDraft] = useState<EntryDraft>({
    photoUri: null,
    address: null,
    latitude: null,
    longitude: null,
  });

  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [cameraPermission, setCameraPermission] =
    useState<PermissionStatus>('idle');
  const [locationPermission, setLocationPermission] =
    useState<PermissionStatus>('idle');
  const [notifPermission, setNotifPermission] =
    useState<PermissionStatus>('idle');

  const isMounted = useRef(true);

  // ─── Cleanup ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ─── Request all permissions on mount ─────────────────
  useEffect(() => {
    requestAllPermissions();
  }, []);

  const requestAllPermissions = async () => {
    await requestCameraPermission();
    await requestLocationPermission();
    await requestNotificationPermission();
  };

  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (isMounted.current) {
        setCameraPermission(status === 'granted' ? 'granted' : 'denied');
      }
    } catch {
      if (isMounted.current) setCameraPermission('denied');
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (isMounted.current) {
        setLocationPermission(status === 'granted' ? 'granted' : 'denied');
      }
    } catch {
      if (isMounted.current) setLocationPermission('denied');
    }
  };

  const requestNotificationPermission = async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (isMounted.current) {
          setNotifPermission(status === 'granted' ? 'granted' : 'denied');
        }
      } else {
        const { status } = await Notifications.requestPermissionsAsync();
        if (isMounted.current) {
          setNotifPermission(status === 'granted' ? 'granted' : 'denied');
        }
      }
    } catch {
      if (isMounted.current) setNotifPermission('denied');
    }
  };

  // Reverse Geocoding
  const fetchAddress = useCallback(
    async (lat: number, lon: number): Promise<string> => {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lon,
        });

        if (results.length === 0) return 'Unknown location';

        const r = results[0];
        const parts: string[] = [];

        if (r.name) parts.push(r.name);
        if (r.street && r.name !== r.street) parts.push(r.street);
        if (r.city) parts.push(r.city);
        if (r.region) parts.push(r.region);
        if (r.country) parts.push(r.country);

        return parts.length > 0 ? parts.join(', ') : 'Unknown location';
      } catch {
        return 'Could not determine address';
      }
    },
    []
  );

  // Get Current Location
  const getCurrentLocation = useCallback(async () => {
    if (locationPermission !== 'granted') {
      setLocationError('Location permission is required to record your spot.');
      return null;
    }

    setIsFetchingLocation(true);
    setLocationError(null);

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = loc.coords;
      const address = await fetchAddress(latitude, longitude);

      return { latitude, longitude, address };
    } catch (e) {
      setLocationError(
        'Unable to get your current location. Please try again.'
      );
      return null;
    } finally {
      if (isMounted.current) setIsFetchingLocation(false);
    }
  }, [locationPermission, fetchAddress]);

  // Take Photo
  const handleTakePhoto = async () => {
    if (cameraPermission !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera access in your device settings to take photos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: requestCameraPermission },
        ]
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: false,
        exif: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      if (!asset.uri) {
        setSaveError('Failed to capture photo. Please try again.');
        return;
      }

      // Reset previous entry data
      setDraft({ photoUri: asset.uri, address: null, latitude: null, longitude: null });
      setLocationError(null);
      setSaveError(null);

      // Auto-fetch location
      const location = await getCurrentLocation();
      if (location && isMounted.current) {
        setDraft({
          photoUri: asset.uri,
          address: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }
    } catch {
      if (isMounted.current) {
        setSaveError('An error occurred while taking the photo. Please try again.');
      }
    }
  };

  // Send Notification
  const sendSaveNotification = async (address: string) => {
    if (notifPermission !== 'granted') return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'જ⁀➴⋆.˚ Travel Memory Saved જ⁀➴⋆.˚',
          body: `Your memory at "${address}" has been added to your diary.`,
          sound: true,
          data: { type: 'entry_saved' },
        },
        trigger: null,
      });
    } catch {
    }
  };

  // Validate Draft
  const isDraftValid = (): boolean => {
    return (
      draft.photoUri !== null &&
      draft.address !== null &&
      draft.latitude !== null &&
      draft.longitude !== null &&
      !isFetchingLocation
    );
  };

  // Save Entry
  const handleSave = async () => {
    setSaveError(null);

    if (!draft.photoUri) {
      setSaveError('Please take a photo before saving.');
      return;
    }

    if (isFetchingLocation) {
      setSaveError('Please wait while we fetch your location.');
      return;
    }

    if (!draft.address || draft.latitude === null || draft.longitude === null) {
      setSaveError('Location data is missing. Please retake the photo or check your location settings.');
      return;
    }

    const now = Date.now();
    const entry: TravelEntry = {
      id: `entry_${now}_${Math.random().toString(36).slice(2, 9)}`,
      photoUri: draft.photoUri,
      address: draft.address,
      latitude: draft.latitude,
      longitude: draft.longitude,
      timestamp: now,
      date: new Date(now).toISOString(),
    };

    setIsSaving(true);

    try {
      await addEntry(entry);
      await sendSaveNotification(draft.address);

      Alert.alert(
        '✔ Entry Saved!',
        `Your memory at "${draft.address}" has been added to your diary.`,
        [
          {
            text: 'Great!',
            onPress: () => {
              // Reset form
              setDraft({ photoUri: null, address: null, latitude: null, longitude: null });
              setSaveError(null);
              setLocationError(null);
              navigation.goBack();
            },
          },
        ]
      );
    } catch {
      if (isMounted.current) {
        setSaveError('Failed to save your entry. Please try again.');
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  // Handle Back
  const handleBack = () => {
    if (draft.photoUri) {
      Alert.alert(
        'Discard Entry?',
        'You have an unsaved entry. Going back will discard it.',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setDraft({ photoUri: null, address: null, latitude: null, longitude: null });
              setSaveError(null);
              setLocationError(null);
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // If permission denied
  const renderPermissionDenied = () => (
    <View style={styles.permissionCard}>
      <Text style={styles.permissionTitle}>Permissions Needed</Text>
      <Text style={styles.permissionText}>
        TravelDiary requires camera and location permissions to capture and
        record your travel memories. Please grant these permissions to continue.
      </Text>
      <TouchableOpacity
        style={styles.permissionButton}
        onPress={requestAllPermissions}
      >
        <Text style={styles.permissionButtonText}>Grant Permissions</Text>
      </TouchableOpacity>
    </View>
  );

  const hasCriticalPermissionsDenied =
    cameraPermission === 'denied' || locationPermission === 'denied';

  // Render
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.headerBg}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Entry</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.themeToggle}
            onPress={toggleTheme}
            accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            <View
              style={[
                styles.themeToggleThumb,
                isDark && styles.themeToggleThumbDark,
              ]}
            />
          </TouchableOpacity>

          <Ionicons
            name={isDark ? 'moon' : 'sunny'}
            size={16}
            color={isDark ? colors.primary : colors.primary}
            style={{ marginLeft: 6 }}
          />
        </View>
      </View>

      {hasCriticalPermissionsDenied ? (
        renderPermissionDenied()
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Entypo name="camera" size={24} color={colors.primary}/>
              <Text style={styles.sectionLabel}> Photo</Text>
            </View>
          <View style={[styles.photoArea, draft.photoUri && styles.photoAreaFilled]}>
            {draft.photoUri ? (
              <Image
                source={{ uri: draft.photoUri }}
                style={styles.takenPhoto}
                resizeMode="cover"
                accessibilityLabel="Captured travel photo"
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Entypo name="camera" size={55} color={colors.emptyIcon} />
                <Text style={styles.photoPlaceholderText}>No photo taken yet</Text>
                <Text style={styles.photoPlaceholderSub}>
                  Tap the button below to capture your moment
                </Text>
              </View>
            )}
          </View>

          {/* Camera Button */}
          <TouchableOpacity
            style={[styles.cameraButton, draft.photoUri && styles.retakeButton]}
            onPress={handleTakePhoto}
            disabled={isFetchingLocation || isSaving}
            accessibilityLabel={draft.photoUri ? 'Retake photo' : 'Take photo'}
            accessibilityRole="button"
          >
            <Ionicons
              name={draft.photoUri ? 'camera-reverse' : 'camera-outline'}
              size={24}
              color= {draft.photoUri ? colors.primary : colors.surface}
              style={styles.cameraButtonIcon}
            />
            <Text
              style={[
                styles.cameraButtonText,
                draft.photoUri && styles.retakeButtonText,
              ]}
            >
              {draft.photoUri ? 'Retake Photo' : 'Take Photo'}
            </Text>
          </TouchableOpacity>

          {/* Location Section */}
          <View style={{ flexDirection: 'row', marginTop: 20 }}>
            <Ionicons name="location-sharp" size={24} color={colors.primary} />
            <Text style={styles.sectionLabel}> Location</Text>
          </View>

          {/* Address Card */}
          <View style={styles.addressCard}>
            <View style={styles.addressCardRow}>
              {/* Icon replacing emoji */}
              {isFetchingLocation ? (
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={colors.primary}
                  style={styles.addressIcon}
                />
              ) : draft.address ? (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                  style={styles.addressIcon}
                />
              ) : (
                <Entypo
                  name="location-pin"
                  size={20}
                  color={colors.primary}
                  style={styles.addressIcon}
                />
              )}

              {/* Address text */}
              <View style={styles.addressTextBlock}>
                <Text style={styles.addressLabel}>Current Address</Text>

                {isFetchingLocation ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.addressLoading}>Fetching your location…</Text>
                  </View>
                ) : draft.address ? (
                  <Text style={styles.addressText}>{draft.address}</Text>
                ) : (
                  <Text style={styles.addressPlaceholder}>
                    Take a photo to auto-detect your location
                  </Text>
                )}
              </View>
            </View>

          {/* Coordinates */}
          {draft.latitude !== null && draft.longitude !== null && (
            <View style={styles.coordsRow}>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>Latitude</Text>
                <Text style={styles.coordValue}>{draft.latitude.toFixed(6)}°</Text>
              </View>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>Longitude</Text>
                <Text style={styles.coordValue}>{draft.longitude.toFixed(6)}°</Text>
              </View>
            </View>
          )}
        </View>

          {/* Location Error */}
          {locationError && (
            <View style={[styles.errorContainer, { marginTop: 10 }]}>
              <Text style={styles.errorText}>{locationError}</Text>
            </View>
          )}

          {/* Save Error */}
          {saveError && (
            <View style={[styles.errorContainer, { marginTop: 10 }]}>
              <Text style={styles.errorText}>{saveError}</Text>
            </View>
          )}

          {/* Notification Permission Warning */}
          {notifPermission === 'denied' && (
            <View style={[styles.errorContainer, { marginTop: 10, borderColor: colors.textMuted }]}>
              <Text style={[styles.errorText, { color: colors.textMuted }]}>
                Notifications are disabled. You won't receive a confirmation
                after saving. Enable them in device settings for the full
                experience.
              </Text>
            </View>
          )}

          {/* Save Button */}
          <View style={styles.saveButtonWrapper}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!isDraftValid() || isSaving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!isDraftValid() || isSaving}
              accessibilityLabel="Save travel entry"
              accessibilityRole="button"
              accessibilityState={{ disabled: !isDraftValid() || isSaving }}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="save" size={20} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Entry</Text>
                  </View>
                  <Text style={styles.saveButtonSub}>
                    {isDraftValid()
                      ? 'Entry will be saved to your diary'
                      : 'Take a photo first'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default AddEntryScreen;
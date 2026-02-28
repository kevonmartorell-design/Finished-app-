import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';
import { AEGISButton, AEGISInput, Toast, LoadingState } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';

// ── Constants ──────────────────────────────────────────────────────
const AVATAR_SIZE = 100;
const MIN_TAP = 48;
const BACK_ARROW = '\u2190'; // ←

// ── Types ──────────────────────────────────────────────────────────
interface ToastState {
  visible: boolean;
  type: 'success' | 'error';
  message: string;
}

// ── Component ──────────────────────────────────────────────────────
export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const authStore = useAuthStore();

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    type: 'success',
    message: '',
  });

  // ── Initialise form from user data ────────────────────────────────
  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
      setAvatarUrl(user.avatar_url ?? null);
    }
  }, [user]);

  // ── Helpers ───────────────────────────────────────────────────────
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ visible: true, type, message });
  }, []);

  const dismissToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  /** Extract initials from the user's name for the fallback avatar. */
  const getInitials = (): string => {
    if (!name.trim()) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // ── Avatar upload ─────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Camera roll access is needed to change your photo.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploadingAvatar(true);

      // Build file path for Supabase Storage
      const fileExtension = asset.uri.split('.').pop() ?? 'jpg';
      const filePath = `${user?.id ?? 'unknown'}/${Date.now()}.${fileExtension}`;

      // Fetch the image as a blob for upload
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      // Upload to Supabase Storage 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: asset.mimeType ?? `image/${fileExtension}`,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newAvatarUrl = publicUrlData.publicUrl;
      setAvatarUrl(newAvatarUrl);
      showToast('success', 'Photo updated successfully.');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload photo.';
      showToast('error', message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Save profile ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!accessToken) {
      showToast('error', 'You are not authenticated. Please log in again.');
      return;
    }

    setSaving(true);

    try {
      const body: Record<string, string | null> = {
        name: name.trim(),
        phone: phone.trim() || null,
        avatar_url: avatarUrl,
      };

      if (user?.plan === 'business') {
        body.business_name = businessName.trim() || null;
      }

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/user/me`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.message ?? `Save failed (${res.status})`,
        );
      }

      // Sync the updated user back into the Zustand store
      const updatedUser = await res.json();
      if (updatedUser && authStore.setUser) {
        authStore.setUser(updatedUser);
      }

      showToast('success', 'Profile saved successfully.');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      showToast('error', message);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={styles.screen}>
        <LoadingState message="Loading profile..." />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Toast overlay */}
      {toast.visible && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={dismissToast}
        />
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header with back button ────────────────────────────── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backArrow}>{BACK_ARROW}</Text>
          </Pressable>
          <Text style={styles.screenTitle}>Profile</Text>
          {/* Spacer to balance the back button */}
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Avatar section ─────────────────────────────────────── */}
        <View style={styles.avatarSection}>
          {uploadingAvatar ? (
            <View style={styles.avatarContainer}>
              <ActivityIndicator size="large" color={colors.purple} />
            </View>
          ) : avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              accessibilityLabel={`${name}'s profile photo`}
            />
          ) : (
            <View style={styles.avatarContainer}>
              <Text style={styles.initialsText}>{getInitials()}</Text>
            </View>
          )}

          <Pressable
            onPress={handlePickAvatar}
            disabled={uploadingAvatar}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={({ pressed }) => [
              styles.changePhotoButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </Pressable>
        </View>

        {/* ── Form fields ────────────────────────────────────────── */}
        <View style={styles.formSection}>
          <AEGISInput
            label="Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
          />

          <View style={styles.fieldGroup}>
            <AEGISInput
              label="Email"
              placeholder="Your email address"
              value={email}
              onChangeText={setEmail}
              disabled
            />
            <Text style={styles.fieldNote}>
              Email is managed by your authentication provider and cannot be
              changed here.
            </Text>
          </View>

          <AEGISInput
            label="Phone"
            placeholder="Enter your phone number"
            value={phone}
            onChangeText={setPhone}
          />

          {user.plan === 'business' && (
            <AEGISInput
              label="Business Name"
              placeholder="Enter your business name"
              value={businessName}
              onChangeText={setBusinessName}
            />
          )}
        </View>

        {/* ── Save button ────────────────────────────────────────── */}
        <View style={styles.saveSection}>
          {saving ? (
            <LoadingState message="Saving changes..." />
          ) : (
            <AEGISButton
              variant="primary"
              label="Save Changes"
              onPress={handleSave}
              loading={saving}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.xl,
    paddingBottom: spacing.xxl,
  },

  /* ── Header ──────────────────────────────────────── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  backButton: {
    minWidth: MIN_TAP,
    minHeight: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: fonts.body,
    fontSize: fontSizes.hero,
    color: colors.white,
  },
  screenTitle: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.white,
    textAlign: 'center',
  },
  headerSpacer: {
    minWidth: MIN_TAP,
    minHeight: MIN_TAP,
  },

  /* ── Avatar ──────────────────────────────────────── */
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.purple,
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.darkGrey,
    borderWidth: 2,
    borderColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.purple,
  },
  changePhotoButton: {
    marginTop: spacing.md,
    minWidth: MIN_TAP,
    minHeight: MIN_TAP,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  changePhotoText: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.body,
    color: colors.orange,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  /* ── Form ────────────────────────────────────────── */
  formSection: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldNote: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.midGrey,
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },

  /* ── Save ────────────────────────────────────────── */
  saveSection: {
    marginTop: spacing.sm,
  },

  /* ── Shared ──────────────────────────────────────── */
  pressed: {
    opacity: 0.7,
  },
});

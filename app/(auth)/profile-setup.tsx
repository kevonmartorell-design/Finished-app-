import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { AEGISButton } from '@/components/aegis-button';
import { AEGISInput } from '@/components/aegis-input';
import { Toast } from '@/components/toast';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

type ToastState = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
} | null;

export default function ProfileSetupScreen() {
  const { user, accessToken } = useAuth();

  const [avatarUri, setAvatarUri] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const isBusiness = user?.plan === 'business';

  const handlePickAvatar = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setToast({
          type: 'warning',
          message: 'Camera roll permission is needed to upload a photo.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        await uploadAvatar(asset.uri);
      }
    } catch {
      setToast({
        type: 'error',
        message: 'Failed to pick image. Please try again.',
      });
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user) return;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop() ?? 'jpg';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { contentType: `image/${fileExt}` });

      if (error) {
        setToast({ type: 'error', message: 'Failed to upload avatar.' });
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
    } catch {
      setToast({
        type: 'error',
        message: 'Unable to upload avatar. Check your internet.',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      const body: Record<string, string> = {};
      if (avatarUrl) body.avatar_url = avatarUrl;
      if (isBusiness && businessName.trim())
        body.business_name = businessName.trim();
      if (phone.trim()) body.phone = phone.trim();

      await fetch(`${API_BASE}/user/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      router.replace('/(auth)/onboarding');
    } catch {
      setToast({
        type: 'error',
        message: 'Unable to connect. Check your internet.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/onboarding');
  };

  return (
    <View style={styles.container}>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>SET UP YOUR PROFILE</Text>

          {/* Avatar */}
          <Pressable
            onPress={handlePickAvatar}
            style={styles.avatarContainer}
            accessibilityRole="button"
            accessibilityLabel="Tap to upload profile photo"
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons
                  name="camera-outline"
                  size={32}
                  color={colors.purple}
                />
              </View>
            )}
            {uploading && (
              <View style={styles.avatarOverlay}>
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
            <Text style={styles.avatarHint}>Tap to add photo</Text>
          </Pressable>

          {/* Fields */}
          <View style={styles.form}>
            {isBusiness && (
              <AEGISInput
                label="BUSINESS NAME"
                placeholder="Enter your business name"
                value={businessName}
                onChangeText={setBusinessName}
                icon={
                  <Ionicons
                    name="business-outline"
                    size={20}
                    color={colors.purple}
                  />
                }
              />
            )}

            <AEGISInput
              label="PHONE NUMBER"
              placeholder="Enter your phone number (optional)"
              value={phone}
              onChangeText={setPhone}
              icon={
                <Ionicons
                  name="call-outline"
                  size={20}
                  color={colors.purple}
                />
              }
            />
          </View>

          <AEGISButton
            variant="primary"
            label="CONTINUE"
            onPress={handleContinue}
            loading={loading}
          />

          <Pressable onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.appBg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl * 2,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.white,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.purple,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.darkGrey,
    borderWidth: 2,
    borderColor: colors.purple,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.white,
  },
  avatarHint: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.midGrey,
    marginTop: spacing.sm,
  },
  form: {
    width: '100%',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  skipButton: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  skipText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },
});

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { AEGISButton } from '@/components/aegis-button';
import { Toast } from '@/components/toast';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;
const CODE_LENGTH = 6;

type ToastState = {
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
} | null;

export default function TwoFactorScreen() {
  const { login } = useAuth();
  const { user_id, temp_token } = useLocalSearchParams<{
    user_id: string;
    temp_token: string;
  }>();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<ToastState>(null);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  const fullCode = code.join('');
  const isCodeFilled = fullCode.length === CODE_LENGTH;

  const handleDigitChange = (text: string, index: number) => {
    // Only allow single digit
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');

    // Auto-advance to next input
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    // Handle backspace — move to previous input
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
    }
  };

  const handleVerify = async () => {
    if (!isCodeFilled) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${temp_token}`,
        },
        body: JSON.stringify({ code: fullCode, user_id }),
      });

      const data = await res.json();

      if (res.ok) {
        await login(data.accessToken, data.refreshToken, data.user);
        router.replace(
          data.user.plan === 'business' ? '/(business)/' : '/(solo)/',
        );
      } else if (res.status === 401) {
        setError(
          data.remaining_attempts
            ? `Invalid code. ${data.remaining_attempts} attempts remaining.`
            : 'Invalid code. Please try again.',
        );
        // Clear code for retry
        setCode(Array(CODE_LENGTH).fill(''));
        inputRefs.current[0]?.focus();
      } else {
        setToast({
          type: 'error',
          message: 'Something went wrong. Please try again.',
        });
      }
    } catch {
      setToast({
        type: 'error',
        message: 'Unable to connect. Check your internet.',
      });
    } finally {
      setLoading(false);
    }
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
          <Ionicons
            name="shield-checkmark-outline"
            size={48}
            color={colors.purple}
            style={styles.icon}
          />

          <Text style={styles.title}>TWO-FACTOR AUTH</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code from your authenticator app
          </Text>

          {/* PIN Input */}
          <View style={styles.codeRow}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.codeInput,
                  digit ? styles.codeInputFilled : null,
                  error ? styles.codeInputError : null,
                ]}
                value={digit}
                onChangeText={(text) => handleDigitChange(text, index)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(nativeEvent.key, index)
                }
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                accessibilityLabel={`Digit ${index + 1} of ${CODE_LENGTH}`}
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.spacerXl} />

          <AEGISButton
            variant={isCodeFilled ? 'primary' : 'disabled'}
            label="VERIFY"
            onPress={handleVerify}
            loading={loading}
          />

          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={styles.linkButton}
          >
            <Text style={styles.linkText}>Back to Sign In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

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
  icon: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.white,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  codeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: radius.input,
    backgroundColor: colors.darkGrey,
    borderWidth: 1.5,
    borderColor: 'transparent',
    textAlign: 'center',
    fontFamily: fonts.heading,
    fontSize: fontSizes.hero,
    color: colors.white,
  },
  codeInputFilled: {
    borderColor: colors.purple,
  },
  codeInputError: {
    borderColor: colors.orange,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.label,
    color: colors.orange,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  spacerXl: {
    height: spacing.xxl,
  },
  linkButton: {
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: fontSizes.body,
    color: colors.midGrey,
  },
});

import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, fontSizes, spacing, radius } from '@/lib/tokens';

interface AEGISModalProps {
  visible: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  actions?: React.ReactNode;
}

const MIN_TAP_TARGET = 48;
const WEB_MAX_WIDTH = 480;
const MOBILE_BREAKPOINT = 768;

export function AEGISModal({
  visible,
  title,
  children,
  onClose,
  actions,
}: AEGISModalProps) {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web' && width >= MOBILE_BREAKPOINT;

  const panelStyle: ViewStyle[] = [
    styles.panel,
    isWeb ? styles.panelWeb : styles.panelMobile,
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.backdrop, isWeb && styles.backdropWeb]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close modal"
      >
        {/* Inner wrapper stops press propagation from content area */}
        <Pressable
          style={panelStyle}
          onPress={() => {
            /* prevent backdrop close */
          }}
          accessibilityRole="none"
        >
          {/* Header row */}
          <View style={styles.header}>
            {title ? (
              <Text
                style={styles.title}
                accessibilityRole="header"
                numberOfLines={2}
              >
                {title}
              </Text>
            ) : (
              <View />
            )}

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as ViewStyle),
              ]}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>

          {/* Body */}
          <View style={styles.body}>{children}</View>

          {/* Actions */}
          {actions && <View style={styles.actions}>{actions}</View>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: `${colors.appBg}B3`, // appBg at ~0.7 opacity
    justifyContent: 'flex-end',
  },
  backdropWeb: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ---- Panel ---- */
  panel: {
    backgroundColor: colors.darkGrey,
    padding: spacing.xl,
  },
  panelMobile: {
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  panelWeb: {
    borderRadius: radius.card,
    maxWidth: WEB_MAX_WIDTH,
    width: '100%' as unknown as number, // RN web supports string widths
  },

  /* ---- Header ---- */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: fontSizes.screenTitle,
    color: colors.white,
    flex: 1,
    marginRight: spacing.sm,
  },

  /* ---- Close button ---- */
  closeButton: {
    minWidth: MIN_TAP_TARGET,
    minHeight: MIN_TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontFamily: fonts.body,
    fontSize: fontSizes.screenTitle,
    color: colors.midGrey,
  },
  pressed: {
    opacity: 0.6,
  },

  /* ---- Body ---- */
  body: {
    marginBottom: spacing.lg,
  },

  /* ---- Actions ---- */
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});

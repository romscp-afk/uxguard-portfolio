import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { color, space } from '@/theme/tokens';

const colors = color.light;

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
};

export function Screen({ children, scroll = false, padded = true, contentContainerStyle, onScroll }: Props) {
  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[padded && styles.padded, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={200}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  padded: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.lg },
});

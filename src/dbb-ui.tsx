import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export const dbb_theme = { bg: '#080B19', panel: '#11162A', line: '#29304A', text: '#F8FAFF', muted: '#9BA4C3',
  purple: '#8865FF', mint: '#58F2CB', yellow: '#FFCC71', pink: '#FF749A', blue: '#6DCBFF' };

export function Dbb_Pill({ dbb_label, dbb_tone = 'purple' }: { dbb_label: string; dbb_tone?: 'purple' | 'mint' | 'pink' | 'yellow' }) {
  const dbb_color = { purple: dbb_theme.purple, mint: dbb_theme.mint, pink: dbb_theme.pink, yellow: dbb_theme.yellow }[dbb_tone];
  return <View style={{ backgroundColor: `${dbb_color}22`, borderColor: `${dbb_color}70`, borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 6, alignSelf: 'flex-start' }}><Text style={{ color: dbb_color, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }}>{dbb_label}</Text></View>;
}

export function Dbb_Card({ children, dbb_style }: { children: React.ReactNode; dbb_style?: object }) {
  return <View style={[dbb_styles.card, dbb_style]}>{children}</View>;
}

export function Dbb_Button({ dbb_title, dbb_onPress, dbb_icon, dbb_kind = 'primary', dbb_disabled = false }: {
  dbb_title: string; dbb_onPress: () => void; dbb_icon?: keyof typeof Ionicons.glyphMap;
  dbb_kind?: 'primary' | 'ghost' | 'mint' | 'danger'; dbb_disabled?: boolean;
}) {
  const dbb_colors = dbb_kind === 'mint' ? [dbb_theme.mint, '#8CF3AD'] as const :
    dbb_kind === 'danger' ? [dbb_theme.pink, '#EB4779'] as const : ['#A282FF', '#7559ED'] as const;
  return <Pressable onPress={dbb_onPress} disabled={dbb_disabled} accessibilityRole="button" accessibilityLabel={dbb_title}
    style={({ pressed }) => [{ opacity: dbb_disabled ? .45 : pressed ? .72 : 1, borderRadius: 16, overflow: 'hidden' }]}>
    {dbb_kind === 'ghost' ? <View style={dbb_styles.ghostButton}>{dbb_icon && <Ionicons name={dbb_icon} size={17} color={dbb_theme.text} />}
      <Text style={dbb_styles.ghostText}>{dbb_title}</Text></View> :
      <LinearGradient colors={dbb_colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={dbb_styles.button}>
        {dbb_icon && <Ionicons name={dbb_icon} size={18} color="#090E1D" />}
        <Text style={dbb_styles.buttonText}>{dbb_title}</Text>
      </LinearGradient>}
  </Pressable>;
}

export function Dbb_Section({ dbb_title, dbb_caption, children }: { dbb_title: string; dbb_caption?: string; children: React.ReactNode }) {
  return <View style={{ gap: 14 }}><View style={{ gap: 4 }}><Text style={dbb_styles.sectionTitle}>{dbb_title}</Text>
    {dbb_caption && <Text style={dbb_styles.caption}>{dbb_caption}</Text>}</View>{children}</View>;
}

export function Dbb_Hero({ dbb_onSearch }: { dbb_onSearch: () => void }) {
  const dbb_pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dbb_loop = Animated.loop(Animated.sequence([
      Animated.timing(dbb_pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      Animated.timing(dbb_pulse, { toValue: 0, duration: 1800, useNativeDriver: true })]));
    dbb_loop.start(); return () => dbb_loop.stop();
  }, [dbb_pulse]);
  return <LinearGradient colors={['#283887','#483298','#8C48AB']} start={{x:0,y:0}} end={{x:1,y:1}} style={dbb_styles.hero}>
    <View style={{ position: 'absolute', right: -78, top: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: '#D095FF25' }} />
    <View style={{ position: 'absolute', right: 55, bottom: -75, width: 160, height: 160, borderRadius: 80, backgroundColor: '#77ECFF20' }} />
    <Dbb_Pill dbb_label="ANKARA'DA AKILLI ALIŞVERİŞ" dbb_tone="mint" />
    <Text style={{ color: 'white', fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -.9, maxWidth: 290 }}>Ne almak{ '\n' }istiyorsun?</Text>
    <Text style={{ color: '#E5E1FF', fontSize: 14, lineHeight: 21, maxWidth: 270 }}>Sen söyle. Biz mağazaları ve kurye rotasını birlikte hesaplayalım.</Text>
    <Pressable onPress={dbb_onSearch} style={dbb_styles.heroSearch} accessibilityRole="button">
      <Ionicons name="search" size={21} color={dbb_theme.purple} />
      <Text style={{ color: '#6A7194', flex: 1, fontWeight: '600' }}>Coca-Cola 2,5 L ara...</Text>
      <Animated.View style={{ transform: [{ scale: dbb_pulse.interpolate({inputRange:[0,1],outputRange:[.9,1.1]}) }] }}>
        <Ionicons name="arrow-forward-circle" size={28} color={dbb_theme.purple} /></Animated.View>
    </Pressable>
  </LinearGradient>;
}

export const dbb_styles = StyleSheet.create({
  card: { backgroundColor: dbb_theme.panel, borderRadius: 22, borderWidth: 1, borderColor: dbb_theme.line, padding: 18, gap: 12 },
  sectionTitle: { color: dbb_theme.text, fontSize: 23, fontWeight: '900', letterSpacing: -.5 },
  caption: { color: dbb_theme.muted, fontSize: 12, lineHeight: 18 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 16 },
  buttonText: { color: '#0D1327', fontWeight: '900', fontSize: 14 },
  ghostButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: dbb_theme.line, backgroundColor: '#1A2037' },
  ghostText: { color: dbb_theme.text, fontWeight: '700', fontSize: 13 },
  hero: { borderRadius: 28, padding: 24, gap: 19, overflow: 'hidden', minHeight: 316, justifyContent: 'space-between', borderWidth: 1, borderColor: '#A39EFF55' },
  heroSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8F8FF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, minHeight: 57 },
  input: { backgroundColor: '#171D33', color: dbb_theme.text, borderWidth: 1, borderColor: dbb_theme.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { color: dbb_theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -.7 },
  itemTitle: { color: dbb_theme.text, fontSize: 16, fontWeight: '800' },
  muted: { color: dbb_theme.muted, fontSize: 12, lineHeight: 18 },
  price: { color: dbb_theme.mint, fontSize: 18, fontWeight: '900' },
  divider: { height: 1, backgroundColor: dbb_theme.line }
});

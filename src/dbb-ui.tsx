import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const dbb_theme = { bg: '#0C211B', panel: '#163329', line: '#315747', text: '#F7F7EE', muted: '#B6CBBB',
  purple: '#8DD19B', mint: '#71E7AB', yellow: '#FFD37A', pink: '#FF997E', blue: '#A5DAD1' };

export function Dbb_Pill({ dbb_label, dbb_tone = 'purple' }: { dbb_label: string; dbb_tone?: 'purple' | 'mint' | 'pink' | 'yellow' }) {
  const dbb_color = { purple: dbb_theme.purple, mint: dbb_theme.mint, pink: dbb_theme.pink, yellow: dbb_theme.yellow }[dbb_tone];
  return <View style={{ backgroundColor: `${dbb_color}18`, borderColor: `${dbb_color}66`, borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 11, paddingVertical: 6, alignSelf: 'flex-start' }}><Text style={{ color: dbb_color, fontSize: 10, fontWeight: '900', letterSpacing: .7 }}>{dbb_label}</Text></View>;
}

export function Dbb_Card({ children, dbb_style }: { children: React.ReactNode; dbb_style?: object }) {
  return <View style={[dbb_styles.card, dbb_style]}>{children}</View>;
}

export function Dbb_Button({ dbb_title, dbb_onPress, dbb_icon, dbb_kind = 'primary', dbb_disabled = false }: {
  dbb_title: string; dbb_onPress: () => void; dbb_icon?: keyof typeof Ionicons.glyphMap;
  dbb_kind?: 'primary' | 'ghost' | 'mint' | 'danger'; dbb_disabled?: boolean;
}) {
  const dbb_color = dbb_kind === 'danger' ? dbb_theme.pink : dbb_kind === 'mint' ? dbb_theme.mint : dbb_theme.yellow;
  return <Pressable onPress={dbb_onPress} disabled={dbb_disabled} accessibilityRole="button" accessibilityLabel={dbb_title}
    style={({ pressed }) => [{ opacity: dbb_disabled ? .48 : pressed ? .76 : 1, borderRadius: 15, overflow: 'hidden' }]}>
    <View style={dbb_kind === 'ghost' ? dbb_styles.ghostButton : [dbb_styles.button, { backgroundColor: dbb_color }]}>
      {dbb_icon && <Ionicons name={dbb_icon} size={18} color={dbb_kind === 'ghost' ? dbb_theme.text : '#15362A'} />}
      <Text style={dbb_kind === 'ghost' ? dbb_styles.ghostText : dbb_styles.buttonText}>{dbb_title}</Text>
    </View>
  </Pressable>;
}

export function Dbb_Section({ dbb_title, dbb_caption, children }: { dbb_title: string; dbb_caption?: string; children: React.ReactNode }) {
  return <View style={{ gap: 14 }}><View style={{ gap: 4 }}><Text style={dbb_styles.sectionTitle}>{dbb_title}</Text>
    {dbb_caption && <Text style={dbb_styles.caption}>{dbb_caption}</Text>}</View>{children}</View>;
}

export function Dbb_Hero({ dbb_onSearch }: { dbb_onSearch: () => void }) {
  return <View style={dbb_styles.hero}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Dbb_Pill dbb_label="ANKARA MARKET" dbb_tone="yellow" />
      <Ionicons name="leaf" color={dbb_theme.yellow} size={26} />
    </View>
    <Text style={{ color: dbb_theme.text, fontSize: 34, lineHeight: 39, fontWeight: '900', letterSpacing: -.8 }}>Ne almak istiyorsun?</Text>
    <Text style={{ color: '#D5E8CE', fontSize: 14, lineHeight: 21 }}>Marketi, ürün fiyatını ve kurye ücretini birlikte karşılaştır.</Text>
    <Pressable onPress={dbb_onSearch} style={dbb_styles.heroSearch} accessibilityRole="button">
      <Ionicons name="search" size={21} color="#285E42" />
      <Text style={{ color: '#596C5C', flex: 1, fontWeight: '600' }}>Ürün, marka veya barkod ara</Text>
      <Ionicons name="arrow-forward" size={20} color="#285E42" />
    </Pressable>
  </View>;
}

export const dbb_styles = StyleSheet.create({
  card: { backgroundColor: dbb_theme.panel, borderRadius: 21, borderWidth: 1, borderColor: dbb_theme.line, padding: 17, gap: 12 },
  sectionTitle: { color: dbb_theme.text, fontSize: 23, fontWeight: '900', letterSpacing: -.4 },
  caption: { color: dbb_theme.muted, fontSize: 12, lineHeight: 18 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 15 },
  buttonText: { color: '#15362A', fontWeight: '900', fontSize: 14 },
  ghostButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 15, borderWidth: 1, borderColor: dbb_theme.line, backgroundColor: '#203C30' },
  ghostText: { color: dbb_theme.text, fontWeight: '700', fontSize: 13 },
  hero: { borderRadius: 25, padding: 22, gap: 20, backgroundColor: '#245B3B', minHeight: 265, justifyContent: 'space-between', borderWidth: 1, borderColor: '#6EAA66' },
  heroSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F3F6E9', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, minHeight: 54 },
  input: { backgroundColor: '#10261F', color: dbb_theme.text, borderWidth: 1, borderColor: dbb_theme.line, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { color: dbb_theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -.7 },
  itemTitle: { color: dbb_theme.text, fontSize: 16, fontWeight: '800' },
  muted: { color: dbb_theme.muted, fontSize: 12, lineHeight: 18 },
  price: { color: dbb_theme.mint, fontSize: 18, fontWeight: '900' },
  divider: { height: 1, backgroundColor: dbb_theme.line }
});

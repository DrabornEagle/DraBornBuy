import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const dbb_theme = { bg: '#0D1428', panel: '#192443', line: '#34446B', text: '#FFFFFF', muted: '#B4C3DA',
  purple: '#BB9EFF', mint: '#65E3C4', yellow: '#FFD36A', pink: '#FF8DA7', blue: '#89BCFF' };

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
      {dbb_icon && <Ionicons name={dbb_icon} size={18} color={dbb_kind === 'ghost' ? dbb_theme.text : '#18233D'} />}
      <Text style={dbb_kind === 'ghost' ? dbb_styles.ghostText : dbb_styles.buttonText}>{dbb_title}</Text>
    </View>
  </Pressable>;
}

export function Dbb_Section({ dbb_title, dbb_caption, children }: { dbb_title: string; dbb_caption?: string; children: React.ReactNode }) {
  return <View style={{ gap: 14 }}><View style={{ gap: 4 }}><Text style={dbb_styles.sectionTitle}>{dbb_title}</Text>
    {dbb_caption && <Text style={dbb_styles.caption}>{dbb_caption}</Text>}</View>{children}</View>;
}

export function Dbb_Hero({ dbb_onSearch }: { dbb_onSearch: () => void }) {
  return <LinearGradient colors={['#5B5BF5','#8958E9','#FB7895']} start={{x:0,y:0}} end={{x:1,y:1}} style={dbb_styles.hero}>
    <View style={{ flexDirection:'row',alignItems:'center',justifyContent:'space-between' }}>
      <View style={{backgroundColor:'#FFFFFF30',paddingHorizontal:12,paddingVertical:7,borderRadius:20}}><Text style={{color:'white',fontWeight:'900',fontSize:11,letterSpacing:.8}}>ANKARA · AKILLI ALIŞVERİŞ</Text></View>
      <Ionicons name="bag-handle" color="white" size={27} />
    </View>
    <View style={{gap:9}}><Text style={{color:'white',fontSize:34,lineHeight:39,fontWeight:'900',letterSpacing:-1}}>Ne almak istiyorsun?</Text>
      <Text style={{color:'#F1EBFF',fontSize:14,lineHeight:21}}>Ürünü bul, sepetini kur. Fiyatları ve teslimatı birlikte hesaplayalım.</Text></View>
    <Pressable onPress={dbb_onSearch} style={dbb_styles.heroSearch} accessibilityRole="button" accessibilityLabel="Ürün ara">
      <Ionicons name="search" size={22} color="#5556CD" /><Text style={{color:'#5B6588',flex:1,fontWeight:'700'}}>Ürün, marka veya barkod ara</Text>
      <Ionicons name="arrow-forward-circle" size={26} color="#6F58E9" />
    </Pressable>
  </LinearGradient>;
}

export const dbb_styles = StyleSheet.create({
  card: { backgroundColor: dbb_theme.panel, borderRadius: 22, borderWidth: 1, borderColor: dbb_theme.line, padding: 17, gap: 12 },
  sectionTitle: { color: dbb_theme.text, fontSize: 23, fontWeight: '900', letterSpacing: -.4 },
  caption: { color: dbb_theme.muted, fontSize: 12, lineHeight: 18 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 15 },
  buttonText: { color: '#18233D', fontWeight: '900', fontSize: 14 },
  ghostButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 15, borderWidth: 1, borderColor: dbb_theme.line, backgroundColor: '#243253' },
  ghostText: { color: dbb_theme.text, fontWeight: '700', fontSize: 13 },
  hero: { borderRadius: 27, padding: 23, gap: 25, minHeight: 270, justifyContent: 'space-between', overflow:'hidden' },
  heroSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, minHeight: 58 },
  input: { backgroundColor: '#111B35', color: dbb_theme.text, borderWidth: 1, borderColor: dbb_theme.line, borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { color: dbb_theme.text, fontSize: 28, fontWeight: '900', letterSpacing: -.7 },
  itemTitle: { color: dbb_theme.text, fontSize: 16, fontWeight: '800' },
  muted: { color: dbb_theme.muted, fontSize: 12, lineHeight: 18 },
  price: { color: dbb_theme.mint, fontSize: 18, fontWeight: '900' },
  divider: { height: 1, backgroundColor: dbb_theme.line }
});

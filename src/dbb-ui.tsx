import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const dbb_theme = { bg: '#F7F7FC', panel: '#24264F', line: '#DDE2F0', text: '#FFFFFF', muted: '#BFC8E2',
  purple: '#8671FF', mint: '#6EA7FF', yellow: '#FFCA65', pink: '#FF7899', blue: '#67D5EA' };

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
  const dbb_color = dbb_kind === 'danger' ? dbb_theme.pink : dbb_kind === 'mint' ? dbb_theme.blue : dbb_theme.yellow;
  return <Pressable onPress={dbb_onPress} disabled={dbb_disabled} accessibilityRole="button" accessibilityLabel={dbb_title}
    style={({ pressed }) => [{ opacity: dbb_disabled ? .48 : pressed ? .76 : 1, borderRadius: 15, overflow: 'hidden' }]}>
    <View style={dbb_kind === 'ghost' ? dbb_styles.ghostButton : [dbb_styles.button, { backgroundColor: dbb_color }]}>
      {dbb_icon && <Ionicons name={dbb_icon} size={18} color={dbb_kind === 'ghost' ? '#282C57' : '#24264F'} />}
      <Text style={dbb_kind === 'ghost' ? dbb_styles.ghostText : dbb_styles.buttonText}>{dbb_title}</Text>
    </View>
  </Pressable>;
}

export function Dbb_Section({ dbb_title, dbb_caption, children }: { dbb_title: string; dbb_caption?: string; children: React.ReactNode }) {
  return <View style={{ gap: 14 }}><View style={{ gap: 4 }}><Text style={dbb_styles.sectionTitle}>{dbb_title}</Text>
    {dbb_caption && <Text style={dbb_styles.caption}>{dbb_caption}</Text>}</View>{children}</View>;
}

export function Dbb_Hero({ dbb_onSearch }: { dbb_onSearch: () => void }) {
  return <LinearGradient colors={['#3F4ACD','#765BE5','#F17C94']} start={{x:0,y:0}} end={{x:1,y:1}} style={dbb_styles.hero}>
    <View style={{ flexDirection:'row',alignItems:'center',justifyContent:'space-between' }}>
      <View style={{backgroundColor:'#FFFFFF32',paddingHorizontal:12,paddingVertical:7,borderRadius:20}}><Text style={{color:'white',fontWeight:'900',fontSize:11,letterSpacing:.8}}>ANKARA · AKILLI ALIŞVERİŞ</Text></View>
      <View style={{flexDirection:'row',gap:5}}>{(['nutrition','basket','pricetag'] as const).map((dbb_icon,dbb_index)=><View key={dbb_icon} style={{width:33,height:33,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:['#FA6758','#F9CC65','#276FBA'][dbb_index]}}><Ionicons name={dbb_icon} size={17} color="white" /></View>)}</View>
    </View>
    <View style={{gap:9}}><Text style={{color:'white',fontSize:36,lineHeight:41,fontWeight:'900',letterSpacing:-1}}>Ne almak istiyorsun?</Text>
      <Text style={{color:'#F9F0FF',fontSize:14,lineHeight:21}}>Ürünleri keşfet, fiyatları gör, sepetini oluştur.</Text></View>
    <Pressable onPress={dbb_onSearch} style={dbb_styles.heroSearch} accessibilityRole="button" accessibilityLabel="Ürün ara">
      <Ionicons name="search" size={22} color="#6354D3" /><Text style={{color:'#69708E',flex:1,fontWeight:'700'}}>Ürün, marka veya barkod ara</Text>
      <Ionicons name="arrow-forward-circle" size={26} color="#EE7651" />
    </Pressable>
  </LinearGradient>;
}

export const dbb_styles = StyleSheet.create({
  card: { backgroundColor: dbb_theme.panel, borderRadius: 22, borderWidth: 1, borderColor: '#454978', padding: 17, gap: 12 },
  sectionTitle: { color: '#22254C', fontSize: 23, fontWeight: '900', letterSpacing: -.4 },
  caption: { color: '#6C7592', fontSize: 12, lineHeight: 18 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 15 },
  buttonText: { color: '#24264F', fontWeight: '900', fontSize: 14 },
  ghostButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 15, borderWidth: 1, borderColor: '#DADDF0', backgroundColor: '#FFFFFF' },
  ghostText: { color: '#282C57', fontWeight: '800', fontSize: 13 },
  hero: { borderRadius: 28, padding: 23, gap: 26, minHeight: 272, justifyContent: 'space-between', overflow:'hidden', borderWidth:1, borderColor:'#B7A8EF' },
  heroSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15, minHeight: 58 },
  input: { backgroundColor: '#F9FAFF', color: '#20254D', borderWidth: 1, borderColor: '#C9CDE2', borderRadius: 13, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { color: '#22254C', fontSize: 28, fontWeight: '900', letterSpacing: -.7 },
  itemTitle: { color: dbb_theme.text, fontSize: 16, fontWeight: '800' },
  muted: { color: dbb_theme.muted, fontSize: 12, lineHeight: 18 },
  price: { color: dbb_theme.mint, fontSize: 18, fontWeight: '900' },
  divider: { height: 1, backgroundColor: dbb_theme.line }
});

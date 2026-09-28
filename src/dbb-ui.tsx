import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const dbb_theme = {
  bg: '#FFF7F2',
  panel: '#102C43',
  line: '#EADFD8',
  text: '#FFFFFF',
  muted: '#BFD9DC',
  purple: '#7568F2',
  mint: '#42D7C7',
  yellow: '#FFC667',
  pink: '#FF6F91',
  blue: '#35BFEA',
  coral: '#FF725E',
  navy: '#102C43',
  sand: '#FFF0E6'
};

export function Dbb_Pill({ dbb_label, dbb_tone = 'purple' }: { dbb_label: string; dbb_tone?: 'purple' | 'mint' | 'pink' | 'yellow' }) {
  const dbb_color = { purple: dbb_theme.purple, mint: dbb_theme.mint, pink: dbb_theme.pink, yellow: dbb_theme.yellow }[dbb_tone];
  return <View style={{ backgroundColor: `${dbb_color}20`, borderColor: `${dbb_color}88`, borderWidth: 1, borderRadius: 24,
    paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' }}><Text style={{ color: dbb_color, fontSize: 10, fontWeight: '900', letterSpacing: .8 }}>{dbb_label}</Text></View>;
}

export function Dbb_Card({ children, dbb_style }: { children: React.ReactNode; dbb_style?: object }) {
  return <View style={[dbb_styles.card, dbb_style]}>{children}</View>;
}

export function Dbb_Button({ dbb_title, dbb_onPress, dbb_icon, dbb_kind = 'primary', dbb_disabled = false }: {
  dbb_title: string; dbb_onPress: () => void; dbb_icon?: keyof typeof Ionicons.glyphMap;
  dbb_kind?: 'primary' | 'ghost' | 'mint' | 'danger'; dbb_disabled?: boolean;
}) {
  const dbb_icon_color = dbb_kind === 'ghost' ? dbb_theme.navy : dbb_theme.navy;
  const dbb_gradient = dbb_kind === 'danger' ? ['#FF6A88','#FF725E'] as const :
    dbb_kind === 'mint' ? ['#48DDD0','#37C8E8'] as const : ['#FFBF62','#FF806E'] as const;
  return <Pressable onPress={dbb_onPress} disabled={dbb_disabled} accessibilityRole="button" accessibilityLabel={dbb_title}
    style={({ pressed }) => [{ opacity: dbb_disabled ? .45 : pressed ? .78 : 1, borderRadius: 17, overflow: 'hidden' }]}>
    {dbb_kind === 'ghost' ? <View style={dbb_styles.ghostButton}>
      {dbb_icon && <Ionicons name={dbb_icon} size={18} color={dbb_icon_color} />}
      <Text style={dbb_styles.ghostText}>{dbb_title}</Text>
    </View> : <LinearGradient colors={dbb_gradient} start={{x:0,y:.5}} end={{x:1,y:.5}} style={dbb_styles.button}>
      {dbb_icon && <Ionicons name={dbb_icon} size={18} color={dbb_icon_color} />}
      <Text style={dbb_styles.buttonText}>{dbb_title}</Text>
    </LinearGradient>}
  </Pressable>;
}

export function Dbb_Section({ dbb_title, dbb_caption, children }: { dbb_title: string; dbb_caption?: string; children: React.ReactNode }) {
  return <View style={{ gap: 14 }}><View style={{ gap: 4 }}><Text style={dbb_styles.sectionTitle}>{dbb_title}</Text>
    {dbb_caption && <Text style={dbb_styles.caption}>{dbb_caption}</Text>}</View>{children}</View>;
}

export function Dbb_Hero({ dbb_onSearch }: { dbb_onSearch: () => void }) {
  return <LinearGradient colors={['#0FC8C2','#39BDE7','#766DF2','#FF6D91','#FFAE65']} locations={[0,.24,.5,.76,1]}
    start={{x:0,y:0}} end={{x:1,y:1}} style={dbb_styles.hero}>
    <View pointerEvents="none" style={{position:'absolute',width:150,height:150,borderRadius:75,backgroundColor:'#FFFFFF18',right:-40,top:-54}} />
    <View pointerEvents="none" style={{position:'absolute',width:110,height:110,borderRadius:55,backgroundColor:'#FFD17025',left:-35,bottom:-42}} />
    <View style={{ flexDirection:'row',alignItems:'center',justifyContent:'space-between' }}>
      <View style={{backgroundColor:'#0C274E55',paddingHorizontal:12,paddingVertical:7,borderRadius:20,borderWidth:1,borderColor:'#FFFFFF33'}}>
        <Text style={{color:'white',fontWeight:'900',fontSize:10,letterSpacing:.9}}>MIAMI MARKET · ANKARA</Text>
      </View>
      <View style={{flexDirection:'row',gap:6}}>{(['sunny','basket','pricetag'] as const).map((dbb_icon,dbb_index)=><View key={dbb_icon}
        style={{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center',backgroundColor:['#FF765F','#FFD067','#19C9C1'][dbb_index],borderWidth:1,borderColor:'#FFFFFF55'}}>
        <Ionicons name={dbb_icon} size={17} color="#102C43" /></View>)}</View>
    </View>
    <View style={{gap:9}}><Text style={{color:'white',fontSize:37,lineHeight:41,fontWeight:'900',letterSpacing:-1.2}}>Sepetini akıllı kur.</Text>
      <Text style={{color:'#FFF8F7',fontSize:14,lineHeight:21,fontWeight:'600'}}>Yalnızca güncel kaynakta stokta görünen ürünleri keşfet, fiyatını gör ve sepete ekle.</Text></View>
    <Pressable onPress={dbb_onSearch} style={dbb_styles.heroSearch} accessibilityRole="button" accessibilityLabel="Ürün ara">
      <View style={{width:37,height:37,borderRadius:13,backgroundColor:'#E8FBF9',alignItems:'center',justifyContent:'center'}}><Ionicons name="search" size={21} color="#10AAA8" /></View>
      <Text style={{color:'#647083',flex:1,fontWeight:'800'}}>Ürün, marka veya barkod ara</Text>
      <Ionicons name="arrow-forward-circle" size={27} color="#FF725E" />
    </Pressable>
  </LinearGradient>;
}

export const dbb_styles = StyleSheet.create({
  card: { backgroundColor: dbb_theme.panel, borderRadius: 24, borderWidth: 1, borderColor: '#23516A', padding: 17, gap: 12,
    shadowColor:'#102C43',shadowOpacity:.08,shadowRadius:12,shadowOffset:{width:0,height:5},elevation:2 },
  sectionTitle: { color: '#15314B', fontSize: 23, fontWeight: '900', letterSpacing: -.55 },
  caption: { color: '#687689', fontSize: 12, lineHeight: 18 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 17, minHeight:50 },
  buttonText: { color: '#102C43', fontWeight: '900', fontSize: 14 },
  ghostButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 17,
    borderWidth: 1, borderColor: '#E7DCD7', backgroundColor: '#FFFFFF', minHeight:50 },
  ghostText: { color: '#17344D', fontWeight: '900', fontSize: 13 },
  hero: { borderRadius: 30, padding: 23, gap: 25, minHeight: 282, justifyContent: 'space-between', overflow:'hidden', borderWidth:1,borderColor:'#FFFFFFAA',
    shadowColor:'#5A65B5',shadowOpacity:.18,shadowRadius:20,shadowOffset:{width:0,height:9},elevation:4 },
  heroSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFFF5', borderRadius: 19, paddingHorizontal: 12, paddingVertical: 11, minHeight: 61,
    borderWidth:1,borderColor:'#FFFFFF' },
  input: { backgroundColor: '#FFFDFC', color: '#15314B', borderWidth: 1, borderColor: '#E3D7D2', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 13, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { color: '#15314B', fontSize: 28, fontWeight: '900', letterSpacing: -.8 },
  itemTitle: { color: dbb_theme.text, fontSize: 16, fontWeight: '900' },
  muted: { color: dbb_theme.muted, fontSize: 12, lineHeight: 18 },
  price: { color: dbb_theme.mint, fontSize: 18, fontWeight: '900' },
  divider: { height: 1, backgroundColor: '#2D5267' }
});

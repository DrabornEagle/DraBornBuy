import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const dbb_theme = {
  bg: '#071D21', panel: '#102F34', line: '#2F6462', text: '#FFFDF7', muted: '#BBD3CC',
  purple: '#C59CFF', mint: '#70F0B3', yellow: '#FFD166', pink: '#FF7D86', blue: '#76CCFF',
  green: '#16B978', lime: '#B7E55B', orange: '#FF8A5B', cream: '#FFF5D8'
};

export function Dbb_Pill({ dbb_label, dbb_tone = 'purple' }: { dbb_label: string; dbb_tone?: 'purple' | 'mint' | 'pink' | 'yellow' }) {
  const dbb_color = { purple: dbb_theme.purple, mint: dbb_theme.mint, pink: dbb_theme.pink, yellow: dbb_theme.yellow }[dbb_tone];
  return <View style={{ backgroundColor: `${dbb_color}1F`, borderColor: `${dbb_color}88`, borderWidth: 1, borderRadius: 22,
    paddingHorizontal: 12, paddingVertical: 7, alignSelf: 'flex-start' }}>
    <Text style={{ color: dbb_color, fontSize: 10, fontWeight: '900', letterSpacing: .8 }}>{dbb_label}</Text>
  </View>;
}

export function Dbb_Card({ children, dbb_style }: { children: React.ReactNode; dbb_style?: object }) {
  return <View style={[dbb_styles.card, dbb_style]}>
    <View pointerEvents="none" style={dbb_styles.cardGlow} />
    {children}
  </View>;
}

export function Dbb_Button({ dbb_title, dbb_onPress, dbb_icon, dbb_kind = 'primary', dbb_disabled = false }: {
  dbb_title: string; dbb_onPress: () => void; dbb_icon?: keyof typeof Ionicons.glyphMap;
  dbb_kind?: 'primary' | 'ghost' | 'mint' | 'danger'; dbb_disabled?: boolean;
}) {
  const dbb_gradient = dbb_kind === 'danger' ? ['#FF927C','#FF667C'] : dbb_kind === 'mint' ? ['#68F0BE','#A7E96B'] : ['#FFD878','#FFB95E'];
  return <Pressable onPress={dbb_onPress} disabled={dbb_disabled} accessibilityRole="button" accessibilityLabel={dbb_title}
    style={({ pressed }) => [{ opacity: dbb_disabled ? .42 : 1, borderRadius: 18, overflow: 'hidden', transform: [{ scale: pressed ? .975 : 1 }] }]}>
    {dbb_kind === 'ghost' ? <View style={dbb_styles.ghostButton}>
      {dbb_icon && <Ionicons name={dbb_icon} size={19} color={dbb_theme.text} />}
      <Text style={dbb_styles.ghostText}>{dbb_title}</Text>
    </View> : <LinearGradient colors={dbb_gradient as [string,string]} start={{x:0,y:0}} end={{x:1,y:1}} style={dbb_styles.button}>
      {dbb_icon && <Ionicons name={dbb_icon} size={19} color="#123B31" />}
      <Text style={dbb_styles.buttonText}>{dbb_title}</Text>
    </LinearGradient>}
  </Pressable>;
}

export function Dbb_Section({ dbb_title, dbb_caption, children }: { dbb_title: string; dbb_caption?: string; children: React.ReactNode }) {
  return <View style={{ gap: 14 }}><View style={{ gap: 5 }}>
    <Text style={dbb_styles.sectionTitle}>{dbb_title}</Text>
    {dbb_caption && <Text style={dbb_styles.caption}>{dbb_caption}</Text>}
  </View>{children}</View>;
}

export function Dbb_Hero({ dbb_onSearch }: { dbb_onSearch: () => void }) {
  const dbb_float = useRef(new Animated.Value(0)).current;
  const dbb_pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const dbb_float_loop = Animated.loop(Animated.sequence([
      Animated.timing(dbb_float,{toValue:1,duration:1800,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
      Animated.timing(dbb_float,{toValue:0,duration:1800,easing:Easing.inOut(Easing.sin),useNativeDriver:true})
    ]));
    const dbb_pulse_loop = Animated.loop(Animated.sequence([
      Animated.timing(dbb_pulse,{toValue:1,duration:1100,easing:Easing.inOut(Easing.quad),useNativeDriver:true}),
      Animated.timing(dbb_pulse,{toValue:0,duration:1100,easing:Easing.inOut(Easing.quad),useNativeDriver:true})
    ]));
    dbb_float_loop.start(); dbb_pulse_loop.start();
    return () => { dbb_float_loop.stop(); dbb_pulse_loop.stop(); };
  }, [dbb_float,dbb_pulse]);
  const dbb_float_y = dbb_float.interpolate({inputRange:[0,1],outputRange:[0,-8]});
  const dbb_pulse_scale = dbb_pulse.interpolate({inputRange:[0,1],outputRange:[1,1.08]});

  return <LinearGradient colors={['#0B8A67','#16B978','#9BD94C']} start={{x:0,y:0}} end={{x:1,y:1}} style={dbb_styles.hero}>
    <Animated.View pointerEvents="none" style={[dbb_styles.heroOrb,{transform:[{translateY:dbb_float_y}]}]} />
    <View style={{ flexDirection:'row',alignItems:'center',justifyContent:'space-between',zIndex:2 }}>
      <View style={dbb_styles.marketChip}><Ionicons name="storefront" size={14} color="#123B31" />
        <Text style={{color:'#123B31',fontWeight:'900',fontSize:10,letterSpacing:.85}}>ANKARA · CANLI MARKET</Text></View>
      <Animated.View style={{flexDirection:'row',gap:6,transform:[{scale:dbb_pulse_scale}]}}>
        {(['nutrition','basket','pricetag'] as const).map((dbb_icon,dbb_index)=><View key={dbb_icon} style={[dbb_styles.heroIcon,{backgroundColor:['#FF6B61','#FFD166','#356FCB'][dbb_index]}]}>
          <Ionicons name={dbb_icon} size={17} color="white" />
        </View>)}
      </Animated.View>
    </View>
    <View style={{gap:9,zIndex:2}}><Text style={dbb_styles.heroTitle}>Ne almak{`\n`}istiyorsun?</Text>
      <Text style={dbb_styles.heroCaption}>Market rafları cebinde. Ürünü ara, fiyatı gör, sepetini saniyeler içinde hazırla.</Text></View>
    <Pressable onPress={dbb_onSearch} style={({pressed})=>[dbb_styles.heroSearch,{transform:[{scale:pressed?.985:1}]}]} accessibilityRole="button" accessibilityLabel="Ürün ara">
      <View style={dbb_styles.searchIcon}><Ionicons name="search" size={21} color="#0F7D60" /></View>
      <Text style={{color:'#526B64',flex:1,fontWeight:'800',fontSize:13}}>Ürün, marka veya barkod ara</Text>
      <LinearGradient colors={['#FF996D','#FF735D']} style={dbb_styles.searchGo}><Ionicons name="arrow-forward" size={20} color="white" /></LinearGradient>
    </Pressable>
    <View style={dbb_styles.heroBadges}>
      <View style={dbb_styles.heroMiniBadge}><Ionicons name="flash" size={13} color="#704E00"/><Text style={dbb_styles.heroMiniText}>Hızlı fiyat</Text></View>
      <View style={dbb_styles.heroMiniBadge}><Ionicons name="location" size={13} color="#704E00"/><Text style={dbb_styles.heroMiniText}>Ankara rota</Text></View>
      <View style={dbb_styles.heroMiniBadge}><Ionicons name="bicycle" size={13} color="#704E00"/><Text style={dbb_styles.heroMiniText}>Kurye teslimat</Text></View>
    </View>
  </LinearGradient>;
}

export const dbb_styles = StyleSheet.create({
  card: { backgroundColor: dbb_theme.panel, borderRadius: 24, borderWidth: 1, borderColor: dbb_theme.line, padding: 18, gap: 12, overflow:'hidden', shadowColor:'#000',shadowOpacity:.18,shadowRadius:16,shadowOffset:{width:0,height:8},elevation:4 },
  cardGlow:{position:'absolute',width:120,height:120,borderRadius:60,backgroundColor:'#70F0B30D',right:-35,top:-45},
  sectionTitle: { color: dbb_theme.text, fontSize: 24, fontWeight: '900', letterSpacing: -.55 },
  caption: { color: dbb_theme.muted, fontSize: 12, lineHeight: 18 },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, paddingHorizontal: 19, paddingVertical: 16, borderRadius: 18, minHeight:54 },
  buttonText: { color: '#123B31', fontWeight: '900', fontSize: 14 },
  ghostButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 15, borderRadius: 18, borderWidth: 1, borderColor: '#37706C', backgroundColor: '#173C41', minHeight:52 },
  ghostText: { color: dbb_theme.text, fontWeight: '800', fontSize: 13 },
  hero: { borderRadius: 32, padding: 23, gap: 22, minHeight: 330, justifyContent: 'space-between', overflow:'hidden', borderWidth:1, borderColor:'#B8F09A', shadowColor:'#1AB37C',shadowOpacity:.25,shadowRadius:20,shadowOffset:{width:0,height:10},elevation:6 },
  heroOrb:{position:'absolute',width:210,height:210,borderRadius:105,backgroundColor:'#FFF4A51C',right:-64,bottom:-70},
  marketChip:{flexDirection:'row',alignItems:'center',gap:6,backgroundColor:'#FFF2BF',paddingHorizontal:12,paddingVertical:8,borderRadius:22,borderWidth:1,borderColor:'#FFFFFF99'},
  heroIcon:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',borderWidth:2,borderColor:'#FFFFFF55'},
  heroTitle:{color:'white',fontSize:40,lineHeight:43,fontWeight:'900',letterSpacing:-1.4,textShadowColor:'#0A5F4938',textShadowOffset:{width:0,height:2},textShadowRadius:8},
  heroCaption:{color:'#F1FFF4',fontSize:14,lineHeight:21,maxWidth:470,fontWeight:'600'},
  heroSearch: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFDF7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 10, minHeight: 64, borderWidth:1,borderColor:'#FFFFFFCC',shadowColor:'#0A5B46',shadowOpacity:.18,shadowRadius:12,shadowOffset:{width:0,height:6},elevation:3,zIndex:2 },
  searchIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center',backgroundColor:'#E7FFF4'},
  searchGo:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center'},
  heroBadges:{flexDirection:'row',gap:7,flexWrap:'wrap',zIndex:2},
  heroMiniBadge:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'#FFE58D',paddingHorizontal:9,paddingVertical:6,borderRadius:14},
  heroMiniText:{color:'#704E00',fontSize:9,fontWeight:'900'},
  input: { backgroundColor: '#0A252B', color: dbb_theme.text, borderWidth: 1, borderColor: '#39716F', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heading: { color: dbb_theme.text, fontSize: 30, fontWeight: '900', letterSpacing: -.85 },
  itemTitle: { color: dbb_theme.text, fontSize: 16, fontWeight: '900' },
  muted: { color: dbb_theme.muted, fontSize: 12, lineHeight: 18 },
  price: { color: dbb_theme.mint, fontSize: 19, fontWeight: '900' },
  divider: { height: 1, backgroundColor: dbb_theme.line }
});

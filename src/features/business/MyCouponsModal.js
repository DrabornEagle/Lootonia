import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import SecondaryButton from '../../components/ui/SecondaryButton';
import { cityLootTheme } from '../../theme/cityLootTheme';
import { useMyCoupons } from '../../hooks/useMyCoupons';

const dkd_colors = cityLootTheme.colors;

function CouponCard({ row, onCopy }) {
  const isRedeemed = String(row?.status || '').toLowerCase() === 'redeemed' || !!row?.redeemed_at;
  const couponCode = row?.coupon_code || '-';

  return (
    <View style={dkd_styles.card}>
      <View style={dkd_styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={dkd_styles.title}>{row?.business_name || 'İşletme'}</Text>
          <Text style={dkd_styles.sub}>{row?.campaign_title || 'Kampanya'} • {row?.reward_label || 'Ödül'}</Text>
        </View>
        <View style={[dkd_styles.pill, isRedeemed ? dkd_styles.pillOff : dkd_styles.pillOn]}>
          <Text style={[dkd_styles.pillText, isRedeemed ? dkd_styles.pillTextOff : dkd_styles.pillTextOn]}>{isRedeemed ? 'Kullanıldı' : 'Hazır'}</Text>
        </View>
      </View>

      <View style={dkd_styles.codeCard}>
        <View style={dkd_styles.codeHead}>
          <View style={dkd_styles.codeTitleRow}>
            <MaterialCommunityIcons name="ticket-confirmation-outline" size={18} color={dkd_colors.goldSoft} />
            <Text style={dkd_styles.codeLabel}>Müşteri kupon kodu</Text>
          </View>
          <Pressable style={dkd_styles.copyBtn} onPress={() => onCopy(couponCode)}>
            <MaterialCommunityIcons name="content-copy" size={14} color={dkd_colors.cyanSoft} />
            <Text style={dkd_styles.copyBtnText}>Kopyala</Text>
          </Pressable>
        </View>

        <View style={dkd_styles.codeWrap}>
          <Text selectable style={dkd_styles.code}>{couponCode}</Text>
        </View>

        <Text style={dkd_styles.meta}>Kasada bu kodu göster. Kod kullanıldıktan sonra tekrar geçmez.</Text>
      </View>

      <View style={dkd_styles.row}><Text style={dkd_styles.key}>Konum</Text><Text style={dkd_styles.val}>{[row?.city, row?.district].filter(Boolean).join(' / ') || '-'}</Text></View>
      <View style={dkd_styles.row}><Text style={dkd_styles.key}>Alındı</Text><Text style={dkd_styles.val}>{String(row?.issued_at || '').replace('T', ' ').slice(0, 16) || '-'}</Text></View>
      <View style={dkd_styles.row}><Text style={dkd_styles.key}>Son kullanma</Text><Text style={dkd_styles.val}>{row?.expires_at ? String(row.expires_at).replace('T', ' ').slice(0, 16) : 'Süre yok'}</Text></View>
    </View>
  );
}

export default function MyCouponsModal({ visible, onClose }) {
  const { loading, message, coupons, refresh } = useMyCoupons(visible);
  const [copyMessage, setCopyMessage] = useState('');

  const handleCopy = useCallback(async (code) => {
    const value = String(code || '').trim();
    if (!value || value === '-') return;
    try {
      await Clipboard.setStringAsync(value);
      setCopyMessage(`Kupon kodu kopyalandı: ${value}`);
    } catch (error) {
      setCopyMessage(error?.message || 'Kupon kodu kopyalanamadı.');
    }
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={dkd_styles.backdrop}>
        <LinearGradient colors={['#07111D', '#091729', '#03070D']} style={dkd_styles.shell}>
          <View style={dkd_styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={dkd_styles.kicker}>PLAYER COUPONS</Text>
              <Text style={dkd_styles.heading}>Kuponlarım</Text>
              <Text style={dkd_styles.desc}>Kazandığın işletme kupon kodları burada durur. Kodu tek dokunuşla kopyalayıp kasada gösterebilirsin.</Text>
            </View>
            <View style={dkd_styles.btnCol}>
              <SecondaryButton label="Yenile" icon="refresh" onPress={refresh} size="compact" fullWidth={false} />
              <SecondaryButton label="Kapat" icon="close" onPress={onClose} size="compact" fullWidth={false} />
            </View>
          </View>
          <ScrollView contentContainerStyle={dkd_styles.content} showsVerticalScrollIndicator={false}>
            {coupons.length ? coupons.map((row) => <CouponCard key={row.id} row={row} onCopy={handleCopy} />) : (
              <View style={dkd_styles.empty}>
                <MaterialCommunityIcons name="ticket-outline" size={24} color={dkd_colors.cyanSoft} />
                <Text style={dkd_styles.emptyTitle}>{loading ? 'Kuponlar yükleniyor' : 'Henüz kuponun yok'}</Text>
                <Text style={dkd_styles.emptyText}>Bağlı işletmede aktif kampanya varken QR sandık açarsan kupon burada görünür.</Text>
              </View>
            )}
            {!!copyMessage ? <View style={dkd_styles.copyMsg}><Text style={dkd_styles.msgText}>{copyMessage}</Text></View> : null}
            {!!message ? <View style={dkd_styles.msg}><Text style={dkd_styles.msgText}>{message}</Text></View> : null}
          </ScrollView>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const dkd_styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(3,8,14,0.85)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  shell: { width: '100%', maxWidth: 760, maxHeight: '92%', borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', padding: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  kicker: { color: dkd_colors.green, fontWeight: '900', fontSize: 11, letterSpacing: 1.6 },
  heading: { color: dkd_colors.text, fontSize: 28, fontWeight: '900', marginTop: 4 },
  desc: { color: dkd_colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 8 },
  btnCol: { gap: 10 },
  content: { paddingTop: 14, paddingBottom: 10, gap: 10 },
  card: { borderRadius: 22, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)', gap: 10 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  title: { color: dkd_colors.text, fontSize: 16, fontWeight: '900' },
  sub: { color: dkd_colors.textSoft, fontSize: 12, marginTop: 4 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  pillOn: { borderColor: 'rgba(88,226,171,0.40)', backgroundColor: 'rgba(88,226,171,0.12)' },
  pillOff: { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.06)' },
  pillText: { fontSize: 11, fontWeight: '900' },
  pillTextOn: { color: dkd_colors.green },
  pillTextOff: { color: dkd_colors.textMuted },
  codeCard: { borderRadius: 18, padding: 12, borderWidth: 1, borderColor: 'rgba(246,197,95,0.22)', backgroundColor: 'rgba(18,20,28,0.92)', gap: 10 },
  codeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  codeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  codeLabel: { color: dkd_colors.text, fontSize: 13, fontWeight: '900' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(103,227,255,0.22)', backgroundColor: 'rgba(103,227,255,0.08)' },
  copyBtnText: { color: dkd_colors.cyanSoft, fontSize: 12, fontWeight: '900' },
  codeWrap: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(246,197,95,0.20)' },
  code: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.1 },
  meta: { color: dkd_colors.textSoft, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  key: { color: dkd_colors.textMuted, fontSize: 12, fontWeight: '800' },
  val: { color: dkd_colors.text, fontSize: 12, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  empty: { borderRadius: 22, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', backgroundColor: 'rgba(255,255,255,0.05)' },
  emptyTitle: { color: dkd_colors.text, fontSize: 16, fontWeight: '900' },
  emptyText: { color: dkd_colors.textSoft, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  copyMsg: { marginTop: 10, borderRadius: 16, padding: 12, backgroundColor: 'rgba(88,226,171,0.10)', borderWidth: 1, borderColor: 'rgba(88,226,171,0.16)' },
  msg: { marginTop: 10, borderRadius: 16, padding: 12, backgroundColor: 'rgba(103,227,255,0.10)', borderWidth: 1, borderColor: 'rgba(103,227,255,0.16)' },
  msgText: { color: '#DFF8FF', fontWeight: '800' },
});

import React from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Pill from '../../components/ui/Pill';
import { skylineCardDesign } from '../../utils/cards';
import { rarityTone } from '../../utils/rarity';
import { trRarity } from '../../utils/text';
import { dkd_make_native_axis_point } from '../../utils/dkdNativeAxis';

function SkylineSilhouette({ seed, palette, windowColor, compact = false }) {
  const dkd_randomize = (dkd_seed_offset) => {
    let dkd_wave_seed = 0;
    const dkd_seed_text = String(seed || 'card');
    for (let dkd_char_index = 0; dkd_char_index < dkd_seed_text.length; dkd_char_index += 1) {
      dkd_wave_seed = ((dkd_wave_seed << 5) - dkd_wave_seed + dkd_seed_text.charCodeAt(dkd_char_index) + dkd_seed_offset * 17) | 0;
    }
    const dkd_wave_value = Math.abs(Math.sin(dkd_wave_seed * 12.9898) * 43758.5453);
    return dkd_wave_value - Math.floor(dkd_wave_value);
  };

  const dkd_towers = Array.from({ length: compact ? 7 : 9 }).map((_, dkd_index_value) => {
    const dkd_tower_width = 18 + Math.floor(dkd_randomize(dkd_index_value + 1) * (compact ? 16 : 22));
    const dkd_tower_height = 36 + Math.floor(dkd_randomize(dkd_index_value + 11) * (compact ? 58 : 90));
    const dkd_left_value = 6 + dkd_index_value * (compact ? 20 : 26) + Math.floor(dkd_randomize(dkd_index_value + 21) * 10);
    const dkd_has_crown = dkd_randomize(dkd_index_value + 31) > 0.65;
    return {
      dkd_index_value,
      dkd_tower_width,
      dkd_tower_height,
      dkd_left_value,
      dkd_has_crown,
    };
  });

  return (
    <View style={{ height: compact ? 108 : 162, borderRadius: compact ? 18 : 22, overflow: 'hidden', backgroundColor: '#060A12' }}>
      <LinearGradient colors={palette} start={dkd_make_native_axis_point(0, 0)} end={dkd_make_native_axis_point(1, 1)} style={{ position: 'absolute', inset: 0 }} />

      <LinearGradient
        colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.00)']}
        start={dkd_make_native_axis_point(0, 0)}
        end={dkd_make_native_axis_point(0.9, 0.4)}
        style={{ position: 'absolute', left: -20, top: -10, width: 180, height: 110, borderRadius: 120, opacity: 0.55 }}
      />

      <View
        style={{
          position: 'absolute',
          right: 18,
          top: 16,
          width: compact ? 42 : 54,
          height: compact ? 42 : 54,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.14)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.18)',
        }}
      />

      {Array.from({ length: compact ? 6 : 8 }).map((_, dkd_index_value) => (
        <View
          key={`grid-${dkd_index_value}`}
          style={{
            position: 'absolute',
            left: -20,
            right: -20,
            top: 22 + dkd_index_value * 18,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.08)',
            transform: [{ skewY: '-10deg' }],
          }}
        />
      ))}

      {dkd_towers.map((dkd_tower) => (
        <View
          key={`tower-${dkd_tower.dkd_index_value}`}
          style={{
            position: 'absolute',
            bottom: 0,
            left: dkd_tower.dkd_left_value,
            width: dkd_tower.dkd_tower_width,
            height: dkd_tower.dkd_tower_height,
            backgroundColor: 'rgba(6,10,18,0.82)',
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.07)',
            overflow: 'hidden',
          }}
        >
          {dkd_tower.dkd_has_crown ? (
            <View
              style={{
                position: 'absolute',
                top: 0,
                alignSelf: 'center',
                width: 10,
                height: 10,
                borderBottomLeftRadius: 5,
                borderBottomRightRadius: 5,
                backgroundColor: 'rgba(255,255,255,0.10)',
              }}
            />
          ) : null}

          {Array.from({ length: 6 }).map((__, dkd_row_index) => (
            <View key={`row-${dkd_tower.dkd_index_value}-${dkd_row_index}`} style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 4 }}>
              {Array.from({ length: Math.max(2, Math.floor(dkd_tower.dkd_tower_width / 9)) }).map((___, dkd_column_index) => (
                <View
                  key={`window-${dkd_tower.dkd_index_value}-${dkd_row_index}-${dkd_column_index}`}
                  style={{
                    width: 4,
                    height: 6,
                    borderRadius: 2,
                    opacity: (dkd_row_index + dkd_column_index + dkd_tower.dkd_index_value) % 2 ? 0.95 : 0.22,
                    backgroundColor: windowColor,
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      ))}

      <LinearGradient
        colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.32)', 'rgba(0,0,0,0.72)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: compact ? 60 : 84 }}
      />
    </View>
  );
}

function CardArtStage({ imageUrl, compact, palette, accent, seed, windowColor }) {
  if (imageUrl) {
    return (
      <View style={{ height: compact ? 108 : 162, borderRadius: compact ? 18 : 22, overflow: 'hidden', backgroundColor: '#060A12' }}>
        <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.00)']} style={{ position: 'absolute', inset: 0 }} />
        <LinearGradient colors={['rgba(5,10,18,0.10)', 'rgba(5,10,18,0.16)', 'rgba(5,10,18,0.78)']} style={{ position: 'absolute', inset: 0 }} />
        <View
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: compact ? 14 : 18,
            borderWidth: 1,
            borderColor: `${accent}55`,
          }}
        />
      </View>
    );
  }

  return <SkylineSilhouette seed={seed} palette={palette} windowColor={windowColor} compact={compact} />;
}

function buildSerialCode({ serialCode, name, series }) {
  if (serialCode) return String(serialCode);
  return `YL-${String((name || 'CARD').replace(/\s+/g, '')).slice(0, 3).toUpperCase()}-${String((series || 'GEN')).slice(0, 2).toUpperCase()}`;
}

function FuturisticCardTile({ name, rarity, series, theme, dropType, compact = false, imageUrl = '', serialCode = '', fillWidth = false }) {
  const dkd_card_design = skylineCardDesign({ rarity, series, theme, dropType, seed: `${name}-${series}-${theme}-${rarity}` });
  const dkd_frame_radius = compact ? 20 : 24;
  const dkd_rarity_text = trRarity(rarity);
  const dkd_serial_text = buildSerialCode({ serialCode, name, series });
  const dkd_image_uri = String(imageUrl || '').trim();

  return (
    <View
      style={[
        {
          borderRadius: dkd_frame_radius,
          padding: compact ? 10 : 14,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: dkd_card_design.accent,
          backgroundColor: 'rgba(7,12,24,0.96)',
          shadowColor: dkd_card_design.accent,
          shadowOpacity: 0.34,
          shadowRadius: compact ? 12 : 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
          minHeight: compact ? 212 : 328,
        },
        compact && !fillWidth ? { width: 210 } : null,
      ]}
    >
      <View style={{ position: 'absolute', inset: 0, backgroundColor: dkd_card_design.glow, opacity: 0.45 }} />
      <LinearGradient
        colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.00)', 'rgba(255,255,255,0.04)']}
        start={dkd_make_native_axis_point(0, 0)}
        end={dkd_make_native_axis_point(1, 1)}
        style={{ position: 'absolute', inset: 0 }}
      />

      <View
        style={{
          position: 'absolute',
          top: -30,
          right: -26,
          width: compact ? 96 : 136,
          height: compact ? 96 : 136,
          borderRadius: 999,
          backgroundColor: dkd_card_design.glow,
          opacity: 0.65,
        }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 8 : 10 }}>
        <Text style={{ color: 'rgba(234,244,255,0.82)', fontSize: compact ? 10 : 11, fontWeight: '900', letterSpacing: 1.1 }}>
          {dkd_serial_text}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: 8 }}>
            <Pill text={dkd_card_design.dropBadge || 'CORE'} tone="default" />
          </View>
          <Pill text={dkd_rarity_text} tone={rarityTone(rarity)} />
        </View>
      </View>

      <View
        style={{
          borderRadius: compact ? 16 : 18,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          backgroundColor: 'rgba(255,255,255,0.04)',
          padding: compact ? 10 : 12,
        }}
      >
        <Text numberOfLines={1} style={{ color: 'rgba(214,236,255,0.74)', fontSize: compact ? 11 : 12, fontWeight: '900', letterSpacing: 0.8 }}>
          {dkd_card_design.icon} {dkd_card_design.series}
        </Text>
        <Text numberOfLines={2} style={{ color: '#FFFFFF', fontWeight: '900', fontSize: compact ? 28 : 34, lineHeight: compact ? 30 : 38, marginTop: 8 }}>
          {name || 'Kart'}
        </Text>
        <Text numberOfLines={1} style={{ color: 'rgba(230,244,255,0.66)', fontSize: compact ? 11 : 12, fontWeight: '800', marginTop: 6 }}>
          {dkd_card_design.theme} • FUTURISTIC SKYLINE EDITION
        </Text>

        <View style={{ marginTop: compact ? 10 : 12 }}>
          <CardArtStage imageUrl={dkd_image_uri} compact={compact} palette={dkd_card_design.bg} accent={dkd_card_design.accent} seed={dkd_card_design.seed} windowColor={dkd_card_design.window} />
        </View>
      </View>

      <View
        style={{
          marginTop: compact ? 10 : 12,
          borderRadius: compact ? 16 : 18,
          padding: compact ? 10 : 12,
          backgroundColor: 'rgba(255,255,255,0.045)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.48)', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>RARITY</Text>
            <Text style={{ color: '#FFFFFF', fontWeight: '900', marginTop: 4 }}>{dkd_rarity_text}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(255,255,255,0.48)', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>SERİ</Text>
            <Text numberOfLines={1} style={{ color: '#FFFFFF', fontWeight: '900', marginTop: 4 }}>{dkd_card_design.series}</Text>
          </View>
        </View>

        {!compact ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.48)', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>TEMA</Text>
              <Text numberOfLines={1} style={{ color: '#FFFFFF', fontWeight: '900', marginTop: 4 }}>{dkd_card_design.theme}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: 'rgba(255,255,255,0.48)', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>SINIF</Text>
              <Text numberOfLines={1} style={{ color: '#FFFFFF', fontWeight: '900', marginTop: 4 }}>{dkd_card_design.artLabel}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default React.memo(FuturisticCardTile);

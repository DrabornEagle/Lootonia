import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { dkd_make_native_axis_point } from "../../utils/dkdNativeAxis";
import { normalizeProgression } from "../../utils/progression";
import AchievementToast from "../achievements/AchievementToast";
import DropDockPanel from "./DropDockPanel";
import PremiumMapMarker, { resolveMarkerAsset } from "./PremiumMapMarker";
import { cityMapStyle } from "../../theme/cityLootTheme";
import { dropAccent, formatNum } from "../../theme/minimalLootUi";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const HOME_IS_COMPACT = SCREEN_W <= 430 || SCREEN_H <= 900;
const HOME_IS_TIGHT = SCREEN_H <= 820;
const STAT_ICON_SIZE = HOME_IS_COMPACT ? 16 : 17;
const FRAME_ICON_SIZE = HOME_IS_COMPACT ? 19 : 20;
const FRAME_ICON_PAIR_SIZE = HOME_IS_COMPACT ? 17 : 18;

function clampText(text, fallback = "Hazır") {
  if (typeof text === "function") {
    try {
      return String(text() || fallback);
    } catch {
      return fallback;
    }
  }
  return String(text || fallback);
}

const UserLocationMarker = memo(function UserLocationMarker() {
  return (
    <View style={styles.userWrap}>
      <View style={styles.userRingOuter} />
      <View style={styles.userRingInner} />
      <View style={styles.userDot} />
    </View>
  );
});

const MapCanvas = memo(function MapCanvas({
  mapRef,
  region,
  markerDrops,
  activeDropId,
  currentLocation,
  onMarkerPress,
  trDropType,
  clamp,
}) {
  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={region}
      showsUserLocation={false}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      scrollEnabled
      zoomEnabled
      customMapStyle={cityMapStyle}
      mapPadding={{ top: 108, right: 14, bottom: 104, left: 14 }}
    >
      {currentLocation?.lat != null && currentLocation?.lng != null ? (
        <Marker
          coordinate={{
            latitude: Number(currentLocation.lat),
            longitude: Number(currentLocation.lng),
          }}
          anchor={dkd_make_native_axis_point(0.5, 0.5)}
          tracksViewChanges
          zIndex={30}
        >
          <UserLocationMarker />
        </Marker>
      ) : null}
      {markerDrops.map(
        ({
          drop: dkd_drop_item,
          near: dkd_is_nearby,
          cooldown: dkd_cooldown_state,
          stroke,
          fill,
        }) => {
          const active = String(activeDropId) === String(dkd_drop_item.id);
          return (
            <React.Fragment key={String(dkd_drop_item.id)}>
              <Marker
                coordinate={{
                  latitude: Number(dkd_drop_item.lat),
                  longitude: Number(dkd_drop_item.lng),
                }}
                title={dkd_drop_item.name}
                description={
                  dkd_drop_item?.has_active_campaign
                    ? `${trDropType(dkd_drop_item.type)} • ${String(dkd_drop_item?.reward_badge_label || "Ödül var")}`
                    : trDropType(dkd_drop_item.type)
                }
                onPress={() =>
                  onMarkerPress(
                    dkd_drop_item,
                    dkd_is_nearby,
                    dkd_cooldown_state,
                  )
                }
                anchor={dkd_make_native_axis_point(0.5, 1)}
                image={resolveMarkerAsset(dkd_drop_item)}
                tracksViewChanges={false}
                zIndex={active ? 12 : 6}
              />
              {dkd_drop_item?.has_active_campaign ? (
                <Marker
                  coordinate={{
                    latitude: Number(dkd_drop_item.lat),
                    longitude: Number(dkd_drop_item.lng),
                  }}
                  anchor={dkd_make_native_axis_point(0.5, 1.58)}
                  tracksViewChanges
                  zIndex={active ? 14 : 8}
                  onPress={() =>
                    onMarkerPress(
                      dkd_drop_item,
                      dkd_is_nearby,
                      dkd_cooldown_state,
                    )
                  }
                >
                  <View style={styles.rewardMapBadge}>
                    <MaterialCommunityIcons
                      name="treasure-chest"
                      size={14}
                      color="#201508"
                    />
                  </View>
                </Marker>
              ) : null}
              {active ? (
                <Marker
                  coordinate={{
                    latitude: Number(dkd_drop_item.lat),
                    longitude: Number(dkd_drop_item.lng),
                  }}
                  anchor={dkd_make_native_axis_point(0.5, 0.5)}
                  tracksViewChanges
                  zIndex={11}
                >
                  <PremiumMapMarker
                    drop={dkd_drop_item}
                    active
                    near={!!dkd_is_nearby?.ok}
                    cooldown={!!dkd_cooldown_state?.isCooldown}
                    showRewardBadge={!!dkd_drop_item?.has_active_campaign}
                  />
                </Marker>
              ) : null}
              <Circle
                center={{
                  latitude: Number(dkd_drop_item.lat),
                  longitude: Number(dkd_drop_item.lng),
                }}
                radius={clamp(dkd_drop_item.radius_m, 20, 500)}
                strokeWidth={active ? 2.5 : 1.2}
                strokeColor={active ? "rgba(99,214,255,0.95)" : stroke}
                fillColor={active ? "rgba(99,214,255,0.10)" : fill}
              />
            </React.Fragment>
          );
        },
      )}
    </MapView>
  );
});

function StatBox({ label, value, icon, tone = "blue" }) {
  const colors =
    tone === "gold"
      ? ["rgba(255,213,108,0.16)", "rgba(255,171,58,0.06)"]
      : tone === "purple"
        ? ["rgba(175,124,255,0.16)", "rgba(103,66,255,0.06)"]
        : ["rgba(99,214,255,0.16)", "rgba(58,105,255,0.06)"];
  return (
    <LinearGradient colors={colors} style={styles.statBox}>
      <MaterialCommunityIcons name={icon} size={STAT_ICON_SIZE} color="#FFF" />
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </LinearGradient>
  );
}

function FrameCard({
  title,
  subtitle,
  icon,
  dkd_icon_secondary = "",
  tone = "blue",
  onPress,
  dkd_is_featured = false,
}) {
  const palette = {
    blue: {
      colors: ["#16243F", "#0E1524"],
      border: "rgba(98,214,255,0.30)",
      glow: "rgba(98,214,255,0.18)",
      icon: "#9FE9FF",
    },
    purple: {
      colors: ["#2A1F46", "#121829"],
      border: "rgba(175,124,255,0.30)",
      glow: "rgba(175,124,255,0.18)",
      icon: "#D6BEFF",
    },
    gold: {
      colors: ["#3A2712", "#1B1520"],
      border: "rgba(255,213,108,0.34)",
      glow: "rgba(255,213,108,0.18)",
      icon: "#FFE39A",
    },
    red: {
      colors: ["#3A1622", "#1A1320"],
      border: "rgba(255,114,145,0.34)",
      glow: "rgba(255,114,145,0.18)",
      icon: "#FFB3C5",
    },
    green: {
      colors: ["#173225", "#101C18"],
      border: "rgba(103,225,155,0.32)",
      glow: "rgba(103,225,155,0.18)",
      icon: "#8CF0BD",
    },
    rose: {
      colors: ["#4B1638", "#1D1221"],
      border: "rgba(255,112,186,0.34)",
      glow: "rgba(255,112,186,0.20)",
      icon: "#FFC0EA",
    },
  };
  const dkd_tone_style = palette[tone] || palette.blue;
  const dkd_float_value = React.useRef(new Animated.Value(0)).current;
  const dkd_glow_value = React.useRef(new Animated.Value(0.65)).current;

  useEffect(() => {
    if (!dkd_is_featured) {
      dkd_float_value.stopAnimation();
      dkd_glow_value.stopAnimation();
      dkd_float_value.setValue(0);
      dkd_glow_value.setValue(0.65);
      return undefined;
    }

    const dkd_float_loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_float_value, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(dkd_float_value, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const dkd_glow_loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_glow_value, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dkd_glow_value, {
          toValue: 0.55,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    dkd_float_loop.start();
    dkd_glow_loop.start();

    return () => {
      dkd_float_loop.stop();
      dkd_glow_loop.stop();
    };
  }, [dkd_float_value, dkd_glow_value, dkd_is_featured]);

  const dkd_featured_wrap_style = dkd_is_featured
    ? {
        transform: [
          {
            translateY: dkd_float_value.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -5],
            }),
          },
          {
            scale: dkd_float_value.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.018],
            }),
          },
        ],
      }
    : null;

  return (
    <Animated.View style={[styles.frameWrap, dkd_featured_wrap_style]}>
      <Pressable onPress={onPress} style={styles.frameTapArea}>
        {dkd_is_featured ? (
          <Animated.View
            style={[
              styles.frameFeatureGlow,
              { backgroundColor: dkd_tone_style.glow, opacity: dkd_glow_value },
            ]}
          />
        ) : null}
        <LinearGradient
          colors={dkd_tone_style.colors}
          style={[styles.frame, { borderColor: dkd_tone_style.border }]}
        >
          <View style={styles.frameTop}>
            <View style={styles.frameTopIcons}>
              <MaterialCommunityIcons
                name={icon}
                size={FRAME_ICON_SIZE}
                color={dkd_tone_style.icon}
              />
              {dkd_icon_secondary ? (
                <MaterialCommunityIcons
                  name={dkd_icon_secondary}
                  size={FRAME_ICON_PAIR_SIZE}
                  color={dkd_tone_style.icon}
                  style={styles.frameTopIconSecondary}
                />
              ) : null}
            </View>
          </View>
          {dkd_is_featured ? (
            <View style={styles.frameFeatureBadge}>
              <MaterialCommunityIcons
                name="motion-play-outline"
                size={12}
                color={dkd_tone_style.icon}
              />
              <Text
                style={[
                  styles.frameFeatureBadgeText,
                  { color: dkd_tone_style.icon },
                ]}
              >
                Canlı
              </Text>
            </View>
          ) : null}
          <Text style={styles.frameTitle}>{title}</Text>
          <Text style={styles.frameSub}>{subtitle}</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function HeaderHUD({
  profile,
  energyUI,
  tokenText,
  walletText,
  onOpenActionMenu,
  onOpenProfile,
}) {
  const prog = useMemo(
    () => normalizeProgression(profile || {}),
    [profile?.level, profile?.xp, profile?.rank_key],
  );
  const nickname = String(profile?.nickname || "Oyuncu");
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  const ticketText = formatNum(profile?.boss_tickets || 0);
  const shardText = formatNum(profile?.shards || 0);
  const energyNow = Number(energyUI?.energy ?? profile?.energy ?? 0);
  const energyMax = Math.max(
    1,
    Number(energyUI?.max ?? profile?.energy_max ?? 20),
  );
  const energyPct = Math.max(
    0,
    Math.min(100, Math.round((energyNow / energyMax) * 100)),
  );
  const energyNextText = String(energyUI?.nextText || "—");
  const energyCountdownText =
    energyNextText === "FULL" ? "Dolu" : energyNextText;
  const dkd_xp_shimmer_value = React.useRef(new Animated.Value(0)).current;
  const dkd_energy_glow_value = React.useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    const dkd_xp_shimmer_loop = Animated.loop(
      Animated.timing(dkd_xp_shimmer_value, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    const dkd_energy_glow_loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_energy_glow_value, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(dkd_energy_glow_value, {
          toValue: 0.7,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    dkd_xp_shimmer_loop.start();
    dkd_energy_glow_loop.start();

    return () => {
      dkd_xp_shimmer_loop.stop();
      dkd_energy_glow_loop.stop();
    };
  }, [dkd_energy_glow_value, dkd_xp_shimmer_value]);

  const dkd_xp_fill_pct = Math.max(8, Math.min(100, prog.progressPct || 0));
  const dkd_profile_avatar_image_url = String(profile?.avatar_image_url || "").trim();
  const dkd_xp_shimmer_style = {
    transform: [
      {
        translateX: dkd_xp_shimmer_value.interpolate({
          inputRange: [0, 1],
          outputRange: [-140, SCREEN_W - 44],
        }),
      },
    ],
  };

  return (
    <LinearGradient
      colors={["rgba(11,16,28,0.96)", "rgba(16,23,38,0.96)"]}
      style={styles.headerShell}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={onOpenProfile} style={styles.identityTap}>
          <View style={styles.avatar}>
            {dkd_profile_avatar_image_url ? (
              <Image
                source={{ uri: dkd_profile_avatar_image_url }}
                style={styles.avatarImage}
                contentFit="cover"
                transition={120}
              />
            ) : (
              <Text style={styles.avatarText}>
                {String(profile?.avatar_emoji || "🦅")}
              </Text>
            )}
          </View>
          <View style={styles.identityWrap}>
            <Text style={styles.headerEyebrow}>LOOTONIA</Text>
            <Text
              style={[
                styles.headerName,
                nickname.length > 14 && styles.headerNameCompact,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {nickname}
            </Text>
            <Text style={styles.headerRank}>
              {String(prog.rankLabel || "Elite").toUpperCase()}
            </Text>
          </View>
        </Pressable>
        <View style={styles.lvlBox}>
          <Text style={styles.lvlMini}>LVL</Text>
          <Text style={styles.lvlValue}>{prog.level}</Text>
        </View>
        <Pressable onPress={onOpenActionMenu} style={styles.menuBtn}>
          <MaterialCommunityIcons name="menu" size={20} color="#FFF" />
        </Pressable>
      </View>

      <View style={styles.progressMeta}>
        <View style={styles.progressMetaTitleWrap}>
          <MaterialCommunityIcons
            name="star-four-points-circle-outline"
            size={14}
            color="#FFE39A"
          />
          <Text style={styles.progressMetaLabel}>XP Akışı</Text>
        </View>
        <View style={styles.progressMetaChip}>
          <Text style={styles.progressMetaValue}>%{prog.progressPct || 0}</Text>
        </View>
      </View>
      <View style={styles.progressLine}>
        <LinearGradient
          colors={["#62D6FF", "#7E86FF", "#C27BFF", "#FF8F70", "#FFD86C"]}
          start={dkd_make_native_axis_point(0, 0.5)}
          end={dkd_make_native_axis_point(1, 0.5)}
          style={[styles.progressFill, { width: `${dkd_xp_fill_pct}%` }]}
        />
        <Animated.View
          pointerEvents="none"
          style={[styles.progressShimmer, dkd_xp_shimmer_style]}
        >
          <LinearGradient
            colors={[
              "rgba(255,255,255,0)",
              "rgba(255,255,255,0.30)",
              "rgba(255,255,255,0)",
            ]}
            start={dkd_make_native_axis_point(0, 0.5)}
            end={dkd_make_native_axis_point(1, 0.5)}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Text style={styles.progressTrackText}>%{prog.progressPct || 0}</Text>
      </View>
      <Text style={styles.progressHint}>
        {prog.isLevelCap
          ? "Maksimum seviye"
          : `${formatNum(prog.levelXp)}/${formatNum(prog.levelGoal)} XP`}
      </Text>

      <Pressable
        style={[styles.energyCard, !energyOpen && styles.energyCardCollapsed]}
        onPress={() =>
          setEnergyOpen((dkd_previous_energy_open) => !dkd_previous_energy_open)
        }
      >
        <LinearGradient
          colors={[
            "rgba(12,24,56,0.98)",
            "rgba(41,17,84,0.96)",
            "rgba(7,72,78,0.94)",
          ]}
          start={dkd_make_native_axis_point(0, 0)}
          end={dkd_make_native_axis_point(1, 1)}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[
            "rgba(108,232,255,0.22)",
            "rgba(183,112,255,0.14)",
            "rgba(120,255,194,0.18)",
          ]}
          start={dkd_make_native_axis_point(0, 0.5)}
          end={dkd_make_native_axis_point(1, 0.5)}
          style={styles.energyAccentLine}
        />
        <Animated.View
          style={[styles.energyGlowOrb, { opacity: dkd_energy_glow_value }]}
        />
        <Animated.View
          style={[styles.energyGlowOrbSecondary, { opacity: dkd_energy_glow_value }]}
        />
        <View style={styles.energyCardRow}>
          <View style={styles.energyCardLeft}>
            <View style={styles.energyIconWrap}>
              <LinearGradient
                colors={[
                  "rgba(99,228,255,0.38)",
                  "rgba(142,120,255,0.24)",
                  "rgba(112,255,206,0.22)",
                ]}
                start={dkd_make_native_axis_point(0, 0)}
                end={dkd_make_native_axis_point(1, 1)}
                style={StyleSheet.absoluteFill}
              />
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={20}
                color="#F6FCFF"
              />
            </View>
            <View style={styles.energyCopy}>
              <Text style={styles.energyLabel}>Enerji</Text>
              <View style={styles.energyValueRow}>
                <Text style={styles.energyValue}>
                  {energyNow}/{energyMax}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.energyCompactMeta}>
            <View style={styles.energyTimerPill}>
              <MaterialCommunityIcons
                name={
                  energyNextText === "FULL"
                    ? "check-circle-outline"
                    : "timer-sand"
                }
                size={14}
                color="#FFE39A"
              />
              <Text style={styles.energyTimerText}>{energyCountdownText}</Text>
            </View>
            <MaterialCommunityIcons
              name={energyOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color="rgba(255,255,255,0.76)"
            />
          </View>
        </View>
      </Pressable>

      <Pressable
        style={styles.resourceToggleBar}
        onPress={() =>
          setResourcesOpen(
            (dkd_previous_resources_open) => !dkd_previous_resources_open,
          )
        }
      >
        <View style={styles.resourcePillRow}>
          <View style={[styles.resourceMiniPill, styles.resourceMiniPillBlue]}>
            <MaterialCommunityIcons
              name="wallet-outline"
              size={15}
              color="#9FE9FF"
            />
            <Text style={styles.resourceMiniValue}>{walletText || "0 TL"}</Text>
          </View>
          <View style={[styles.resourceMiniPill, styles.resourceMiniPillGold]}>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={15}
              color="#FFE39A"
            />
            <Text style={styles.resourceMiniValue}>{tokenText || "0"}</Text>
          </View>
          <View
            style={[styles.resourceMiniPill, styles.resourceMiniPillPurple]}
          >
            <MaterialCommunityIcons
              name="diamond-stone"
              size={15}
              color="#D8C1FF"
            />
            <Text style={styles.resourceMiniValue}>{shardText}</Text>
          </View>
        </View>
        <View style={styles.resourceToggleBtn}>
          <MaterialCommunityIcons
            name={resourcesOpen ? "chevron-up" : "chevron-down"}
            size={20}
            color="#FFF"
          />
        </View>
      </Pressable>

      {resourcesOpen ? (
        <View style={styles.statRow}>
          <StatBox
            label="Cüzdan"
            value={walletText || "0 TL"}
            icon="wallet-outline"
          />
          <StatBox
            label="Token"
            value={tokenText || "0"}
            icon="cash-multiple"
            tone="gold"
          />
          <StatBox
            label="Shard"
            value={shardText}
            icon="diamond-stone"
            tone="purple"
          />
        </View>
      ) : null}
    </LinearGradient>
  );
}

function MissionBoard({
  dockPreview,
  hiddenBossCountToday,
  nextBossReturnText,
  onOpenMap,
  onOpenScanner,
  onOpenDropList,
  onOpenNearestBoss,
  openRewards,
  openCourier,
  onOpenClanHub,
  profile,
  onTabChange,
}) {
  const accent = dropAccent(dockPreview || {});
  const bossText = clampText(nextBossReturnText, "Boss Hazır");
  const dkd_live_map_pulse = React.useRef(new Animated.Value(0)).current;
  const dkd_live_map_shimmer = React.useRef(new Animated.Value(0)).current;
  const dkd_radar_core_value = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const dkd_live_map_pulse_loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_live_map_pulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(dkd_live_map_pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const dkd_live_map_shimmer_loop = Animated.loop(
      Animated.timing(dkd_live_map_shimmer, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );
    const dkd_radar_core_loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_radar_core_value, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(dkd_radar_core_value, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    dkd_live_map_pulse_loop.start();
    dkd_live_map_shimmer_loop.start();
    dkd_radar_core_loop.start();

    return () => {
      dkd_live_map_pulse_loop.stop();
      dkd_live_map_shimmer_loop.stop();
      dkd_radar_core_loop.stop();
    };
  }, [dkd_live_map_pulse, dkd_live_map_shimmer, dkd_radar_core_value]);

  const dkd_action_cards = [
    {
      key: "chests",
      title: "Sandıklar",
      sub: "Yakında ki sandıkları Panelde Gör",
      icon: "treasure-chest-outline",
      tone: "green",
      dkd_is_featured: true,
      onPress: () => onOpenDropList?.(),
    },
    {
      key: "market",
      title: "Market",
      sub: "Vitrine göz at ve takviyeleri aç",
      icon: "storefront-outline",
      tone: "purple",
      dkd_is_featured: true,
      onPress: () => onTabChange?.("market"),
    },
    {
      key: "collection",
      title: "Koleksiyon",
      sub: "Kart albümünü aç",
      icon: "cards-outline",
      tone: "purple",
      onPress: () => onTabChange?.("collection"),
    },
    {
      key: "courier",
      title: "Kurye-Kargo",
      sub: "Kurye-kargo operasyon merkezi",
      icon: "motorbike",
      dkd_icon_secondary: "truck-fast-outline",
      tone: "green",
      onPress: () => openCourier?.(),
    },
    {
      key: "rewards",
      title: "Günlük Ödül",
      sub: "Giriş serisini aç",
      icon: "gift-outline",
      tone: "red",
      onPress: () =>
        typeof openRewards === "function"
          ? openRewards()
          : Alert.alert("Bilgi", "Günlük ödül ekranı şu an açılamadı."),
    },
    {
      key: "clan",
      title: "Lonca",
      sub: "Lonca merkezi ve ekip alanı",
      icon: "shield-crown-outline",
      tone: "gold",
      onPress: () => onOpenClanHub?.(),
    },
    {
      key: "tasks",
      title: "Görevler",
      sub: "Görev akışını aç",
      icon: "clipboard-text-outline",
      tone: "blue",
      onPress: () => onTabChange?.("tasks"),
    },
    {
      key: "ally",
      title: "Sohbet",
      sub: "Ally mesaj ve ekip sohbetini aç",
      icon: "message-badge-outline",
      tone: "rose",
      onPress: () => onTabChange?.("ally"),
    },
  ];

  const hiddenBossText =
    Number(hiddenBossCountToday || 0) > 0
      ? `${formatNum(hiddenBossCountToday || 0)} hedef`
      : "Temiz";
  const dkd_target_type = String(dockPreview?.type || "").toLowerCase();
  const dkd_target_is_boss =
    dkd_target_type === "boss" ||
    dkd_target_type.includes("boss") ||
    String(accent?.icon || "") === "crown-outline";
  const targetTypeText = dkd_target_is_boss ? "Baskın" : accent.title;
  const dkd_live_map_wrap_style = {
    transform: [
      {
        scale: dkd_live_map_pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.03],
        }),
      },
    ],
  };
  const dkd_live_map_glow_style = {
    opacity: dkd_live_map_pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.35, 0.72],
    }),
    transform: [
      {
        scale: dkd_live_map_pulse.interpolate({
          inputRange: [0, 1],
          outputRange: [0.96, 1.08],
        }),
      },
    ],
  };
  const dkd_live_map_shimmer_style = {
    transform: [
      {
        translateX: dkd_live_map_shimmer.interpolate({
          inputRange: [0, 1],
          outputRange: [-160, 220],
        }),
      },
      { rotate: "-18deg" },
    ],
  };
  const dkd_radar_core_shell_style = {
    transform: [
      {
        scale: dkd_radar_core_value.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.08],
        }),
      },
    ],
  };
  const dkd_radar_core_glow_style = {
    opacity: dkd_radar_core_value.interpolate({
      inputRange: [0, 1],
      outputRange: [0.42, 0.82],
    }),
    transform: [
      {
        scale: dkd_radar_core_value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1.12],
        }),
      },
    ],
  };
  const dkd_radar_core_icon_style = {
    transform: [
      {
        scale: dkd_radar_core_value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.98, 1.06],
        }),
      },
      {
        rotate: dkd_radar_core_value.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", dkd_target_is_boss ? "6deg" : "3deg"],
        }),
      },
    ],
  };
  const dkd_handle_radar_core_press = useCallback(() => {
    if (dkd_target_is_boss) {
      onOpenNearestBoss?.();
      return;
    }
    onOpenDropList?.();
  }, [dkd_target_is_boss, onOpenDropList, onOpenNearestBoss]);

  return (
    <LinearGradient colors={["#12192B", "#0C1321"]} style={styles.boardShell}>
      <View style={styles.boardTop}>
        <View>
          <Text style={styles.boardEyebrow}>AV MERKEZİ</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: accent.bg, borderColor: accent.border },
          ]}
        >
          <MaterialCommunityIcons
            name={accent.icon}
            size={24}
            color={accent.color}
          />
        </View>
      </View>

      <View style={styles.radarShell}>
        <View style={styles.radarOuterGlow} />
        <View style={styles.radarOuter}>
          <View style={styles.radarMid}>
            <View style={styles.radarInner}>
              <Animated.View
                pointerEvents="none"
                style={[styles.dkdRadarCoreAura, dkd_radar_core_glow_style]}
              />
              <Pressable
                onPress={dkd_handle_radar_core_press}
                style={styles.dkdRadarCorePressable}
                hitSlop={10}
              >
                <Animated.View
                  style={[styles.dkdRadarCoreShell, dkd_radar_core_shell_style]}
                >
                  <LinearGradient
                    colors={
                      dkd_target_is_boss
                        ? ["rgba(255,133,126,0.30)", "rgba(118,26,36,0.12)"]
                        : ["rgba(255,213,108,0.24)", "rgba(104,74,255,0.10)"]
                    }
                    style={styles.dkdRadarCoreFill}
                  >
                    <View
                      style={[
                        styles.dkdRadarCoreRing,
                        dkd_target_is_boss
                          ? styles.dkdRadarCoreRingBoss
                          : styles.dkdRadarCoreRingDrop,
                      ]}
                    >
                      <Animated.View
                        style={[styles.dkdRadarCoreIconWrap, dkd_radar_core_icon_style]}
                      >
                        {dkd_target_is_boss ? (
                          <>
                            <View style={styles.dkdRadarBossBadge}>
                              <MaterialCommunityIcons
                                name="crown-outline"
                                size={11}
                                color="#FFE39A"
                              />
                            </View>
                            <MaterialCommunityIcons
                              name="sword-cross"
                              size={34}
                              color="#FFE7B8"
                            />
                          </>
                        ) : (
                          <MaterialCommunityIcons
                            name="treasure-chest"
                            size={40}
                            color="#FFE39A"
                          />
                        )}
                      </Animated.View>
                    </View>
                  </LinearGradient>
                </Animated.View>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={[styles.node, styles.nodeTop, styles.nodeWide]}>
          <View style={[styles.nodeIconWrap, styles.nodeIconBlue]}>
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={17}
              color="#A8ECFF"
            />
          </View>
          <Text style={styles.nodeLabel}>EN YAKIN HEDEF</Text>
          <Text style={styles.nodeValue} numberOfLines={1}>
            {dockPreview?.name || "Yakındaki hedef"}
          </Text>
        </View>

        <View style={[styles.node, styles.nodeLeft]}>
          <View style={[styles.nodeIconWrap, styles.nodeIconPurple]}>
            <MaterialCommunityIcons
              name="crown-outline"
              size={17}
              color="#FFE39A"
            />
          </View>
          <Text style={styles.nodeLabel}>Yeni Boss</Text>
          <Text style={styles.nodeValue} numberOfLines={1}>
            {bossText}
          </Text>
        </View>

        <View style={[styles.node, styles.nodeRight]}>
          <View style={[styles.nodeIconWrap, styles.nodeIconGold]}>
            <MaterialCommunityIcons
              name="sword-cross"
              size={17}
              color="#FFE39A"
            />
          </View>
          <Text style={styles.nodeLabel}>Tamamlanan</Text>
          <Text style={styles.nodeValue} numberOfLines={1}>
            {hiddenBossText}
          </Text>
        </View>

        <View style={[styles.node, styles.nodeBottom]}>
          <View style={[styles.nodeIconWrap, styles.nodeIconCyan]}>
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={17}
              color="#A8ECFF"
            />
          </View>
          <Text style={styles.nodeLabel}>Tür</Text>
          <Text style={styles.nodeValue} numberOfLines={1}>
            {targetTypeText}
          </Text>
        </View>
      </View>

      <View style={styles.ctaRow}>
        <Pressable onPress={onOpenMap} style={{ flex: 1 }}>
          <Animated.View
            style={[styles.ctaPrimaryShell, dkd_live_map_wrap_style]}
          >
            <Animated.View
              style={[styles.ctaPrimaryGlow, dkd_live_map_glow_style]}
            />
            <LinearGradient
              colors={["#73E2FF", "#7A8BFF", "#FF9D63", "#FFD86C"]}
              start={dkd_make_native_axis_point(0, 0)}
              end={dkd_make_native_axis_point(1, 1)}
              style={styles.ctaPrimary}
            >
              <Animated.View
                pointerEvents="none"
                style={[styles.ctaPrimaryShimmer, dkd_live_map_shimmer_style]}
              >
                <LinearGradient
                  colors={[
                    "rgba(255,255,255,0)",
                    "rgba(255,255,255,0.30)",
                    "rgba(255,255,255,0)",
                  ]}
                  start={dkd_make_native_axis_point(0, 0.5)}
                  end={dkd_make_native_axis_point(1, 0.5)}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              <MaterialCommunityIcons
                name="compass-rose"
                size={20}
                color="#201508"
              />
              <Text style={styles.ctaPrimaryText}>Canlı Harita</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
        <View style={{ width: 10 }} />
        <Pressable onPress={onOpenScanner} style={{ flex: 1 }}>
          <LinearGradient
            colors={["#17243F", "#0D1628"]}
            style={styles.ctaSecondary}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={20} color="#FFF" />
            <Text style={styles.ctaSecondaryText}>QR Tara</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.frameGrid}>
        {dkd_action_cards.map((dkd_action_item) => (
          <FrameCard
            key={dkd_action_item.key}
            title={dkd_action_item.title}
            subtitle={dkd_action_item.sub}
            icon={dkd_action_item.icon}
            dkd_icon_secondary={dkd_action_item.dkd_icon_secondary}
            tone={dkd_action_item.tone}
            onPress={dkd_action_item.onPress}
            dkd_is_featured={!!dkd_action_item.dkd_is_featured}
          />
        ))}
      </View>
    </LinearGradient>
  );
}

function LiveMapOverlay({
  visible,
  onClose,
  mapRef,
  region,
  markerDrops,
  activeDropId,
  currentLocation,
  onMarkerPress,
  trDropType,
  clamp,
  visibleDrops,
  dockPreview,
  dockPreviewPending,
  hiddenBossCountToday,
  nextBossReturnText,
  isNear,
  etaTextFromDistance,
  openDirections,
  onOpenDropList,
  onOpenScanner,
  recenterToCurrentLocation,
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.mapBackdrop}>
        <View style={styles.mapSheet}>
          <MapCanvas
            mapRef={mapRef}
            region={region}
            markerDrops={markerDrops}
            activeDropId={activeDropId}
            currentLocation={currentLocation}
            onMarkerPress={onMarkerPress}
            trDropType={trDropType}
            clamp={clamp}
          />
          <View style={styles.mapTopBar}>
            <LinearGradient
              colors={["rgba(15,23,39,0.92)", "rgba(10,15,26,0.92)"]}
              style={styles.mapTitlePill}
            >
              <MaterialCommunityIcons
                name="map-marker-path"
                size={18}
                color="#FFF"
              />
              <Text style={styles.mapTitle}>Canlı Saha Haritası</Text>
            </LinearGradient>
            <Pressable onPress={onClose} style={styles.mapCloseBtn}>
              <MaterialCommunityIcons name="close" size={20} color="#FFF" />
            </Pressable>
          </View>
          <View style={styles.mapUtilities}>
            <Pressable onPress={onOpenScanner} style={styles.utilBtn}>
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={20}
                color="#FFF"
              />
            </Pressable>
            <Pressable onPress={onOpenDropList} style={styles.utilBtn}>
              <MaterialCommunityIcons
                name="format-list-bulleted-square"
                size={20}
                color="#FFF"
              />
            </Pressable>
            <Pressable
              onPress={recenterToCurrentLocation}
              style={styles.utilBtn}
            >
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={20}
                color="#FFF"
              />
            </Pressable>
          </View>
          <DropDockPanel
            visibleCount={visibleDrops.length}
            dockPreview={dockPreview}
            dockPreviewPending={dockPreviewPending}
            hiddenBossCountToday={hiddenBossCountToday}
            nextBossReturnText={nextBossReturnText}
            isNear={isNear}
            etaTextFromDistance={etaTextFromDistance}
            onOpenList={onOpenDropList}
            onDirections={openDirections}
          />
        </View>
      </View>
    </Modal>
  );
}

export default function MapHomeScreen({
  mapRef,
  region,
  markerDrops,
  activeDropId,
  currentLocation,
  onMarkerPress,
  trDropType,
  clamp,
  profile,
  energyUI,
  tokenText,
  walletText,
  liveOpsState,
  achievementsState,
  onOpenAchievements,
  onDismissAchievementToast,
  onOpenLiveOps,
  onOpenScanner,
  hiddenBossCountToday,
  nextBossReturnText,
  recenterToCurrentLocation,
  visibleDrops,
  dockPreview,
  dockPreviewPending,
  isNear,
  etaTextFromDistance,
  openDirections,
  activeTab,
  onTabChange,
  onOpenDropList,
  onOpenActionMenu,
  onOpenProfile,
  onOpenCourierBoard,
  onOpenClanHub,
  onOpenNearestBoss,
}) {
  const [liveMapOpen, setLiveMapOpen] = useState(false);
  useEffect(() => {
    if (activeTab !== "map") setLiveMapOpen(false);
  }, [activeTab]);
  const openLiveMap = useCallback(() => {
    onTabChange?.("map");
    setLiveMapOpen(true);
  }, [onTabChange]);

  return (
    <View style={styles.screen}>
      <View style={styles.bgGlowA} />
      <View style={styles.bgGlowB} />
      <HeaderHUD
        profile={profile}
        energyUI={energyUI}
        tokenText={tokenText}
        walletText={walletText}
        onOpenActionMenu={onOpenActionMenu}
        onOpenProfile={onOpenProfile}
      />
      <AchievementToast
        toast={achievementsState?.toast}
        onPress={onOpenAchievements}
        onDismiss={onDismissAchievementToast}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <MissionBoard
          dockPreview={dockPreview}
          hiddenBossCountToday={hiddenBossCountToday}
          nextBossReturnText={nextBossReturnText}
          onOpenMap={openLiveMap}
          onOpenScanner={onOpenScanner}
          onOpenDropList={onOpenDropList}
          onOpenNearestBoss={onOpenNearestBoss}
          openRewards={onOpenLiveOps}
          openCourier={onOpenCourierBoard}
          onOpenClanHub={onOpenClanHub}
          profile={profile}
          onTabChange={onTabChange}
        />
      </ScrollView>
      <LiveMapOverlay
        visible={liveMapOpen}
        onClose={() => setLiveMapOpen(false)}
        mapRef={mapRef}
        region={region}
        markerDrops={markerDrops}
        activeDropId={activeDropId}
        currentLocation={currentLocation}
        onMarkerPress={onMarkerPress}
        trDropType={trDropType}
        clamp={clamp}
        visibleDrops={visibleDrops}
        dockPreview={dockPreview}
        dockPreviewPending={dockPreviewPending}
        hiddenBossCountToday={hiddenBossCountToday}
        nextBossReturnText={nextBossReturnText}
        isNear={isNear}
        etaTextFromDistance={etaTextFromDistance}
        openDirections={openDirections}
        onOpenDropList={onOpenDropList}
        onOpenScanner={onOpenScanner}
        recenterToCurrentLocation={recenterToCurrentLocation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#050811" },
  bgGlowA: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(79,131,255,0.11)",
    top: -72,
    right: -56,
  },
  bgGlowB: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,177,74,0.07)",
    bottom: 116,
    left: -72,
  },
  content: {
    paddingTop: HOME_IS_COMPACT ? 174 : 182,
    paddingBottom: HOME_IS_TIGHT ? 34 : 42,
    paddingHorizontal: HOME_IS_COMPACT ? 10 : 11,
  },
  headerShell: {
    position: "absolute",
    top: 8,
    left: 10,
    right: 10,
    zIndex: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(126,154,255,0.16)",
    paddingHorizontal: HOME_IS_COMPACT ? 9 : 10,
    paddingTop: HOME_IS_COMPACT ? 8 : 9,
    paddingBottom: HOME_IS_COMPACT ? 7 : 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  identityTap: {
    flex: 1,
    minWidth: 0,
    marginRight: 6,
    paddingRight: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  identityWrap: { flex: 1, minWidth: 0, marginLeft: 10, paddingRight: 2 },
  avatar: {
    width: HOME_IS_COMPACT ? 66 : 72,
    height: HOME_IS_COMPACT ? 66 : 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  avatarText: { fontSize: HOME_IS_COMPACT ? 31 : 34 },
  headerEyebrow: {
    color: "#69DAFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  headerName: {
    color: "#FFF",
    fontSize: HOME_IS_COMPACT ? 17 : 19,
    fontWeight: "900",
    marginTop: 1,
  },
  headerNameCompact: { fontSize: HOME_IS_COMPACT ? 15 : 16 },
  headerRank: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  lvlBox: {
    width: HOME_IS_COMPACT ? 46 : 48,
    height: HOME_IS_COMPACT ? 46 : 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,213,108,0.22)",
    backgroundColor: "rgba(255,213,108,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  lvlMini: { color: "#FFF5D6", fontSize: 7, fontWeight: "900" },
  lvlValue: {
    color: "#FFF",
    fontSize: HOME_IS_COMPACT ? 18 : 19,
    fontWeight: "900",
    lineHeight: HOME_IS_COMPACT ? 20 : 21,
  },
  menuBtn: {
    width: HOME_IS_COMPACT ? 50 : 56,
    height: HOME_IS_COMPACT ? 50 : 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginLeft: 6,
  },
  progressLine: {
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(7,12,20,0.88)",
    overflow: "hidden",
    marginTop: 8,
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  progressMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  progressMetaTitleWrap: { flexDirection: "row", alignItems: "center" },
  progressMetaChip: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,227,154,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,227,154,0.24)",
  },
  progressMetaLabel: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    marginLeft: 6,
  },
  progressMetaValue: { color: "#FFE49A", fontSize: 12, fontWeight: "900" },
  progressTrackText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowRadius: 4,
  },
  progressShimmer: {
    position: "absolute",
    top: -2,
    bottom: -2,
    width: 92,
    opacity: 0.85,
  },
  progressHint: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
  },
  chestVisualWrap: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  chestVisualBadge: {
    position: "absolute",
    right: 3,
    top: 5,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,245,204,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,245,204,0.50)",
  },

  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
  },
  energyCard: {
    minHeight: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(138,155,255,0.30)",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    overflow: "hidden",
    backgroundColor: "rgba(10,16,28,0.72)",
    shadowColor: "#7A8CFF",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  energyAccentLine: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 0,
    height: 2,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
  energyGlowOrb: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 999,
    right: -30,
    top: -38,
    backgroundColor: "rgba(110,224,255,0.18)",
  },
  energyGlowOrbSecondary: {
    position: "absolute",
    width: 104,
    height: 104,
    borderRadius: 999,
    left: -28,
    bottom: -40,
    backgroundColor: "rgba(173,118,255,0.16)",
  },
  energyCardCollapsed: { minHeight: 58, paddingVertical: 8 },
  energyCardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  energyCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },
  energyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(146,223,255,0.34)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#84CFFF",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  energyCopy: { flex: 1, marginLeft: 10 },
  energyLabel: {
    color: "#9EEBFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  energyValueRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  energyValue: { color: "#FFFFFF", fontSize: 18, fontWeight: "900" },
  energyPctText: {
    color: "rgba(168,236,255,0.88)",
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 8,
  },
  energySub: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
  energyCompactMeta: { alignItems: "flex-end", justifyContent: "center" },
  energyTimerPill: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(147,239,197,0.30)",
    backgroundColor: "rgba(40,168,123,0.18)",
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#77FFB9",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  energyTimerText: {
    color: "#DBFFE8",
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 5,
  },

  resourceToggleBar: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(126,154,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.03)",
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
  },
  resourcePillRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resourceMiniPill: {
    flex: 1,
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  resourceMiniPillBlue: {
    backgroundColor: "rgba(99,214,255,0.10)",
    borderColor: "rgba(99,214,255,0.24)",
  },
  resourceMiniPillGold: {
    backgroundColor: "rgba(255,213,108,0.10)",
    borderColor: "rgba(255,213,108,0.24)",
  },
  resourceMiniPillPurple: {
    backgroundColor: "rgba(175,124,255,0.10)",
    borderColor: "rgba(175,124,255,0.24)",
  },
  resourceMiniValue: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 6,
  },
  resourceToggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginLeft: 8,
  },
  statRow: { flexDirection: "row", gap: 6, marginTop: 7 },
  statBox: {
    flex: 1,
    minHeight: HOME_IS_COMPACT ? 52 : 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 9,
    paddingVertical: 8,
    justifyContent: "center",
  },
  statBoxValue: {
    color: "#FFF",
    fontSize: HOME_IS_COMPACT ? 14 : 15,
    fontWeight: "900",
    marginTop: 4,
  },
  statBoxLabel: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 1,
  },
  boardShell: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(126,154,255,0.16)",
    padding: HOME_IS_COMPACT ? 12 : 13,
    marginTop: HOME_IS_COMPACT ? 38 : 46,
  },
  boardTop: { flexDirection: "row", alignItems: "flex-start" },
  boardEyebrow: {
    color: "#69DAFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  boardTitle: {
    color: "#FFF",
    fontSize: HOME_IS_COMPACT ? 20 : 21,
    fontWeight: "900",
    marginTop: 3,
  },
  boardSub: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 280,
  },
  statusBadge: {
    width: HOME_IS_COMPACT ? 46 : 48,
    height: HOME_IS_COMPACT ? 46 : 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  radarShell: {
    height: 286,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 34,
    position: "relative",
  },
  radarOuterGlow: {
    position: "absolute",
    width: 218,
    height: 218,
    borderRadius: 109,
    backgroundColor: "rgba(99,214,255,0.032)",
  },
  radarOuter: {
    width: 194,
    height: 194,
    borderRadius: 97,
    borderWidth: 1,
    borderColor: "rgba(99,214,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  radarMid: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  radarInner: {
    width: 106,
    height: 106,
    borderRadius: 53,
    backgroundColor: "rgba(255,255,255,0.026)",
    alignItems: "center",
    justifyContent: "center",
  },
  chestCoreAura: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,231,171,0.12)",
  },
  chestCore: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FFB445",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  chestHero: {
    width: 46,
    height: 38,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  chestHeroLid: {
    width: 38,
    height: 12,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chestHeroLidLine: {
    width: 22,
    height: 2,
    borderRadius: 99,
    backgroundColor: "rgba(255,214,118,0.40)",
    marginBottom: 2,
  },
  chestHeroBody: {
    width: 42,
    height: 24,
    marginTop: -1,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  chestHeroBand: {
    position: "absolute",
    width: 8,
    top: 0,
    bottom: 0,
    borderRadius: 4,
    backgroundColor: "#D9A955",
  },
  chestHeroLatch: {
    width: 11,
    height: 9,
    borderRadius: 3,
    borderWidth: 2,
    borderColor: "#281607",
    backgroundColor: "#E8C87E",
  },
  chestHeroHighlight: {
    position: "absolute",
    top: 4,
    left: 6,
    right: 6,
    height: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,240,191,0.12)",
  },
  chestHeroGemWrap: { display: "none" },
  dkdRadarCoreAura: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: "rgba(255,214,108,0.22)",
  },
  dkdRadarCorePressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  dkdRadarCoreShell: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  dkdRadarCoreFill: {
    flex: 1,
    borderRadius: 46,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  dkdRadarCoreRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dkdRadarCoreRingBoss: {
    backgroundColor: "rgba(87,18,24,0.72)",
    borderColor: "rgba(255,126,126,0.28)",
  },
  dkdRadarCoreRingDrop: {
    backgroundColor: "rgba(103,71,255,0.22)",
    borderColor: "rgba(255,213,108,0.24)",
  },
  dkdRadarCoreIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  dkdRadarBossBadge: {
    position: "absolute",
    top: -14,
    alignSelf: "center",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,198,111,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,226,166,0.20)",
  },

  coreTitle: { display: "none" },
  coreSub: { display: "none" },
  node: {
    position: "absolute",
    minWidth: 102,
    minHeight: 70,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,22,37,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  nodeIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  nodeIconBlue: {
    backgroundColor: "rgba(99,214,255,0.10)",
    borderColor: "rgba(99,214,255,0.24)",
  },
  nodeIconPurple: {
    backgroundColor: "rgba(175,124,255,0.10)",
    borderColor: "rgba(175,124,255,0.24)",
  },
  nodeIconGold: {
    backgroundColor: "rgba(255,213,108,0.10)",
    borderColor: "rgba(255,213,108,0.24)",
  },
  nodeIconCyan: {
    backgroundColor: "rgba(104,231,255,0.10)",
    borderColor: "rgba(104,231,255,0.24)",
  },
  nodeWide: { minWidth: 170, maxWidth: 198 },
  nodeLabel: {
    color: "rgba(232,240,255,0.70)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.36,
    textTransform: "uppercase",
  },
  nodeValue: {
    color: "#F1F5FF",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },
  nodeTop: { top: 18 },
  nodeLeft: { left: 18, top: 130 },
  nodeRight: { right: 18, top: 130 },
  nodeBottom: { bottom: 10 },
  ctaRow: { flexDirection: "row", marginTop: 2 },
  ctaPrimaryShell: { position: "relative" },
  ctaPrimaryGlow: {
    position: "absolute",
    left: 8,
    right: 8,
    top: 4,
    bottom: -2,
    borderRadius: 18,
    backgroundColor: "rgba(122,139,255,0.26)",
  },
  ctaPrimary: {
    minHeight: HOME_IS_COMPACT ? 50 : 54,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(255,235,184,0.44)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
  },
  ctaPrimaryShimmer: {
    position: "absolute",
    top: -10,
    bottom: -10,
    width: 88,
    opacity: 0.9,
  },
  ctaPrimaryText: {
    color: "#201508",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 6,
  },
  ctaSecondary: {
    minHeight: HOME_IS_COMPACT ? 46 : 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(126,154,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  ctaSecondaryText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 6,
  },
  bountyStrip: { marginTop: 9 },
  bountyStripInner: {
    minHeight: 50,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
  },
  bountyTitle: { color: "#FFF", fontSize: 13, fontWeight: "900" },
  bountySub: { color: "rgba(255,255,255,0.68)", fontSize: 9, marginTop: 1 },
  frameGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginHorizontal: -4,
  },
  frameWrap: { width: "50%", padding: 4 },
  frameTapArea: { flex: 1, position: "relative" },
  frameFeatureGlow: { position: "absolute", inset: 4, borderRadius: 18 },
  frame: {
    minHeight: HOME_IS_COMPACT ? 104 : 108,
    borderRadius: 16,
    borderWidth: 1,
    padding: 11,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  frameTop: {
    position: "absolute",
    top: 11,
    left: 11,
    minWidth: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
  },
  frameTopIcons: { flexDirection: "row", alignItems: "center" },
  frameTopIconSecondary: { marginLeft: 6 },
  frameFeatureBadge: {
    position: "absolute",
    right: 10,
    top: 10,
    minHeight: 22,
    borderRadius: 999,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  frameFeatureBadgeText: { fontSize: 9, fontWeight: "900", marginLeft: 4 },
  frameTitle: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  frameSub: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 9,
    lineHeight: 13,
    marginTop: 4,
  },
  mapBackdrop: { flex: 1, backgroundColor: "rgba(2,5,10,0.82)" },
  mapSheet: { flex: 1 },
  mapTopBar: {
    position: "absolute",
    top: 18,
    left: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 12,
  },
  mapTitlePill: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(126,154,255,0.18)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  mapTitle: { color: "#FFF", fontSize: 16, fontWeight: "900", marginLeft: 8 },
  mapCloseBtn: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,15,26,0.92)",
    borderWidth: 1,
    borderColor: "rgba(126,154,255,0.18)",
  },
  rewardMapBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFCF58",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.22)",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mapUtilities: {
    position: "absolute",
    right: 16,
    top: 96,
    zIndex: 12,
    gap: 12,
  },
  utilBtn: {
    width: 52,
    height: 52,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,15,26,0.92)",
    borderWidth: 1,
    borderColor: "rgba(126,154,255,0.18)",
  },
  userWrap: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  userRingOuter: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(98,214,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(98,214,255,0.40)",
  },
  userRingInner: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(98,214,255,0.18)",
  },
  userDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#62D6FF" },
});

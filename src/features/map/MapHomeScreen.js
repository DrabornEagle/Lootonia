import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  View
} from "react-native";
import MapView, { Circle, Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { dkd_render_support_panel_modal } from "../support/dkd_support_panel_conversation";
import { dkd_make_native_axis_point } from "../../utils/dkdNativeAxis";
import {
  dkd_configure_mapbox_access_token_value,
  dkd_fetch_mapbox_directions_route_value,
  dkd_mapbox_access_token_ready_value,
  dkd_mapbox_access_token_problem_text_value,
  dkd_mapbox_geojson_line_value,
} from "../../services/dkd_mapbox_route_service";
import { normalizeProgression } from "../../utils/progression";
import AchievementToast from "../achievements/AchievementToast";
import DropDockPanel from "./DropDockPanel";
import { resolveMarkerAsset } from "./PremiumMapMarker";
import { cityMapStyle } from "../../theme/cityLootTheme";
import { dropAccent, formatNum } from "../../theme/minimalLootUi";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const HOME_IS_COMPACT = SCREEN_W <= 430 || SCREEN_H <= 900;
const HOME_IS_TIGHT = SCREEN_H <= 820;
const STAT_ICON_SIZE = HOME_IS_COMPACT ? 16 : 17;
const FRAME_ICON_SIZE = HOME_IS_COMPACT ? 19 : 20;
const FRAME_ICON_PAIR_SIZE = HOME_IS_COMPACT ? 17 : 18;

let dkd_home_mapbox_gl_value = null;
try {
  const dkd_home_mapbox_module_value = require("@rnmapbox/maps");
  dkd_home_mapbox_gl_value = dkd_home_mapbox_module_value?.default || dkd_home_mapbox_module_value;
} catch {
  dkd_home_mapbox_gl_value = null;
}

const dkd_home_native_mapbox_ready_value = Boolean(
  dkd_home_mapbox_gl_value?.MapView && dkd_configure_mapbox_access_token_value(dkd_home_mapbox_gl_value)
);

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

function dkd_home_safe_heading_deg_value(dkd_heading_deg_value) {
  const dkd_numeric_heading_value = Number(dkd_heading_deg_value);
  if (!Number.isFinite(dkd_numeric_heading_value)) return 0;
  return ((dkd_numeric_heading_value % 360) + 360) % 360;
}

const UserLocationMarker = memo(function UserLocationMarker({ dkd_heading_deg_value = 0 }) {
  const dkd_marker_rotation_value = dkd_home_safe_heading_deg_value(dkd_heading_deg_value) + 45;
  return (
    <View style={styles.userWrap}>
      <View style={styles.userPulseRing} />
      <View style={styles.userRingOuter} />
      <View style={styles.userRingInner} />
      <View style={styles.userMarkerCore}>
        <MaterialCommunityIcons
          name="navigation-variant"
          size={15}
          color="#07111E"
          style={[styles.userHeadingIcon, { transform: [{ rotate: `${dkd_marker_rotation_value}deg` }] }]}
        />
      </View>
      <View style={styles.userDot} />
    </View>
  );
});

function dkd_home_region_coordinate_value(dkd_region_value) {
  const dkd_lng_value = Number(dkd_region_value?.longitude);
  const dkd_lat_value = Number(dkd_region_value?.latitude);
  if (Number.isFinite(dkd_lng_value) && Number.isFinite(dkd_lat_value)) return [dkd_lng_value, dkd_lat_value];
  return [32.85411, 39.92077];
}

function dkd_home_current_coordinate_value(dkd_current_location_value, dkd_region_value) {
  const dkd_lng_value = Number(dkd_current_location_value?.lng);
  const dkd_lat_value = Number(dkd_current_location_value?.lat);
  if (Number.isFinite(dkd_lng_value) && Number.isFinite(dkd_lat_value)) return [dkd_lng_value, dkd_lat_value];
  return dkd_home_region_coordinate_value(dkd_region_value);
}

function dkd_home_drop_coordinate_value(dkd_drop_value) {
  const dkd_lng_value = Number(dkd_drop_value?.lng);
  const dkd_lat_value = Number(dkd_drop_value?.lat);
  if (!Number.isFinite(dkd_lng_value) || !Number.isFinite(dkd_lat_value)) return null;
  if (Math.abs(dkd_lng_value) < 0.0001 && Math.abs(dkd_lat_value) < 0.0001) return null;
  return [dkd_lng_value, dkd_lat_value];
}

function dkd_home_drop_is_boss_value(dkd_drop_value) {
  const dkd_type_value = String(dkd_drop_value?.type || "").toLowerCase();
  const dkd_name_value = String(dkd_drop_value?.name || "").toLowerCase();
  return dkd_type_value.includes("boss") || dkd_name_value.includes("boss");
}

function dkd_home_drop_is_chest_value(dkd_drop_value) {
  const dkd_type_value = String(dkd_drop_value?.type || "").toLowerCase();
  const dkd_name_value = String(dkd_drop_value?.name || "").toLowerCase();
  return dkd_type_value.includes("chest")
    || dkd_type_value.includes("sandik")
    || dkd_type_value.includes("sandık")
    || dkd_name_value.includes("chest")
    || dkd_name_value.includes("sandik")
    || dkd_name_value.includes("sandık");
}

function dkd_home_drop_icon_name_value(dkd_drop_value) {
  const dkd_type_value = String(dkd_drop_value?.type || "").toLowerCase();
  const dkd_name_value = String(dkd_drop_value?.name || "").toLowerCase();
  if (dkd_home_drop_is_boss_value(dkd_drop_value)) return "skull-crossbones";
  if (dkd_home_drop_is_chest_value(dkd_drop_value)) return "treasure-chest";
  if (dkd_drop_value?.has_active_campaign || dkd_type_value.includes("reward") || dkd_name_value.includes("ödül")) return "gift";
  if (dkd_type_value.includes("qr")) return "qrcode-scan";
  if (dkd_type_value.includes("map")) return "map-marker-path";
  return "map-marker-radius-outline";
}


function dkd_home_drop_badge_text_value(dkd_drop_value) {
  const dkd_type_value = String(dkd_drop_value?.type || "").toLowerCase();
  const dkd_name_value = String(dkd_drop_value?.name || "").toLowerCase();
  if (dkd_home_drop_is_boss_value(dkd_drop_value)) return "BOSS";
  if (dkd_home_drop_is_chest_value(dkd_drop_value)) return "SANDIK";
  if (dkd_drop_value?.has_active_campaign || dkd_type_value.includes("reward") || dkd_name_value.includes("ödül")) return "ÖDÜL";
  return "";
}

function dkd_home_drop_tone_style_value(dkd_drop_value) {
  const dkd_badge_text_value = dkd_home_drop_badge_text_value(dkd_drop_value);
  if (dkd_badge_text_value === "BOSS") return styles.dkdHomeMapMarkerBoss;
  if (dkd_badge_text_value === "SANDIK") return styles.dkdHomeMapMarkerChest;
  if (dkd_badge_text_value === "ÖDÜL") return styles.dkdHomeMapMarkerReward;
  return null;
}


function dkd_home_drop_palette_value(dkd_drop_value) {
  const dkd_badge_text_value = dkd_home_drop_badge_text_value(dkd_drop_value);
  if (dkd_badge_text_value === "BOSS") {
    return {
      dkd_shell_color_value: '#FF8A6C',
      dkd_pointer_color_value: '#F8658E',
      dkd_icon_color_value: '#1A0A11',
    };
  }
  if (dkd_badge_text_value === "SANDIK") {
    return {
      dkd_shell_color_value: '#8B7CFF',
      dkd_pointer_color_value: '#6A5DFF',
      dkd_icon_color_value: '#F7F8FF',
    };
  }
  if (dkd_badge_text_value === "ÖDÜL") {
    return {
      dkd_shell_color_value: '#FFD65F',
      dkd_pointer_color_value: '#FFB648',
      dkd_icon_color_value: '#1A1308',
    };
  }
  return {
    dkd_shell_color_value: '#6CE7FF',
    dkd_pointer_color_value: '#4BB8FF',
    dkd_icon_color_value: '#07111E',
  };
}

function DkdHomeMapDropMarker({ dkd_drop_value, dkd_active_value, dkd_near_value, dkd_cooldown_value, trDropType }) {
  const dkd_badge_text_value = dkd_home_drop_badge_text_value(dkd_drop_value);
  const dkd_icon_name_value = dkd_home_drop_icon_name_value(dkd_drop_value);
  const dkd_type_label_value = clampText(trDropType?.(dkd_drop_value?.type), "Hedef");
  const dkd_palette_value = dkd_home_drop_palette_value(dkd_drop_value);
  const dkd_is_boss_marker_value = dkd_badge_text_value === "BOSS";
  const dkd_is_chest_marker_value = dkd_badge_text_value === "SANDIK";
  const dkd_use_large_asset_icon_value = dkd_is_boss_marker_value || dkd_is_chest_marker_value;
  return (
    <View style={styles.dkdHomeMapMarkerWrap} collapsable={false}>
      {dkd_badge_text_value ? (
        <View style={styles.dkdHomeMapMarkerBadge}>
          <Text style={styles.dkdHomeMapMarkerBadgeText}>{dkd_badge_text_value}</Text>
        </View>
      ) : null}
      <View style={styles.dkdHomeMapMarkerMainStack}>
        <View style={[
          styles.dkdHomeMapMarkerShell,
          dkd_home_drop_tone_style_value(dkd_drop_value),
          { backgroundColor: dkd_palette_value.dkd_shell_color_value },
          dkd_active_value && styles.dkdHomeMapMarkerActive,
          dkd_near_value?.ok && styles.dkdHomeMapMarkerNear,
          dkd_cooldown_value?.isCooldown && styles.dkdHomeMapMarkerCooldown,
        ]}>
          {dkd_use_large_asset_icon_value ? (
            <View style={[styles.dkdHomeMapMarkerAssetIconFrame, dkd_is_boss_marker_value && styles.dkdHomeMapMarkerBossAssetIconFrame]}>
              {dkd_is_boss_marker_value ? (
                <View style={styles.dkdHomeBossVisualCard}>
                  <LinearGradient
                    colors={["#2A0712", "#67142B", "#FF6A3D"]}
                    start={{ x: 0.08, y: 0.1 }}
                    end={{ x: 0.95, y: 0.95 }}
                    style={styles.dkdHomeBossVisualCore}
                  >
                    <View style={styles.dkdHomeBossVisualHornLeft} />
                    <View style={styles.dkdHomeBossVisualHornRight} />
                    <MaterialCommunityIcons name="skull-crossbones" size={31} color="#FFF2CA" />
                    <View style={styles.dkdHomeBossVisualCrownBadge}>
                      <MaterialCommunityIcons name="crown" size={13} color="#2A0712" />
                    </View>
                  </LinearGradient>
                  <View style={styles.dkdHomeBossVisualRaidPill}>
                    <Text style={styles.dkdHomeBossVisualRaidText}>BOSS</Text>
                  </View>
                </View>
              ) : (
                <Image
                  source={resolveMarkerAsset(dkd_drop_value)}
                  style={styles.dkdHomeMapMarkerAssetIcon}
                  contentFit="contain"
                />
              )}
            </View>
          ) : (
            <MaterialCommunityIcons name={dkd_icon_name_value} size={28} color={dkd_palette_value.dkd_icon_color_value} />
          )}
        </View>
        <View style={[styles.dkdHomeMapMarkerPointer, { backgroundColor: dkd_palette_value.dkd_pointer_color_value }]} />
      </View>
      {dkd_active_value ? (
        <View style={styles.dkdHomeMapMarkerNamePill}>
          <Text style={styles.dkdHomeMapMarkerNameText} numberOfLines={1}>{dkd_drop_value?.name || dkd_type_label_value}</Text>
        </View>
      ) : null}
    </View>
  );
}

function dkd_home_route_coordinate_values_value(dkd_route_value) {
  return Array.isArray(dkd_route_value?.dkd_coordinate_values) ? dkd_route_value.dkd_coordinate_values : [];
}

function dkd_home_route_map_view_points_value(dkd_route_value) {
  return Array.isArray(dkd_route_value?.dkd_point_list_value) ? dkd_route_value.dkd_point_list_value : [];
}

function dkd_home_route_center_coordinate_value(dkd_route_value, dkd_fallback_coordinate_value) {
  const dkd_coordinate_values = dkd_home_route_coordinate_values_value(dkd_route_value);
  if (dkd_coordinate_values.length < 2) return dkd_fallback_coordinate_value;
  const dkd_sum_value = dkd_coordinate_values.reduce((dkd_total_value, dkd_coordinate_value) => {
    const dkd_lng_value = Number(dkd_coordinate_value?.[0]);
    const dkd_lat_value = Number(dkd_coordinate_value?.[1]);
    if (!Number.isFinite(dkd_lng_value) || !Number.isFinite(dkd_lat_value)) return dkd_total_value;
    return {
      dkd_lng_value: dkd_total_value.dkd_lng_value + dkd_lng_value,
      dkd_lat_value: dkd_total_value.dkd_lat_value + dkd_lat_value,
      dkd_count_value: dkd_total_value.dkd_count_value + 1,
    };
  }, { dkd_lng_value: 0, dkd_lat_value: 0, dkd_count_value: 0 });
  if (!dkd_sum_value.dkd_count_value) return dkd_fallback_coordinate_value;
  return [
    dkd_sum_value.dkd_lng_value / dkd_sum_value.dkd_count_value,
    dkd_sum_value.dkd_lat_value / dkd_sum_value.dkd_count_value,
  ];
}

function dkd_home_route_status_text_value(dkd_route_loading_value, dkd_route_value, dkd_route_target_drop_value) {
  if (dkd_route_loading_value) return "DKDmap rota hazırlanıyor...";
  if (!dkd_route_target_drop_value || !dkd_route_value) return "";
  const dkd_distance_value = Number(dkd_route_value?.dkd_distance_km_value);
  const dkd_duration_value = Number(dkd_route_value?.dkd_duration_min_value);
  const dkd_distance_text_value = Number.isFinite(dkd_distance_value) ? `${dkd_distance_value.toFixed(dkd_distance_value >= 10 ? 0 : 1)} km` : "rota";
  const dkd_duration_text_value = Number.isFinite(dkd_duration_value) ? ` • ${Math.max(1, Math.round(dkd_duration_value))} dk` : "";
  const dkd_warning_text_value = String(dkd_route_value?.dkd_warning_text_value || "").trim();
  if (dkd_warning_text_value) return `DKDmap rota: ${dkd_warning_text_value}`;
  return `DKDmap rota çizildi • ${dkd_distance_text_value}${dkd_duration_text_value}`;
}


function dkd_render_home_native_mapbox_marker_value({
  dkd_marker_id_value,
  dkd_coordinate_value,
  dkd_children_value,
  dkd_on_press_value,
  dkd_anchor_value = dkd_make_native_axis_point(0.5, 1),
  dkd_allow_overlap_value = true,
}) {
  const dkd_marker_view_component_value = dkd_home_mapbox_gl_value?.MarkerView || null;
  if (dkd_marker_view_component_value) {
    return React.createElement(
      dkd_marker_view_component_value,
      {
        key: dkd_marker_id_value,
        id: dkd_marker_id_value,
        coordinate: dkd_coordinate_value,
        anchor: dkd_anchor_value,
        onPress: dkd_on_press_value,
        allowOverlap: dkd_allow_overlap_value,
      },
      dkd_children_value,
    );
  }
  const dkd_point_annotation_component_value = dkd_home_mapbox_gl_value?.PointAnnotation || null;
  if (!dkd_point_annotation_component_value) return null;
  return React.createElement(
    dkd_point_annotation_component_value,
    {
      key: dkd_marker_id_value,
      id: dkd_marker_id_value,
      coordinate: dkd_coordinate_value,
      onSelected: dkd_on_press_value,
      anchor: dkd_anchor_value,
      selected: false,
    },
    dkd_children_value,
  );
}

const MapCanvas = memo(function MapCanvas({
  mapRef,
  region,
  markerDrops,
  activeDropId,
  currentLocation,
  onMarkerPress,
  trDropType,
  clamp,
  dkd_route_value,
  dkd_user_focus_request_value,
}) {
  const dkd_center_coordinate_value = dkd_home_current_coordinate_value(currentLocation, region);
  const dkd_route_coordinate_values = dkd_home_route_coordinate_values_value(dkd_route_value);
  const dkd_route_map_view_points_value = dkd_home_route_map_view_points_value(dkd_route_value);
  const dkd_route_shape_value = dkd_mapbox_geojson_line_value(dkd_route_coordinate_values);
  const dkd_has_user_focus_value = Number(dkd_user_focus_request_value || 0) > 0
    && currentLocation?.lat != null
    && currentLocation?.lng != null;
  const dkd_camera_center_coordinate_value = dkd_has_user_focus_value
    ? dkd_center_coordinate_value
    : dkd_home_route_center_coordinate_value(dkd_route_value, dkd_center_coordinate_value);
  const dkd_camera_zoom_level_value = dkd_has_user_focus_value
    ? 18.1
    : (dkd_route_coordinate_values.length >= 2 ? 15.4 : (currentLocation?.lat != null && currentLocation?.lng != null ? 15.8 : 12.6));
  const dkd_home_mapbox_status_text_value = dkd_home_native_mapbox_ready_value
    ? ""
    : dkd_mapbox_access_token_ready_value
      ? "Expo Go native Mapbox modülü yoksa DKDmap Google fallback ile açılır."
      : dkd_mapbox_access_token_problem_text_value();
  useEffect(() => {
    if (!Number(dkd_user_focus_request_value || 0)) return;
    const dkd_focus_lat_value = Number(currentLocation?.lat);
    const dkd_focus_lng_value = Number(currentLocation?.lng);
    if (!Number.isFinite(dkd_focus_lat_value) || !Number.isFinite(dkd_focus_lng_value)) return;
    mapRef?.current?.animateToRegion?.({
      latitude: dkd_focus_lat_value,
      longitude: dkd_focus_lng_value,
      latitudeDelta: 0.0022,
      longitudeDelta: 0.0022,
    }, 650);
  }, [currentLocation?.lat, currentLocation?.lng, dkd_user_focus_request_value, mapRef]);

  if (dkd_home_native_mapbox_ready_value) {
    return (
      <dkd_home_mapbox_gl_value.MapView
        style={{ flex: 1 }}
        styleURL="mapbox://styles/mapbox/dark-v11"
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <dkd_home_mapbox_gl_value.Camera
          key={`dkd_home_mapbox_camera_${Number(dkd_user_focus_request_value || 0)}_${dkd_route_coordinate_values.length}`}
          centerCoordinate={dkd_camera_center_coordinate_value}
          zoomLevel={dkd_camera_zoom_level_value}
          animationMode="flyTo"
          animationDuration={650}
        />
        {dkd_route_coordinate_values.length >= 2 && dkd_home_mapbox_gl_value?.ShapeSource && dkd_home_mapbox_gl_value?.LineLayer ? (
          <dkd_home_mapbox_gl_value.ShapeSource id="dkd_home_selected_route_source" shape={dkd_route_shape_value}>
            <dkd_home_mapbox_gl_value.LineLayer
              id="dkd_home_selected_route_glow_layer"
              style={{ lineColor: "#72E7FF", lineWidth: 11, lineOpacity: 0.28, lineCap: "round", lineJoin: "round" }}
            />
            <dkd_home_mapbox_gl_value.LineLayer
              id="dkd_home_selected_route_core_layer"
              style={{ lineColor: "#FFD56C", lineWidth: 5.5, lineOpacity: 0.96, lineCap: "round", lineJoin: "round" }}
            />
          </dkd_home_mapbox_gl_value.ShapeSource>
        ) : null}
        {markerDrops.map(({
          drop: dkd_drop_item,
          near: dkd_is_nearby,
          cooldown: dkd_cooldown_state,
        }) => {
          const dkd_coordinate_value = dkd_home_drop_coordinate_value(dkd_drop_item);
          if (!dkd_coordinate_value) return null;
          const dkd_active_value = String(activeDropId) === String(dkd_drop_item.id);
          return dkd_render_home_native_mapbox_marker_value({
            dkd_marker_id_value: `dkd_home_drop_${String(dkd_drop_item.id)}`,
            dkd_coordinate_value,
            dkd_on_press_value: () => onMarkerPress(dkd_drop_item, dkd_is_nearby, dkd_cooldown_state),
            dkd_children_value: (
              <Pressable
                onPress={() => onMarkerPress(dkd_drop_item, dkd_is_nearby, dkd_cooldown_state)}
                hitSlop={12}
              >
                <DkdHomeMapDropMarker
                  dkd_drop_value={dkd_drop_item}
                  dkd_active_value={dkd_active_value}
                  dkd_near_value={dkd_is_nearby}
                  dkd_cooldown_value={dkd_cooldown_state}
                  trDropType={trDropType}
                />
              </Pressable>
            ),
          });
        })}
        {currentLocation?.lat != null && currentLocation?.lng != null ? dkd_render_home_native_mapbox_marker_value({
          dkd_marker_id_value: `dkd_home_user_location_marker_${Number(dkd_user_focus_request_value || 0)}`,
          dkd_coordinate_value: dkd_home_current_coordinate_value(currentLocation, region),
          dkd_anchor_value: dkd_make_native_axis_point(0.5, 0.5),
          dkd_allow_overlap_value: true,
          dkd_children_value: <UserLocationMarker dkd_heading_deg_value={currentLocation?.heading} />,
        }) : null}
      </dkd_home_mapbox_gl_value.MapView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
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
        {dkd_route_map_view_points_value.length >= 2 ? (
          <Polyline
            coordinates={dkd_route_map_view_points_value}
            strokeWidth={8}
            strokeColor="rgba(255,213,108,0.95)"
            lineCap="round"
            lineJoin="round"
            zIndex={18}
          />
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
                  tracksViewChanges={false}
                  zIndex={active ? 12 : 6}
                >
                  <DkdHomeMapDropMarker
                    dkd_drop_value={dkd_drop_item}
                    dkd_active_value={active}
                    dkd_near_value={dkd_is_nearby}
                    dkd_cooldown_value={dkd_cooldown_state}
                    trDropType={trDropType}
                  />
                </Marker>
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
        {currentLocation?.lat != null && currentLocation?.lng != null ? (
          <Marker
            coordinate={{
              latitude: Number(currentLocation.lat),
              longitude: Number(currentLocation.lng),
            }}
            anchor={dkd_make_native_axis_point(0.5, 0.5)}
            tracksViewChanges
            zIndex={90}
          >
            <UserLocationMarker dkd_heading_deg_value={currentLocation?.heading} />
          </Marker>
        ) : null}
      </MapView>
      {dkd_home_mapbox_status_text_value ? (
        <View pointerEvents="none" style={styles.dkdHomeMapboxFallbackPill}>
          <MaterialCommunityIcons name="mapbox" size={13} color="#8CF2FF" />
          <Text style={styles.dkdHomeMapboxFallbackText}>{dkd_home_mapbox_status_text_value}</Text>
        </View>
      ) : null}
    </View>
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
  dkd_icon_third = "",
  dkd_icon_fourth = "",
  tone = "blue",
  onPress,
  dkd_is_featured = false,
  dkd_is_wide = false,
  dkd_feature_badge_text = "Canlı",
  dkd_show_click_hint = false,
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
    dkd_courier: {
      colors: ["#0B3A4A", "#26306A", "#5B233E"],
      border: "rgba(140,242,255,0.44)",
      glow: "rgba(140,242,255,0.26)",
      icon: "#EAFBFF",
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
  const dkd_tap_hint_value = React.useRef(new Animated.Value(0)).current;

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
          isInteraction: false,
        }),
        Animated.timing(dkd_float_value, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
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
          isInteraction: false,
        }),
        Animated.timing(dkd_glow_value, {
          toValue: 0.55,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
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

  useEffect(() => {
    if (!dkd_show_click_hint) {
      dkd_tap_hint_value.stopAnimation();
      dkd_tap_hint_value.setValue(0);
      return undefined;
    }

    const dkd_tap_hint_loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_tap_hint_value, {
          toValue: 1,
          duration: 850,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(dkd_tap_hint_value, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );

    dkd_tap_hint_loop.start();

    return () => {
      dkd_tap_hint_loop.stop();
    };
  }, [dkd_show_click_hint, dkd_tap_hint_value]);

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

  const dkd_click_hint_motion_style = dkd_show_click_hint
    ? {
        opacity: dkd_tap_hint_value.interpolate({
          inputRange: [0, 0.35, 1],
          outputRange: [0.82, 1, 0.82],
        }),
        transform: [
          {
            translateY: dkd_tap_hint_value.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -4],
            }),
          },
          {
            scale: dkd_tap_hint_value.interpolate({
              inputRange: [0, 0.45, 1],
              outputRange: [1, 1.12, 1],
            }),
          },
        ],
      }
    : null;

  return (
    <Animated.View style={[styles.frameWrap, dkd_is_wide && styles.frameWrapWide, dkd_featured_wrap_style]}>
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
          style={[styles.frame, dkd_is_wide && styles.dkd_frame_wide, { borderColor: dkd_tone_style.border }]}
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
              {dkd_icon_third ? (
                <MaterialCommunityIcons
                  name={dkd_icon_third}
                  size={FRAME_ICON_PAIR_SIZE}
                  color={dkd_tone_style.icon}
                  style={styles.frameTopIconSecondary}
                />
              ) : null}
              {dkd_icon_fourth ? (
                <MaterialCommunityIcons
                  name={dkd_icon_fourth}
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
                {dkd_feature_badge_text}
              </Text>
            </View>
          ) : null}
          {dkd_show_click_hint ? (
            <Animated.View style={[styles.dkd_frame_click_hint, dkd_click_hint_motion_style]}>
              <MaterialCommunityIcons name="gesture-tap-button" size={15} color="#06111A" />
              <Text style={styles.dkd_frame_click_hint_text}>Tıkla</Text>
            </Animated.View>
          ) : null}
          <Text style={[styles.frameTitle, dkd_is_wide && styles.dkd_frame_title_wide]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{title}</Text>
          <Text style={[styles.frameSub, dkd_is_wide && styles.dkd_frame_sub_wide]}>{subtitle}</Text>
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
  dkd_on_open_courier_search_value,
}) {
  const prog = useMemo(
    () => normalizeProgression(profile || {}),
    [profile],
  );
  const nickname = String(profile?.nickname || "Oyuncu");
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [energyOpen, setEnergyOpen] = useState(false);
  const shardText = formatNum(profile?.shards || 0);
  const energyNow = Number(energyUI?.energy ?? profile?.energy ?? 0);
  const energyMax = Math.max(
    1,
    Number(energyUI?.max ?? profile?.energy_max ?? 20),
  );
  const energyNextText = String(energyUI?.nextText || "—");
  const energyCountdownText =
    energyNextText === "FULL" ? "Dolu" : energyNextText;
  const dkd_courier_license_active_value = String(profile?.courier_status || "").toLowerCase() === "approved";
  const dkd_xp_shimmer_value = React.useRef(new Animated.Value(0)).current;
  const dkd_energy_glow_value = React.useRef(new Animated.Value(0.82)).current;

  useEffect(() => {
    const dkd_xp_shimmer_loop = Animated.loop(
      Animated.timing(dkd_xp_shimmer_value, {
        toValue: 1,
        duration: 2400,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    const dkd_energy_glow_loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_energy_glow_value, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(dkd_energy_glow_value, {
          toValue: 0.7,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
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
  const dkd_order_search_shimmer_style = {
    transform: [
      {
        translateX: dkd_xp_shimmer_value.interpolate({
          inputRange: [0, 1],
          outputRange: [-118, 184],
        }),
      },
    ],
  };
  const dkd_order_search_track_pulse_style = {
    opacity: dkd_xp_shimmer_value.interpolate({
      inputRange: [0, 0.45, 1],
      outputRange: [0.3, 1, 0.3],
    }),
    transform: [
      {
        translateX: dkd_xp_shimmer_value.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 120],
        }),
      },
    ],
  };
  const dkd_order_searching_chip_style = {
    opacity: dkd_xp_shimmer_value.interpolate({
      inputRange: [0, 0.28, 0.72, 1],
      outputRange: [0.52, 1, 1, 0.52],
    }),
    transform: [
      {
        scale: dkd_xp_shimmer_value.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.96, 1.04, 0.96],
        }),
      },
    ],
  };
  const dkd_order_search_scan_dot_style = {
    opacity: dkd_xp_shimmer_value.interpolate({
      inputRange: [0, 0.18, 0.82, 1],
      outputRange: [0, 1, 1, 0],
    }),
    transform: [
      {
        translateX: dkd_xp_shimmer_value.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 128],
        }),
      },
    ],
  };
  const dkd_order_search_radar_ping_style = {
    opacity: dkd_xp_shimmer_value.interpolate({
      inputRange: [0, 0.42, 1],
      outputRange: [0.18, 0.76, 0.18],
    }),
    transform: [
      {
        scale: dkd_xp_shimmer_value.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.72, 1.42, 0.72],
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
            <View style={styles.dkd_home_version_row}>
              <Text style={styles.headerEyebrow}>DKDapp</Text>
              <View style={styles.dkd_home_version_badge}>
                <Text style={styles.dkd_home_version_text}>DKD_draborneagle_v0.64</Text>
              </View>
            </View>
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
          {dkd_courier_license_active_value ? (
            <Pressable
              hitSlop={8}
              onPress={() => dkd_on_open_courier_search_value?.()}
              style={styles.dkd_home_order_search_button}
            >
              <LinearGradient
                colors={["rgba(99,241,255,0.96)", "rgba(127,139,255,0.92)", "rgba(255,216,108,0.96)"]}
                start={dkd_make_native_axis_point(0, 0.5)}
                end={dkd_make_native_axis_point(1, 0.5)}
                style={styles.dkd_home_order_search_gradient}
              >
                <Animated.View pointerEvents="none" style={[styles.dkd_home_order_search_shimmer, dkd_order_search_shimmer_style]} />
                <View style={styles.dkd_home_order_search_icon_shell}>
                  <Animated.View pointerEvents="none" style={[styles.dkd_home_order_search_radar_ping, dkd_order_search_radar_ping_style]} />
                  <MaterialCommunityIcons name="radar" size={13} color="#06111A" />
                </View>
                <View style={styles.dkd_home_order_search_copy}>
                  <View style={styles.dkd_home_order_search_label_row}>
                    <Text style={styles.dkd_home_order_search_text}>Sipariş ARA</Text>
                    <Animated.View pointerEvents="none" style={[styles.dkd_home_order_search_searching_chip, dkd_order_searching_chip_style]}>
                      <MaterialCommunityIcons name="magnify-scan" size={8} color="#06111A" />
                      <Text style={styles.dkd_home_order_search_searching_text}>BAŞLA</Text>
                    </Animated.View>
                  </View>
                  <View style={styles.dkd_home_order_search_track}>
                    <View style={styles.dkd_home_order_search_track_fill} />
                    <Animated.View pointerEvents="none" style={[styles.dkd_home_order_search_track_pulse, dkd_order_search_track_pulse_style]} />
                    <Animated.View pointerEvents="none" style={[styles.dkd_home_order_search_scan_dot, dkd_order_search_scan_dot_style]} />
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={13} color="#06111A" />
              </LinearGradient>
            </Pressable>
          ) : null}
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
  onOpenSupportPanel,
  onOpenDropList,
  onOpenNearestBoss,
  openCourier,
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
          isInteraction: false,
        }),
        Animated.timing(dkd_live_map_pulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    const dkd_live_map_shimmer_loop = Animated.loop(
      Animated.timing(dkd_live_map_shimmer, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
        isInteraction: false,
      }),
    );
    const dkd_radar_core_loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dkd_radar_core_value, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(dkd_radar_core_value, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
          isInteraction: false,
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
      dkd_icon_secondary: "gift-outline",
      dkd_icon_third: "star-circle-outline",
      tone: "green",
      dkd_is_featured: true,
      dkd_feature_badge_text: "Ödül",
      onPress: () => onOpenDropList?.(),
    },
    {
      key: "market",
      title: "Yemek/Market",
      sub: "Yemek ve market siparişlerini tek yerden aç",
      icon: "storefront-outline",
      dkd_icon_secondary: "silverware-fork-knife",
      dkd_icon_third: "shopping-outline",
      tone: "red",
      dkd_is_featured: true,
      dkd_feature_badge_text: "Sipariş",
      onPress: () => onTabChange?.("market"),
    },
    {
      key: "applications",
      title: "Başvurular",
      sub: "Kurye ve nakliye başvurularını yönet",
      icon: "clipboard-text-search-outline",
      dkd_icon_secondary: "card-account-details-outline",
      tone: "gold",
      onPress: () => onTabChange?.("applications"),
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

  const dkd_home_courier_card_value = {
    key: "courier",
    title: "Kurye-Kargo/Destek Merkezi",
    sub: "Sipariş havuzu, kargo paneli ve nakliye akışını tek merkezden yönet",
    icon: "bike-fast",
    dkd_icon_secondary: "truck-fast-outline",
    dkd_icon_third: "map-marker-path",
    dkd_icon_fourth: "truck-cargo-container",
    tone: "dkd_courier",
    onPress: () => openCourier?.(),
  };

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
        <Pressable onPress={onOpenSupportPanel} style={{ flex: 1 }}>
          <LinearGradient
            colors={["#1E3A8A", "#7C3AED", "#DB2777"]}
            start={dkd_make_native_axis_point(0, 0)}
            end={dkd_make_native_axis_point(1, 1)}
            style={styles.ctaSecondary}
          >
            <MaterialCommunityIcons name="face-agent" size={20} color="#FFF" />
            <Text style={styles.ctaSecondaryText}>Destek Paneli</Text>
          </LinearGradient>
        </Pressable>
      </View>

      <View style={styles.dkdHomeCourierWideSlot}>
        <FrameCard
          title={dkd_home_courier_card_value.title}
          subtitle={dkd_home_courier_card_value.sub}
          icon={dkd_home_courier_card_value.icon}
          dkd_icon_secondary={dkd_home_courier_card_value.dkd_icon_secondary}
          dkd_icon_third={dkd_home_courier_card_value.dkd_icon_third}
          dkd_icon_fourth={dkd_home_courier_card_value.dkd_icon_fourth}
          tone={dkd_home_courier_card_value.tone}
          onPress={dkd_home_courier_card_value.onPress}
          dkd_is_featured
          dkd_is_wide
          dkd_feature_badge_text="PAKETLER"
          dkd_show_click_hint
        />
      </View>

      <View style={styles.frameGrid}>
        {dkd_action_cards.map((dkd_action_item) => (
          <FrameCard
            key={dkd_action_item.key}
            title={dkd_action_item.title}
            subtitle={dkd_action_item.sub}
            icon={dkd_action_item.icon}
            dkd_icon_secondary={dkd_action_item.dkd_icon_secondary}
            dkd_icon_third={dkd_action_item.dkd_icon_third}
            dkd_icon_fourth={dkd_action_item.dkd_icon_fourth}
            tone={dkd_action_item.tone}
            onPress={dkd_action_item.onPress}
            dkd_is_featured={!!dkd_action_item.dkd_is_featured}
            dkd_feature_badge_text={dkd_action_item.dkd_feature_badge_text || "Canlı"}
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
  dkd_map_route_request_value,
  dkd_on_map_route_request_handled_value,
}) {
  const [dkd_home_route_value, dkd_set_home_route_value] = useState(null);
  const [dkd_home_route_loading_value, dkd_set_home_route_loading_value] = useState(false);
  const [dkd_home_route_target_drop_value, dkd_set_home_route_target_drop_value] = useState(null);
  const [dkd_home_user_focus_request_value, dkd_set_home_user_focus_request_value] = useState(0);
  const dkd_home_route_request_ref = useRef(null);
  const dkd_home_open_focus_ref = useRef("");

  useEffect(() => {
    if (!visible) {
      dkd_set_home_route_value(null);
      dkd_set_home_route_loading_value(false);
      dkd_set_home_route_target_drop_value(null);
      dkd_home_open_focus_ref.current = "";
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const dkd_focus_lat_value = Number(currentLocation?.lat);
    const dkd_focus_lng_value = Number(currentLocation?.lng);
    if (!Number.isFinite(dkd_focus_lat_value) || !Number.isFinite(dkd_focus_lng_value)) return;
    if (dkd_home_open_focus_ref.current) return;
    dkd_home_open_focus_ref.current = `${dkd_focus_lat_value}:${dkd_focus_lng_value}`;
    dkd_set_home_user_focus_request_value((dkd_current_focus_request_value) => dkd_current_focus_request_value + 1);
  }, [currentLocation?.lat, currentLocation?.lng, visible]);

  const dkd_start_home_mapbox_route_value = useCallback(async (dkd_drop_value) => {
    if (!dkd_drop_value) {
      onOpenDropList?.();
      return;
    }
    const dkd_destination_coordinate_value = dkd_home_drop_coordinate_value(dkd_drop_value);
    const dkd_origin_point_value = currentLocation?.lat != null && currentLocation?.lng != null
      ? { lat: Number(currentLocation.lat), lng: Number(currentLocation.lng) }
      : null;
    if (!dkd_destination_coordinate_value) {
      Alert.alert("Konum Yok", "Bu sandık için harita koordinatı eksik.");
      return;
    }
    if (!dkd_origin_point_value) {
      Alert.alert("Konum Bekleniyor", "DKDmap rota için önce canlı konum alınmalı.");
      return;
    }
    dkd_set_home_route_target_drop_value(dkd_drop_value);
    dkd_set_home_route_loading_value(true);
    dkd_set_home_route_value(null);
    openDirections?.(dkd_drop_value, { dkd_inline_mapbox_route_only_value: true });
    try {
      const dkd_next_route_value = await dkd_fetch_mapbox_directions_route_value(
        dkd_origin_point_value,
        { lat: dkd_destination_coordinate_value[1], lng: dkd_destination_coordinate_value[0] },
        { dkd_profile_value: "mapbox/driving-traffic", dkd_max_fallback_distance_km_value: 90 },
      );
      dkd_set_home_route_value(dkd_next_route_value);
    } catch (dkd_error_value) {
      dkd_set_home_route_value({
        dkd_coordinate_values: [
          [Number(dkd_origin_point_value.lng), Number(dkd_origin_point_value.lat)],
          dkd_destination_coordinate_value,
        ],
        dkd_point_list_value: [
          { latitude: Number(dkd_origin_point_value.lat), longitude: Number(dkd_origin_point_value.lng) },
          { latitude: Number(dkd_destination_coordinate_value[1]), longitude: Number(dkd_destination_coordinate_value[0]) },
        ],
        dkd_warning_text_value: dkd_error_value?.message || "Mapbox rota oluşturulamadı, düz rota gösteriliyor.",
        dkd_is_fallback_value: true,
      });
    } finally {
      dkd_set_home_route_loading_value(false);
    }
  }, [currentLocation?.lat, currentLocation?.lng, onOpenDropList, openDirections]);

  const dkd_home_route_status_text = dkd_home_route_status_text_value(
    dkd_home_route_loading_value,
    dkd_home_route_value,
    dkd_home_route_target_drop_value,
  );

  const dkd_focus_home_ok_marker_value = useCallback(() => {
    dkd_set_home_user_focus_request_value((dkd_current_focus_request_value) => dkd_current_focus_request_value + 1);
    recenterToCurrentLocation?.();
  }, [recenterToCurrentLocation]);

  useEffect(() => {
    if (!visible) return;
    const dkd_request_key_value = String(dkd_map_route_request_value?.dkd_request_key_value || "");
    const dkd_request_drop_value = dkd_map_route_request_value?.dkd_drop_value || null;
    if (!dkd_request_key_value || !dkd_request_drop_value) return;
    if (String(dkd_home_route_request_ref.current || "") === dkd_request_key_value) return;
    dkd_home_route_request_ref.current = dkd_request_key_value;
    dkd_start_home_mapbox_route_value(dkd_request_drop_value);
    dkd_on_map_route_request_handled_value?.(dkd_request_key_value);
  }, [
    visible,
    dkd_map_route_request_value,
    dkd_start_home_mapbox_route_value,
    dkd_on_map_route_request_handled_value,
  ]);

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
            dkd_route_value={dkd_home_route_value}
            dkd_user_focus_request_value={dkd_home_user_focus_request_value}
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
              <Text style={styles.mapTitle}>DKDmap Canlı Harita</Text>
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
              onPress={dkd_focus_home_ok_marker_value}
              style={styles.utilBtn}
            >
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={20}
                color="#FFF"
              />
            </Pressable>
          </View>
          {dkd_home_route_status_text ? (
            <View style={styles.dkdHomeRouteStatusPill}>
              <MaterialCommunityIcons name={dkd_home_route_loading_value ? "routes-clock" : "routes"} size={15} color="#201508" />
              <Text style={styles.dkdHomeRouteStatusText} numberOfLines={2}>{dkd_home_route_status_text}</Text>
            </View>
          ) : null}
          <DropDockPanel
            visibleCount={visibleDrops.length}
            dockPreview={dockPreview}
            dockPreviewPending={dockPreviewPending}
            hiddenBossCountToday={hiddenBossCountToday}
            nextBossReturnText={nextBossReturnText}
            isNear={isNear}
            etaTextFromDistance={etaTextFromDistance}
            onOpenList={onOpenDropList}
            onDirections={dkd_start_home_mapbox_route_value}
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
  onOpenNearestBoss,
  dkd_map_route_request_value,
  dkd_on_map_route_request_handled_value,
}) {
  const [liveMapOpen, setLiveMapOpen] = useState(false);
  const [dkd_support_panel_open, dkd_set_support_panel_open] = useState(false);
  const dkd_open_support_panel = useCallback(() => {
    dkd_set_support_panel_open(true);
  }, []);
  const dkd_close_support_panel = useCallback(() => {
    dkd_set_support_panel_open(false);
  }, []);
  useEffect(() => {
    if (activeTab !== "map") setLiveMapOpen(false);
  }, [activeTab]);
  useEffect(() => {
    if (!dkd_map_route_request_value?.dkd_drop_value) return;
    onTabChange?.("map");
    setLiveMapOpen(true);
  }, [dkd_map_route_request_value, onTabChange]);
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
        dkd_on_open_courier_search_value={() => onOpenCourierBoard?.('online_search')}
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
          onOpenSupportPanel={dkd_open_support_panel}
          onOpenDropList={onOpenDropList}
          onOpenNearestBoss={onOpenNearestBoss}
          openCourier={onOpenCourierBoard}
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
        dkd_map_route_request_value={dkd_map_route_request_value}
        dkd_on_map_route_request_handled_value={dkd_on_map_route_request_handled_value}
      />
      {dkd_render_support_panel_modal({
        dkd_visible: dkd_support_panel_open,
        dkd_on_close: dkd_close_support_panel,
      })}
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
  dkd_home_version_row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },
  headerEyebrow: {
    color: "#69DAFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  dkd_home_version_badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(255, 211, 105, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 211, 105, 0.36)",
  },
  dkd_home_version_text: {
    color: "#FFE7A3",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.35,
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
  progressMetaTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  dkd_home_order_search_button: {
    minWidth: 172,
    minHeight: 26,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(126,235,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    shadowColor: "#61F1FF",
    shadowOpacity: 0.24,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  dkd_home_order_search_gradient: {
    minHeight: 26,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    position: "relative",
    overflow: "hidden",
  },
  dkd_home_order_search_shimmer: {
    position: "absolute",
    top: -10,
    bottom: -10,
    width: 36,
    backgroundColor: "rgba(255,255,255,0.28)",
    transform: [{ rotate: "18deg" }],
  },
  dkd_home_order_search_icon_shell: {
    width: 19,
    height: 19,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderWidth: 1,
    borderColor: "rgba(6,17,26,0.13)",
    position: "relative",
    overflow: "hidden",
  },
  dkd_home_order_search_radar_ping: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(6,17,26,0.46)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  dkd_home_order_search_copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dkd_home_order_search_label_row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  dkd_home_order_search_text: {
    color: "#06111A",
    fontSize: 9,
    fontWeight: "950",
    letterSpacing: 0.24,
  },
  dkd_home_order_search_searching_chip: {
    minHeight: 13,
    borderRadius: 999,
    paddingHorizontal: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderWidth: 1,
    borderColor: "rgba(6,17,26,0.11)",
  },
  dkd_home_order_search_searching_text: {
    color: "#06111A",
    fontSize: 7,
    lineHeight: 9,
    fontWeight: "950",
    letterSpacing: 0.16,
    textTransform: "uppercase",
  },
  dkd_home_order_search_track: {
    height: 3,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(6,17,26,0.22)",
  },
  dkd_home_order_search_track_fill: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  dkd_home_order_search_track_pulse: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 24,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  dkd_home_order_search_scan_dot: {
    position: "absolute",
    top: -2,
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(6,17,26,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
  },
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
  dkdHomeCourierWideSlot: {
    marginTop: 10,
    marginHorizontal: -4,
  },
  frameGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    marginHorizontal: -4,
  },
  frameWrap: { width: "50%", padding: 4 },
  frameWrapWide: { width: "100%" },
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
  dkd_frame_wide: {
    minHeight: HOME_IS_COMPACT ? 118 : 124,
    borderRadius: 22,
    padding: 15,
    shadowColor: "#8CF2FF",
    shadowOpacity: 0.20,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 10,
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
  dkd_frame_click_hint: { position: "absolute", right: 12, bottom: 12, minHeight: 27, borderRadius: 999, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#8CF2FF", borderWidth: 1, borderColor: "rgba(255,255,255,0.72)", shadowColor: "#8CF2FF", shadowOpacity: 0.34, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 7 },
  dkd_frame_click_hint_text: { color: "#06111A", fontSize: 10.5, fontWeight: "950", letterSpacing: 0.2 },
  frameTitle: { color: "#FFF", fontSize: 14, fontWeight: "900" },
  dkd_frame_title_wide: { fontSize: HOME_IS_COMPACT ? 17 : 18, lineHeight: HOME_IS_COMPACT ? 21 : 22 },
  frameSub: {
    color: "rgba(255,255,255,0.70)",
    fontSize: 9,
    lineHeight: 13,
    marginTop: 4,
  },
  dkd_frame_sub_wide: {
    color: "rgba(239,252,255,0.78)",
    fontSize: HOME_IS_COMPACT ? 10.5 : 11,
    lineHeight: HOME_IS_COMPACT ? 15 : 16,
    maxWidth: "86%",
  },
  dkdHomeMapMarkerWrap: {
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    paddingBottom: 18,
  },
  dkdHomeMapMarkerAssetGhost: {
    position: "absolute",
    width: 84,
    height: 84,
    top: -10,
    opacity: 0.18,
  },
  dkdHomeMapMarkerBadge: {
    position: "absolute",
    top: -4,
    minWidth: 48,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,17,30,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    zIndex: 2,
  },
  dkdHomeMapMarkerBadgeText: {
    color: "#F8FBFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  dkdHomeMapMarkerMainStack: {
    alignItems: "center",
    justifyContent: "center",
  },
  dkdHomeMapMarkerShell: {
    width: 52,
    height: 52,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.62)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 7,
  },
  dkdHomeMapMarkerBoss: {
    borderColor: "rgba(255,224,207,0.90)",
    shadowColor: "#FF7A88",
  },
  dkdHomeMapMarkerChest: {
    borderColor: "rgba(229,226,255,0.92)",
    shadowColor: "#7F7BFF",
  },
  dkdHomeMapMarkerReward: {
    borderColor: "rgba(255,247,207,0.94)",
    shadowColor: "#FFB648",
  },
  dkdHomeMapMarkerActive: {
    transform: [{ scale: 1.06 }],
    shadowOpacity: 0.34,
    shadowRadius: 16,
    elevation: 9,
  },
  dkdHomeMapMarkerNear: {
    borderColor: "#9DFFE2",
    shadowColor: "#7BFFD9",
    shadowOpacity: 0.34,
  },
  dkdHomeMapMarkerCooldown: {
    opacity: 0.55,
  },
  dkdHomeMapMarkerPointer: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginTop: -7,
    transform: [{ rotate: "45deg" }],
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.36)",
  },
  dkdHomeMapMarkerNamePill: {
    maxWidth: 158,
    marginTop: 7,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(6,17,30,0.92)",
    borderWidth: 1,
    borderColor: "rgba(125,184,255,0.24)",
  },
  dkdHomeMapMarkerNameText: {
    color: "#F7FBFF",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  dkdHomeMapMarkerAssetIconFrame: {
    width: 56,
    height: 56,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dkdHomeMapMarkerBossAssetIconFrame: {
    backgroundColor: "rgba(55,5,13,0.42)",
  },
  dkdHomeMapMarkerAssetIcon: {
    width: 54,
    height: 54,
  },
  dkdHomeBossVisualCard: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  dkdHomeBossVisualCore: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,230,174,0.92)",
  },
  dkdHomeBossVisualHornLeft: {
    position: "absolute",
    width: 14,
    height: 14,
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "#FFE7B8",
    top: -4,
    left: 5,
    transform: [{ rotate: "-28deg" }],
  },
  dkdHomeBossVisualHornRight: {
    position: "absolute",
    width: 14,
    height: 14,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    backgroundColor: "#FFE7B8",
    top: -4,
    right: 5,
    transform: [{ rotate: "28deg" }],
  },
  dkdHomeBossVisualCrownBadge: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFD56C",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.88)",
  },
  dkdHomeBossVisualRaidPill: {
    position: "absolute",
    bottom: -2,
    minWidth: 42,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(6,17,30,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,230,174,0.72)",
  },
  dkdHomeBossVisualRaidText: {
    color: "#FFE7B8",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  dkdHomeRouteStatusPill: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: HOME_IS_TIGHT ? 226 : 214,
    minHeight: 42,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,213,108,0.94)",
    borderWidth: 1,
    borderColor: "rgba(255,247,207,0.72)",
    zIndex: 20,
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
  },
  dkdHomeRouteStatusText: {
    flex: 1,
    color: "#201508",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 8,
    lineHeight: 16,
  },
  dkdHomeMapboxFallbackPill: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(7,17,30,0.88)",
    borderWidth: 1,
    borderColor: "rgba(140,242,255,0.24)",
  },
  dkdHomeMapboxFallbackText: {
    color: "#DDFBFF",
    fontSize: 10,
    fontWeight: "800",
    marginLeft: 6,
    textAlign: "center",
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
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  userPulseRing: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(104,232,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(104,232,255,0.18)",
  },
  userRingOuter: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(98,214,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(98,214,255,0.52)",
  },
  userRingInner: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(98,214,255,0.28)",
  },
  userMarkerCore: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#68E8FF",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#68E8FF",
    shadowOpacity: 0.34,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  userHeadingIcon: {
    transform: [{ rotate: "45deg" }],
    marginTop: -1,
    marginLeft: 1,
  },
  userDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#68E8FF",
    bottom: 9,
  },
});

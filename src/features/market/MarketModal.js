import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import SafeScreen from "../../components/layout/SafeScreen";
import FuturisticCardTile from "../collection/FuturisticCardTile";
import { cityLootTheme as theme } from "../../theme/cityLootTheme";
import {
  minimalLootUi as ui,
  cardFromEntry,
  formatNum,
  rarityAccent,
} from "../../theme/minimalLootUi";
import useDeferredVisibility from "../../hooks/useDeferredVisibility";
import {
  buyBusinessProductWithToken,
  fetchBusinessMarketCatalog,
} from "../../services/businessProductService";

const DEFAULT_SHOP_UI = {
  hero_kicker: "TOKEN MAĞAZASI",
  hero_title: "Anında al, anında kullan",
  hero_subtitle:
    "Token cüzdanınla shard, boss bileti ve enerji satın al. Her paket ne işe yaradığını açık şekilde gösterir.",
  logic_title: "Paket mantığı",
  logic_body:
    "Shard = craft ve upgrade, Bilet = boss girişi, Enerji = daha fazla drop ve sandık akışı.",
  hero_icon_name: "shopping-outline",
  hero_icon_accent: "cyan",
  hero_background_image_url: "",
  hero_visual_preset: "aurora",
};

const DEFAULT_SHOP_DEFS = [
  {
    id: 1,
    pack_key: "shard_40",
    title: "40 Shard",
    subtitle: "Craft ve kart yükseltme stoğu",
    description:
      "Özellikle marketten aldığın kartları hızlı güçlendirmek için ideal.",
    badge_label: "Craft",
    icon_name: "diamond-stone",
    accent_key: "cyan",
    price_token: 160,
    reward_kind: "shard",
    reward_amount: 40,
    sort_order: 10,
    panel_style: "featured",
    background_tone: "auto",
    visual_preset: "auto",
    art_image_url: "",
    is_active: true,
  },
  {
    id: 2,
    pack_key: "ticket_1",
    title: "1 Boss Bileti",
    subtitle: "Baskına direkt giriş hakkı",
    description:
      "Haritadaki boss alanına yeniden hazır girmek için tekli paket.",
    badge_label: "Raid",
    icon_name: "ticket-confirmation-outline",
    accent_key: "purple",
    price_token: 360,
    reward_kind: "ticket",
    reward_amount: 1,
    sort_order: 20,
    panel_style: "featured",
    background_tone: "auto",
    visual_preset: "auto",
    art_image_url: "",
    is_active: true,
  },
  {
    id: 3,
    pack_key: "energy_5",
    title: "5 Enerji",
    subtitle: "Anlık kısa akış takviyesi",
    description:
      "Harita ve sandık turuna hızla geri dönmek için hızlı enerji yüklemesi.",
    badge_label: "Hızlı",
    icon_name: "lightning-bolt-outline",
    accent_key: "gold",
    price_token: 120,
    reward_kind: "energy",
    reward_amount: 5,
    sort_order: 30,
    panel_style: "featured",
    background_tone: "auto",
    visual_preset: "auto",
    art_image_url: "",
    is_active: true,
  },
  {
    id: 4,
    pack_key: "energy_10",
    title: "10 Enerji",
    subtitle: "Uzun rota için güçlü stok",
    description:
      "Özellikle yoğun drop turu ve görev akışında daha uzun oynamak için.",
    badge_label: "Pro",
    icon_name: "battery-charging-medium",
    accent_key: "gold",
    price_token: 220,
    reward_kind: "energy",
    reward_amount: 10,
    sort_order: 40,
    panel_style: "featured",
    background_tone: "auto",
    visual_preset: "auto",
    art_image_url: "",
    is_active: true,
  },
];

function getAccentColors(tone = "cyan") {
  if (tone === "gold") {
    return {
      softBg: "rgba(243,199,119,0.16)",
      softBorder: "rgba(243,199,119,0.30)",
      icon: "#F9D985",
      chip: ["rgba(243,199,119,0.22)", "rgba(243,199,119,0.08)"],
      button: ["#35597B", "#233A56"],
    };
  }
  if (tone === "purple") {
    return {
      softBg: "rgba(158,140,255,0.16)",
      softBorder: "rgba(158,140,255,0.30)",
      icon: "#CBB5FF",
      chip: ["rgba(158,140,255,0.22)", "rgba(158,140,255,0.08)"],
      button: ["#35597B", "#233A56"],
    };
  }
  return {
    softBg: "rgba(108,203,255,0.16)",
    softBorder: "rgba(108,203,255,0.30)",
    icon: "#9FE9FF",
    chip: ["rgba(108,203,255,0.22)", "rgba(108,203,255,0.08)"],
    button: ["#35597B", "#233A56"],
  };
}

function getPresetTone(preset = "auto") {
  if (preset === "aurora") return "violet";
  if (preset === "neon") return "midnight";
  if (preset === "gold") return "sunset";
  if (preset === "frost") return "emerald";
  return "auto";
}

function getHeroPresetColors(preset = "aurora") {
  if (preset === "neon") return ["rgba(11,33,61,0.96)", "rgba(10,19,38,0.98)"];
  if (preset === "gold") return ["rgba(44,28,12,0.94)", "rgba(20,17,30,0.98)"];
  if (preset === "frost") return ["rgba(12,34,42,0.94)", "rgba(8,20,30,0.98)"];
  return ["rgba(22,18,44,0.94)", "rgba(10,18,30,0.98)"];
}

function getSurfaceByTone(tone = "auto", preset = "auto") {
  const dkd_tone = tone === "auto" ? getPresetTone(preset) : tone;
  if (dkd_tone === "sunset")
    return ["rgba(42,18,24,0.98)", "rgba(19,12,28,0.98)"];
  if (dkd_tone === "emerald")
    return ["rgba(10,31,28,0.98)", "rgba(8,18,24,0.98)"];
  if (dkd_tone === "violet")
    return ["rgba(23,18,40,0.98)", "rgba(8,14,30,0.98)"];
  if (dkd_tone === "midnight")
    return ["rgba(8,16,28,0.98)", "rgba(5,10,20,0.98)"];
  return ["rgba(14,27,43,0.98)", "rgba(9,18,29,0.98)"];
}

function getShopCardMetrics(panelStyle = "featured") {
  if (panelStyle === "compact")
    return {
      minHeight: 252,
      titleSize: 16,
      descriptionMinHeight: 46,
      imageHeight: 82,
    };
  if (panelStyle === "minimal")
    return {
      minHeight: 268,
      titleSize: 17,
      descriptionMinHeight: 52,
      imageHeight: 96,
    };
  return {
    minHeight: 304,
    titleSize: 18,
    descriptionMinHeight: 68,
    imageHeight: 112,
  };
}

function buildRows(items, size = 2) {
  const rows = [];
  const list = Array.isArray(items) ? items : [];
  for (
    let dkd_index_value = 0;
    dkd_index_value < list.length;
    dkd_index_value += size
  )
    rows.push(list.slice(dkd_index_value, dkd_index_value + size));
  return rows;
}

function getDkdRaritySortRank(dkd_rarity_value) {
  const dkd_key = String(dkd_rarity_value || "common").toLowerCase();
  if (dkd_key === "mythic") return 5;
  if (dkd_key === "legendary") return 4;
  if (dkd_key === "epic") return 3;
  if (dkd_key === "rare") return 2;
  return 1;
}

function getDkdRaritySectionMeta(dkd_rarity_value) {
  const dkd_rarity_ui = rarityAccent(dkd_rarity_value);
  const dkd_key = String(dkd_rarity_value || "common").toLowerCase();
  if (dkd_key === "mythic") {
    return {
      ...dkd_rarity_ui,
      sectionColors: ["rgba(86,19,58,0.98)", "rgba(24,9,22,0.98)"],
      pillBg: "rgba(255,111,167,0.18)",
      pillBorder: "rgba(255,111,167,0.32)",
    };
  }
  if (dkd_key === "legendary") {
    return {
      ...dkd_rarity_ui,
      sectionColors: ["rgba(68,45,10,0.98)", "rgba(24,14,8,0.98)"],
      pillBg: "rgba(246,205,103,0.18)",
      pillBorder: "rgba(246,205,103,0.32)",
    };
  }
  if (dkd_key === "epic") {
    return {
      ...dkd_rarity_ui,
      sectionColors: ["rgba(42,25,70,0.98)", "rgba(14,10,28,0.98)"],
      pillBg: "rgba(170,136,255,0.18)",
      pillBorder: "rgba(170,136,255,0.32)",
    };
  }
  if (dkd_key === "rare") {
    return {
      ...dkd_rarity_ui,
      sectionColors: ["rgba(16,58,77,0.98)", "rgba(8,16,28,0.98)"],
      pillBg: "rgba(103,219,255,0.18)",
      pillBorder: "rgba(103,219,255,0.32)",
    };
  }
  return {
    ...dkd_rarity_ui,
    sectionColors: ["rgba(24,35,49,0.98)", "rgba(10,14,22,0.98)"],
    pillBg: "rgba(255,255,255,0.10)",
    pillBorder: "rgba(255,255,255,0.16)",
  };
}

function StatBox({ icon, label, value, accent }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient
        colors={["rgba(16,30,48,0.96)", "rgba(10,19,31,0.98)"]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.statIcon,
          { backgroundColor: `${accent}1c`, borderColor: `${accent}38` },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Tag({ label, tone = "cyan" }) {
  const palette =
    tone === "gold"
      ? { bg: "rgba(243,199,119,0.12)", border: "rgba(243,199,119,0.22)" }
      : tone === "purple"
        ? { bg: "rgba(158,140,255,0.12)", border: "rgba(158,140,255,0.22)" }
        : { bg: "rgba(108,203,255,0.12)", border: "rgba(108,203,255,0.22)" };
  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function SnapshotCard({ icon, label, value, tone = "cyan" }) {
  const palette = getAccentColors(tone);
  return (
    <View
      style={[
        styles.snapshotCard,
        { backgroundColor: palette.softBg, borderColor: palette.softBorder },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={18} color={palette.icon} />
      <Text style={styles.snapshotLabel}>{label}</Text>
      <Text style={styles.snapshotValue}>{value}</Text>
    </View>
  );
}

function ShopPackCard({ item, onPress, busy }) {
  const accent = getAccentColors(item?.accent_key || "cyan");
  const rewardKind = String(item?.reward_kind || "").toLowerCase();
  const rewardAmount = Number(item?.reward_amount || 0);
  const rewardText =
    rewardKind === "energy"
      ? `${rewardAmount} enerji`
      : rewardKind === "ticket"
        ? `${rewardAmount} boss bileti`
        : rewardKind === "token"
          ? `${rewardAmount} token`
          : rewardKind === "xp"
            ? `${rewardAmount} XP`
            : `${rewardAmount} shard`;
  const dkd_surface = getSurfaceByTone(
    item?.background_tone || "auto",
    item?.visual_preset || "auto",
  );
  const dkd_metrics = getShopCardMetrics(item?.panel_style || "featured");
  const dkd_hasArt = !!String(item?.art_image_url || "").trim();

  return (
    <View style={[styles.packCard, { minHeight: dkd_metrics.minHeight }]}>
      <LinearGradient colors={dkd_surface} style={StyleSheet.absoluteFill} />
      {dkd_hasArt ? (
        <View style={[styles.packArtWrap, { height: dkd_metrics.imageHeight }]}>
          <Image
            source={{ uri: String(item?.art_image_url || "").trim() }}
            style={styles.packArtImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(7,14,24,0.10)", "rgba(7,14,24,0.70)"]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}
      <View style={[styles.packGlow, dkd_hasArt && styles.packGlowWithArt]} />
      <View style={styles.packTop}>
        <View
          style={[
            styles.packIconWrap,
            { backgroundColor: accent.softBg, borderColor: accent.softBorder },
          ]}
        >
          <MaterialCommunityIcons
            name={item?.icon_name || "cube-outline"}
            size={22}
            color={accent.icon}
          />
        </View>
        <LinearGradient colors={accent.chip} style={styles.packBadge}>
          <Text style={styles.packBadgeText}>
            {String(item?.badge_label || "Paket")}
          </Text>
        </LinearGradient>
      </View>

      <Text style={[styles.packTitle, { fontSize: dkd_metrics.titleSize }]}>
        {String(item?.title || "Paket")}
      </Text>
      <Text style={styles.packSubtitle}>
        {String(item?.subtitle || "Market paketi")}
      </Text>
      <Text
        style={[
          styles.packDescription,
          { minHeight: dkd_metrics.descriptionMinHeight },
        ]}
      >
        {String(item?.description || "")}
      </Text>

      <View style={styles.packMetaRow}>
        <View style={styles.packPriceRow}>
          <MaterialCommunityIcons
            name="cash-multiple"
            size={15}
            color={ui.colors.gold}
          />
          <Text style={styles.packPriceText}>
            {formatNum(item?.price_token || 0)} token
          </Text>
        </View>
        <Text style={styles.packRewardText}>{rewardText}</Text>
      </View>

      <Pressable
        onPress={onPress}
        disabled={busy}
        style={({ pressed }) => [
          styles.packAction,
          pressed && styles.actionPressed,
          busy && styles.actionDisabled,
        ]}
      >
        <LinearGradient
          colors={accent.button}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.packActionText}>
          {busy ? "Bekle…" : "Satın al"}
        </Text>
      </Pressable>
    </View>
  );
}

function ListingCard({ item, mine, onOpenCard, onCancel, onBuy }) {
  const card = cardFromEntry(item);
  const rarity = rarityAccent(card?.rarity);

  return (
    <View style={styles.listingCard}>
      <LinearGradient
        colors={["rgba(14,27,43,0.98)", "rgba(9,18,29,0.98)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.listingTopRow}>
        <View
          style={[
            styles.rarityPill,
            { backgroundColor: rarity.bg, borderColor: rarity.border },
          ]}
        >
          <Text style={[styles.rarityText, { color: rarity.text }]}>
            {rarity.label}
          </Text>
        </View>
        <View style={styles.pricePill}>
          <MaterialCommunityIcons
            name="cash-multiple"
            size={13}
            color={ui.colors.gold}
          />
          <Text style={styles.priceText}>{formatNum(item.price_token)}</Text>
        </View>
      </View>

      <Pressable onPress={() => onOpenCard?.(card)} style={styles.tileWrap}>
        <FuturisticCardTile
          name={card?.name}
          rarity={card?.rarity}
          series={card?.series}
          theme={card?.theme}
          dropType="market"
          imageUrl={
            card?.art_image_url ||
            item?.card_art_image_url ||
            card?.image_url ||
            ""
          }
          serialCode={card?.serial_code || card?.serialCode || ""}
          compact
        />
      </Pressable>

      <Text style={styles.cardName} numberOfLines={1}>
        {card?.name || "Kart"}
      </Text>
      <Text style={styles.cardMeta} numberOfLines={1}>
        {card?.series || "GENEL"} • {mine ? "Senin ilanın" : "Açık pazar"}
      </Text>

      <Pressable
        onPress={() => (mine ? onCancel?.(item.id) : onBuy?.(item.id))}
        style={({ pressed }) => [
          styles.listingAction,
          mine && styles.listingActionMuted,
          pressed && styles.actionPressed,
        ]}
      >
        {!mine ? (
          <LinearGradient
            colors={["rgba(108,203,255,0.24)", "rgba(47,141,255,0.16)"]}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <Text style={styles.listingActionText}>
          {mine ? "İlanı kaldır" : "Satın al"}
        </Text>
      </Pressable>
    </View>
  );
}

function DkdMiniCardPreview({
  dkd_card_entry,
  dkd_preview_meta,
  dkd_is_selected = false,
  dkd_on_open_press,
  dkd_on_select_press,
  dkd_select_label = "İlan için seç",
}) {
  const dkd_card = dkd_card_entry?.card || dkd_card_entry || {};
  const dkd_card_name = String(dkd_card?.name || "Kart");
  const dkd_card_series = String(dkd_card?.series || "GENEL");
  const dkd_card_theme = String(dkd_card?.theme || "Fütüristik");
  const dkd_serial_text =
    String(dkd_card?.serial_code || dkd_card?.serialCode || "").trim() ||
    `YL-${dkd_card_name.replace(/\s+/g, "").slice(0, 3).toUpperCase()}`;

  return (
    <View
      style={[
        styles.dkdMiniPreviewCard,
        dkd_is_selected && styles.dkdMiniPreviewCardActive,
      ]}
    >
      <LinearGradient
        colors={
          dkd_preview_meta?.sectionColors ||
          ["rgba(24,35,49,0.98)", "rgba(10,14,22,0.98)"]
        }
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.dkdMiniPreviewTopRow}>
        <View
          style={[
            styles.dkdMiniPreviewRarityPill,
            {
              backgroundColor:
                dkd_preview_meta?.pillBg || "rgba(255,255,255,0.10)",
              borderColor:
                dkd_preview_meta?.pillBorder || "rgba(255,255,255,0.16)",
            },
          ]}
        >
          <Text
            style={[
              styles.dkdMiniPreviewRarityText,
              { color: dkd_preview_meta?.text || theme.colors.text },
            ]}
          >
            {dkd_preview_meta?.label || rarityAccent(dkd_card?.rarity).label}
          </Text>
        </View>
        {dkd_is_selected ? (
          <View style={styles.dkdMiniPreviewSelectedBadge}>
            <MaterialCommunityIcons
              name="check-circle"
              size={14}
              color="#7DF5D0"
            />
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={() => dkd_on_open_press?.(dkd_card)}
        style={({ pressed }) => [
          styles.dkdMiniPreviewTouchArea,
          pressed && styles.actionPressed,
        ]}
      >
        <View style={styles.dkdMiniPreviewArtDock}>
          <MaterialCommunityIcons
            name="cards-outline"
            size={18}
            color={dkd_preview_meta?.text || "#FFFFFF"}
          />
        </View>
        <Text style={styles.dkdMiniPreviewSerial} numberOfLines={1}>
          {dkd_serial_text}
        </Text>
        <Text style={styles.dkdMiniPreviewName} numberOfLines={1}>
          {dkd_card_name}
        </Text>
        <Text style={styles.dkdMiniPreviewMeta} numberOfLines={1}>
          {dkd_card_series} • {dkd_card_theme}
        </Text>
        <View style={styles.dkdMiniPreviewInspectRow}>
          <MaterialCommunityIcons
            name="magnify-plus-outline"
            size={13}
            color="rgba(255,255,255,0.82)"
          />
          <Text style={styles.dkdMiniPreviewInspectText}>Detayı aç</Text>
        </View>
      </Pressable>

      {!!dkd_on_select_press ? (
        <Pressable
          onPress={dkd_on_select_press}
          style={({ pressed }) => [
            styles.dkdMiniPreviewSelectButton,
            dkd_is_selected && styles.dkdMiniPreviewSelectButtonActive,
            pressed && styles.actionPressed,
          ]}
        >
          <Text style={styles.dkdMiniPreviewSelectButtonText}>
            {dkd_is_selected ? "Seçildi" : dkd_select_label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <MaterialCommunityIcons
        name="store-search-outline"
        size={24}
        color="rgba(255,255,255,0.56)"
      />
      <Text style={styles.emptyTitle}>Şu an açık ilan yok</Text>
      <Text style={styles.emptySub}>
        İlk ilanı sen vererek market akışını başlatabilirsin.
      </Text>
    </View>
  );
}

function formatProductPriceLabel(item) {
  const cash =
    item?.product_price_tl == null ? item?.price_cash : item?.product_price_tl;
  const currency = String(
    item?.product_price_currency || item?.currency_code || "TRY",
  ).toUpperCase();
  const amount = Number(cash);
  if (!Number.isFinite(amount) || amount <= 0) return "Ürün fiyatı bilgisi yok";
  const suffix = currency === "TRY" ? "TL" : currency;
  return `Ürün fiyatı ${amount.toFixed(amount % 1 === 0 ? 0 : 2)} ${suffix}`;
}

function formatProductPriceValue(item) {
  const cash =
    item?.product_price_tl == null ? item?.price_cash : item?.product_price_tl;
  const currency = String(
    item?.product_price_currency || item?.currency_code || "TRY",
  ).toUpperCase();
  const amount = Number(cash);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const suffix = currency === "TRY" ? "TL" : currency;
  return `${amount.toFixed(amount % 1 === 0 ? 0 : 2)} ${suffix}`;
}

export default function MarketModal({
  visible,
  onClose,
  loading,
  listings,
  myListings,
  profile,
  currentLocation,
  energyDisplay,
  shopDefs,
  shopUi,
  onRefresh,
  onBuy,
  onCancel,
  onList,
  userCards,
  onOpenCard,
  refreshProfile,
}) {
  const [price, setPrice] = useState("50");
  const [selected, setSelected] = useState(null);
  const [merchantLoading, setMerchantLoading] = useState(false);
  const [merchantProducts, setMerchantProducts] = useState([]);
  const [merchantBuyingId, setMerchantBuyingId] = useState("");
  const [deliveryAddressText, setDeliveryAddressText] = useState("");
  const [deliveryNoteText, setDeliveryNoteText] = useState("");
  const [dkd_market_section, dkd_set_market_section] = useState("shop");
  const [dkd_sell_page_mode, dkd_set_sell_page_mode] = useState("overview");
  const [dkd_sell_active_rarity_key, dkd_set_sell_active_rarity_key] = useState("");
  const listReady = useDeferredVisibility(visible, true);

  const marketListings = Array.isArray(listings) ? listings : [];
  const ownListings = Array.isArray(myListings) ? myListings : [];
  const dkd_sellable_cards_sorted = useMemo(() => {
    const dkd_source_cards = Array.isArray(userCards) ? userCards.slice() : [];
    return dkd_source_cards
      .sort((dkd_left_card_entry, dkd_right_card_entry) => {
        const dkd_left_card = dkd_left_card_entry?.card || dkd_left_card_entry || {};
        const dkd_right_card = dkd_right_card_entry?.card || dkd_right_card_entry || {};
        const dkd_rarity_delta =
          getDkdRaritySortRank(dkd_right_card?.rarity) -
          getDkdRaritySortRank(dkd_left_card?.rarity);
        if (dkd_rarity_delta !== 0) return dkd_rarity_delta;
        const dkd_left_name = String(dkd_left_card?.name || "");
        const dkd_right_name = String(dkd_right_card?.name || "");
        const dkd_name_delta = dkd_left_name.localeCompare(dkd_right_name, "tr");
        if (dkd_name_delta !== 0) return dkd_name_delta;
        return Number(dkd_left_card_entry?.id || 0) - Number(dkd_right_card_entry?.id || 0);
      })
      .slice(0, 24);
  }, [userCards]);
  const myId = String(profile?.user_id || profile?.id || "");
  const token = Number(profile?.token || 0);
  const hasLiveLocation =
    Number.isFinite(Number(currentLocation?.lat)) &&
    Number.isFinite(Number(currentLocation?.lng));
  const selectedCard = selected?.card || {};
  const liveEnergy = Number(energyDisplay?.energy ?? profile?.energy ?? 0);
  const liveEnergyMax = Number(energyDisplay?.max ?? profile?.energy_max ?? 0);
  const marketUi = { ...DEFAULT_SHOP_UI, ...(shopUi || {}) };
  const marketShopDefs = useMemo(() => {
    const rows = (
      Array.isArray(shopDefs) && shopDefs.length ? shopDefs : DEFAULT_SHOP_DEFS
    )
      .filter((item) => item?.is_active !== false)
      .sort(
        (dkd_left_value, dkd_right_value) =>
          Number(dkd_left_value?.sort_order || 0) -
          Number(dkd_right_value?.sort_order || 0),
      );
    return rows;
  }, [shopDefs]);
  const shopRows = useMemo(
    () => buildRows(marketShopDefs, 2),
    [marketShopDefs],
  );

  const merchantSections = useMemo(() => {
    const groups = new Map();
    (Array.isArray(merchantProducts) ? merchantProducts : []).forEach(
      (item) => {
        const key = `${String(item?.business_id || "")}:${String(item?.business_name || "İşletme")}`;
        const current = groups.get(key) || {
          key,
          businessName: item?.business_name || "İşletme",
          businessCategory: item?.business_category || "genel",
          items: [],
        };
        current.items.push(item);
        groups.set(key, current);
      },
    );
    return Array.from(groups.values()).map((section) => ({
      ...section,
      items: section.items
        .slice()
        .sort(
          (dkd_left_value, dkd_right_value) =>
            Number(dkd_left_value?.sort_order || 0) -
            Number(dkd_right_value?.sort_order || 0),
        ),
    }));
  }, [merchantProducts]);
  const dkd_market_section_cards = useMemo(
    () => [
      {
        key: "shop",
        title: "Takviye Ürünler",
        subtitle: "Token ile hızlı takviye al",
        icon: "shopping-outline",
        iconBg: "rgba(87,236,198,0.18)",
        iconBorder: "rgba(87,236,198,0.28)",
        colors: ["rgba(20,94,84,0.98)", "rgba(8,28,30,0.98)"],
        badge: `${formatNum(marketShopDefs.length)} paket`,
      },
      {
        key: "merchant",
        title: "İşletme Ürünler",
        subtitle: "Canlı vitrin ve teslimat akışı",
        icon: "storefront-outline",
        iconBg: "rgba(114,153,255,0.18)",
        iconBorder: "rgba(114,153,255,0.28)",
        colors: ["rgba(36,52,122,0.98)", "rgba(10,21,48,0.98)"],
        badge: `${formatNum(merchantSections.length)} vitrin`,
      },
      {
        key: "sell",
        title: "Kart Satışı",
        subtitle: "Kart ilanlarını yönet ve sat",
        icon: "tag-heart-outline",
        iconBg: "rgba(211,109,255,0.16)",
        iconBorder: "rgba(211,109,255,0.30)",
        colors: ["rgba(96,26,106,0.98)", "rgba(28,10,42,0.98)"],
        badge: `${formatNum(ownListings.length)} ilan`,
      },
    ],
    [marketShopDefs.length, merchantSections.length, ownListings.length],
  );
  const dkd_sell_rarity_sections = useMemo(() => {
    const dkd_group_map = new Map();
    dkd_sellable_cards_sorted.forEach((dkd_card_entry) => {
      const dkd_card = dkd_card_entry?.card || dkd_card_entry || {};
      const dkd_rarity_key = String(dkd_card?.rarity || "common").toLowerCase();
      const dkd_current_group = dkd_group_map.get(dkd_rarity_key) || {
        key: dkd_rarity_key,
        title: getDkdRaritySectionMeta(dkd_rarity_key).label,
        meta: getDkdRaritySectionMeta(dkd_rarity_key),
        items: [],
      };
      dkd_current_group.items.push(dkd_card_entry);
      dkd_group_map.set(dkd_rarity_key, dkd_current_group);
    });
    return Array.from(dkd_group_map.values()).sort(
      (dkd_left_section, dkd_right_section) =>
        getDkdRaritySortRank(dkd_right_section?.key) -
        getDkdRaritySortRank(dkd_left_section?.key),
    );
  }, [dkd_sellable_cards_sorted]);
  const dkd_sell_active_rarity_section = useMemo(() => {
    if (!dkd_sell_rarity_sections.length) return null;
    return (
      dkd_sell_rarity_sections.find(
        (dkd_section_entry) => dkd_section_entry.key === dkd_sell_active_rarity_key,
      ) || dkd_sell_rarity_sections[0]
    );
  }, [dkd_sell_active_rarity_key, dkd_sell_rarity_sections]);
  useEffect(() => {
    if (dkd_market_section !== "sell") {
      dkd_set_sell_page_mode("overview");
      dkd_set_sell_active_rarity_key("");
    }
  }, [dkd_market_section]);

  useEffect(() => {
    if (!visible) {
      dkd_set_sell_page_mode("overview");
      dkd_set_sell_active_rarity_key("");
    }
  }, [visible]);

  useEffect(() => {
    if (
      dkd_market_section === "sell" &&
      dkd_sell_page_mode === "detail" &&
      !dkd_sell_active_rarity_key &&
      dkd_sell_rarity_sections.length
    ) {
      dkd_set_sell_active_rarity_key(dkd_sell_rarity_sections[0].key);
    }
  }, [
    dkd_market_section,
    dkd_sell_page_mode,
    dkd_sell_active_rarity_key,
    dkd_sell_rarity_sections,
  ]);

  const dkd_market_list_data = useMemo(() => {
    if (dkd_market_section !== "sell") return [];
    return marketListings.slice().sort((dkd_left_listing, dkd_right_listing) => {
      const dkd_rarity_delta =
        getDkdRaritySortRank(dkd_right_listing?.card_rarity) -
        getDkdRaritySortRank(dkd_left_listing?.card_rarity);
      if (dkd_rarity_delta !== 0) return dkd_rarity_delta;
      const dkd_price_delta = Number(dkd_left_listing?.price_token || 0) - Number(dkd_right_listing?.price_token || 0);
      if (dkd_price_delta !== 0) return dkd_price_delta;
      return String(dkd_left_listing?.card_name || "").localeCompare(String(dkd_right_listing?.card_name || ""), "tr");
    });
  }, [dkd_market_section, marketListings]);

  useEffect(() => {
    let alive = true;
    if (!visible)
      return () => {
        alive = false;
      };

    (async () => {
      setMerchantLoading(true);
      const res = await fetchBusinessMarketCatalog();
      if (!alive) return;
      if (res?.error) {
        console.log(
          "[Lootonia][merchant-market]",
          res.error?.message || String(res.error),
        );
        setMerchantProducts([]);
      } else {
        setMerchantProducts(Array.isArray(res?.data) ? res.data : []);
      }
      setMerchantLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [visible]);

  function normalizeMerchantBuyReason(reason) {
    const key = String(reason || "").trim();
    if (!key) return "Satın alma başarısız.";
    if (key === "delivery_address_required") {
      return "Teslimat adresini yazmadan satın alma başlayamaz. GPS tek başına yeterli değil.";
    }
    if (key === "location_required") {
      return "İşletme ürününü almak için cihaz konumu açık olmalı.";
    }
    if (key === "insufficient_token") return "Yeterli token yok.";
    if (key === "product_not_found") return "Ürün bulunamadı.";
    if (key === "out_of_stock") return "Ürün stoğu bitti.";
    return key;
  }

  async function handleMerchantBuy(productId) {
    const dkdAddress = String(deliveryAddressText || "").trim();
    const dkdNote = String(deliveryNoteText || "").trim();
    const dkdLat =
      currentLocation?.lat == null ? null : Number(currentLocation.lat);
    const dkdLng =
      currentLocation?.lng == null ? null : Number(currentLocation.lng);

    if (!hasLiveLocation) {
      Alert.alert(
        "İşletme Marketi",
        "İşletme ürününü almak için önce cihaz konumunu aç.",
      );
      return;
    }

    if (!dkdAddress) {
      Alert.alert(
        "İşletme Marketi",
        "Teslimat adresini yaz. Açık adres zorunlu.",
      );
      return;
    }

    try {
      setMerchantBuyingId(String(productId || ""));
      const { data, error } = await buyBusinessProductWithToken({
        token: `merchant_product:${productId}`,
        deliveryAddressText: dkdAddress,
        deliveryNote: dkdNote,
        deliveryLat: Number.isFinite(dkdLat) ? dkdLat : null,
        deliveryLng: Number.isFinite(dkdLng) ? dkdLng : null,
      });
      if (error) throw error;
      if (data?.ok) {
        Alert.alert(
          "İşletme Marketi",
          `${data?.spent_token || 0} token harcandı.
${data?.business_name || "İşletme"} • ${data?.product_name || "Ürün"} satın alındı ve kurye akışı oluşturuldu.`,
        );
        setDeliveryAddressText("");
        setDeliveryNoteText("");
        await refreshProfile?.();
        await onRefresh?.({ force: true });
        const res = await fetchBusinessMarketCatalog();
        setMerchantProducts(Array.isArray(res?.data) ? res.data : []);
      } else {
        Alert.alert(
          "İşletme Marketi",
          normalizeMerchantBuyReason(data?.reason),
        );
      }
    } catch (dkd_error_value) {
      Alert.alert(
        "İşletme Marketi",
        normalizeMerchantBuyReason(
          dkd_error_value?.message || String(dkd_error_value),
        ),
      );
    } finally {
      setMerchantBuyingId("");
    }
  }

  const header = (
    <View style={styles.headerWrap}>
      <View style={styles.topBar}>
        <View style={styles.topCopy}>
          <Text style={styles.topKicker}>MARKET MERKEZİ</Text>
          <Text style={styles.topTitle}>Açık pazar ve ilan yönetimi</Text>
        </View>
        <View style={styles.topActions}>
          <Pressable
            onPress={async () => {
              await onRefresh?.({ force: true });
              const res = await fetchBusinessMarketCatalog();
              setMerchantProducts(Array.isArray(res?.data) ? res.data : []);
            }}
            style={styles.topActionBtn}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable onPress={onClose} style={styles.topActionBtn}>
            <MaterialCommunityIcons name="close" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatBox
          icon="wallet-outline"
          label="Token"
          value={formatNum(token)}
          accent={ui.colors.gold}
        />
        <StatBox
          icon="storefront-outline"
          label="Açık pazar"
          value={formatNum(marketListings.length)}
          accent={ui.colors.cyan}
        />
        <StatBox
          icon="account-box-outline"
          label="Benim ilanım"
          value={formatNum(ownListings.length)}
          accent={ui.colors.purple}
        />
      </View>

      <View style={styles.dkdSectionCardGrid}>
        {dkd_market_section_cards.map((dkd_section_card) => {
          const dkd_is_active = dkd_market_section === dkd_section_card.key;
          return (
            <Pressable
              key={dkd_section_card.key}
              onPress={() => dkd_set_market_section(dkd_section_card.key)}
              style={({ pressed }) => [
                styles.dkdSectionCard,
                dkd_is_active && styles.dkdSectionCardActive,
                pressed && styles.actionPressed,
              ]}
            >
              <LinearGradient
                colors={dkd_section_card.colors}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={[
                  styles.dkdSectionCardIcon,
                  {
                    backgroundColor: dkd_section_card.iconBg,
                    borderColor: dkd_section_card.iconBorder,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={dkd_section_card.icon}
                  size={21}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.dkdSectionCardTitle} numberOfLines={2}>
                {dkd_section_card.title}
              </Text>
              <Text style={styles.dkdSectionCardSub} numberOfLines={2}>
                {dkd_section_card.subtitle}
              </Text>
              <View
                style={[
                  styles.dkdSectionCardBadge,
                  dkd_is_active && styles.dkdSectionCardBadgeActive,
                ]}
              >
                <Text style={styles.dkdSectionCardBadgeText}>
                  {dkd_section_card.badge}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {dkd_market_section === "shop" ? (
        <View style={styles.panelCard}>
          <LinearGradient
            colors={["rgba(11,53,48,0.98)", "rgba(8,19,30,0.98)"]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.panelEyebrow}>MAĞAZA</Text>
          <Text style={styles.panelTitle}>Takviye kartları</Text>
          <Text style={styles.panelSub}>
            Shard, bilet ve enerji akışını temiz vitrin kartlarıyla buradan aç.
          </Text>

          <View style={styles.dkdQuickInfoRow}>
            <Tag
              label={`${formatNum(marketShopDefs.length)} paket`}
              tone="cyan"
            />
            <Tag label={`${liveEnergy}/${liveEnergyMax} enerji`} tone="gold" />
            <Tag
              label={`${formatNum(profile?.boss_tickets || 0)} bilet`}
              tone="purple"
            />
          </View>

          <View style={styles.packGrid}>
            {shopRows.map((row, rowIndex) => (
              <View key={`shop-row-${rowIndex}`} style={styles.packRow}>
                {row.map((item) => (
                  <View
                    key={String(item?.id || item?.pack_key || rowIndex)}
                    style={styles.packCell}
                  >
                    <ShopPackCard
                      item={item}
                      busy={false}
                      onPress={() =>
                        onBuy?.(
                          `shop:${String(item?.id || "")}:${encodeURIComponent(String(item?.pack_key || ""))}`,
                        )
                      }
                    />
                  </View>
                ))}
                {row.length < 2 ? <View style={styles.packCell} /> : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {dkd_market_section === "merchant" ? (
        <View style={styles.panelCard}>
          <LinearGradient
            colors={["rgba(13,27,44,0.98)", "rgba(9,18,29,0.98)"]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.panelEyebrow}>İŞLETME MARKETİ</Text>

          <View style={styles.deliveryPanel}>
            <View style={styles.deliveryHeroRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.deliveryTitle}>Teslimat akışı</Text>
                <Text style={styles.deliverySub}>
                  Adres ve teslimat notunu tek bloktan gir. Satın alma anında
                  canlı konum da siparişe bağlanır.
                </Text>
              </View>
              <View
                style={[
                  styles.deliveryStatusPill,
                  hasLiveLocation
                    ? styles.deliveryStatusPillOn
                    : styles.deliveryStatusPillOff,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    hasLiveLocation
                      ? "crosshairs-gps"
                      : "map-marker-off-outline"
                  }
                  size={14}
                  color={
                    hasLiveLocation ? theme.colors.green : theme.colors.gold
                  }
                />
                <Text
                  style={[
                    styles.deliveryStatusPillText,
                    hasLiveLocation
                      ? styles.deliveryStatusPillTextOn
                      : styles.deliveryStatusPillTextOff,
                  ]}
                >
                  {hasLiveLocation ? "Konum aktif" : "Konum gerekli"}
                </Text>
              </View>
            </View>

            <View style={styles.deliveryUnifiedCard}>
              <View style={styles.deliveryInputGroup}>
                <View style={styles.deliveryInputIcon}>
                  <MaterialCommunityIcons
                    name="map-marker-radius-outline"
                    size={18}
                    color={theme.colors.cyan}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliveryFieldLabel}>Teslimat adresi</Text>
                  <TextInput
                    value={deliveryAddressText}
                    onChangeText={setDeliveryAddressText}
                    placeholder="Örn: Eryaman 2. Etap 1234. Sokak No:7 Daire:12"
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    multiline
                    style={styles.deliveryUnifiedInputAddress}
                  />
                </View>
              </View>

              <View style={styles.deliveryDivider} />

              <View style={styles.deliveryInputGroup}>
                <View style={styles.deliveryInputIcon}>
                  <MaterialCommunityIcons
                    name="note-text-outline"
                    size={18}
                    color={theme.colors.green}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliveryFieldLabel}>Teslimat notu</Text>
                  <TextInput
                    value={deliveryNoteText}
                    onChangeText={setDeliveryNoteText}
                    placeholder="Kat, blok, kapı tarifi"
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    style={styles.deliveryUnifiedInputNote}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.deliveryHint}>
              {hasLiveLocation
                ? "Satın alma için açık adres ve canlı konum birlikte gönderilir."
                : "Satın alma başlamadan önce cihaz konumunu açman gerekiyor."}
            </Text>
          </View>

          {merchantLoading ? (
            <View style={styles.merchantLoadingWrap}>
              <ActivityIndicator color={ui.colors.cyan} />
              <Text style={styles.loadingText}>
                İşletme ürünleri yükleniyor…
              </Text>
            </View>
          ) : merchantSections.length ? (
            <View style={styles.merchantSectionWrap}>
              {merchantSections.map((section) => (
                <View key={section.key} style={styles.merchantBusinessBlock}>
                  <View style={styles.merchantBusinessHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.merchantBusinessTitle}>
                        {section.businessName}
                      </Text>
                      <Text style={styles.merchantBusinessSub}>
                        {section.businessCategory || "genel"} • sade token
                        vitrin
                      </Text>
                    </View>
                    <Tag label={`${section.items.length} ürün`} tone="cyan" />
                  </View>

                  <View style={styles.merchantGrid}>
                    {section.items.map((item) => (
                      <View key={String(item?.id)} style={styles.merchantCard}>
                        {String(item?.image_url || "").trim() ? (
                          <Image
                            source={{
                              uri: String(item?.image_url || "").trim(),
                            }}
                            style={styles.merchantImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.merchantImageFallback}>
                            <MaterialCommunityIcons
                              name="image-outline"
                              size={24}
                              color="rgba(255,255,255,0.46)"
                            />
                          </View>
                        )}
                        <View style={styles.merchantBody}>
                          <View style={styles.merchantCardTopRowModern}>
                            <View
                              style={{ flex: 1, minWidth: 0, paddingRight: 10 }}
                            >
                              <Text
                                style={styles.merchantTitle}
                                numberOfLines={1}
                              >
                                {item?.title || "Ürün"}
                              </Text>
                              <Text
                                style={styles.merchantMeta}
                                numberOfLines={1}
                              >
                                {item?.category || "genel"} •{" "}
                                {item?.business_address_text ||
                                  "Adres bekleniyor"}
                              </Text>
                            </View>
                          </View>
                          {!!item?.description ? (
                            <Text style={styles.merchantDesc} numberOfLines={2}>
                              {item.description}
                            </Text>
                          ) : (
                            <View style={{ height: 34 }} />
                          )}
                          <View style={styles.merchantBuyRowModern}>
                            <View style={styles.merchantPriceInlineCluster}>
                              <View style={styles.merchantPriceBadge}>
                                <MaterialCommunityIcons
                                  name="cash"
                                  size={14}
                                  color={theme.colors.green}
                                />
                                <Text style={styles.merchantPriceBadgeText}>
                                  {formatProductPriceValue(item) || "Fiyat yok"}
                                </Text>
                              </View>
                              <View style={styles.merchantTokenDockCompact}>
                                <MaterialCommunityIcons
                                  name="star-four-points-circle-outline"
                                  size={13}
                                  color="#F7FBFF"
                                />
                                <Text
                                  style={styles.merchantTokenDockTextCompact}
                                >
                                  {formatNum(item?.price_token || 0)} token
                                </Text>
                              </View>
                            </View>
                            <Pressable
                              onPress={() => handleMerchantBuy(item?.id)}
                              disabled={
                                merchantBuyingId === String(item?.id) ||
                                !String(deliveryAddressText || "").trim() ||
                                !hasLiveLocation
                              }
                              style={({ pressed }) => [
                                styles.merchantBuyBtn,
                                styles.merchantBuyBtnCompact,
                                pressed && styles.actionPressed,
                                (merchantBuyingId === String(item?.id) ||
                                  !String(deliveryAddressText || "").trim() ||
                                  !hasLiveLocation) &&
                                  styles.actionDisabled,
                              ]}
                            >
                              <Text style={styles.merchantBuyTextCompact}>
                                {merchantBuyingId === String(item?.id)
                                  ? "..."
                                  : "Satın al"}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState />
          )}
        </View>
      ) : null}

      {dkd_market_section === "sell" ? (
        <>
          {dkd_sell_page_mode === "overview" ? (
            <View style={styles.panelCard}>
              <LinearGradient
                colors={["rgba(13,27,44,0.98)", "rgba(9,18,29,0.98)"]}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.panelEyebrow}>KART SATIŞI</Text>
              <Text style={styles.panelTitle}>Nadirlik vitrinini ayrı sayfada aç</Text>
              <Text style={styles.panelSub}>
                Kartlarını nadirliğe göre modern kategori kartları halinde ayrı
                bir sayfaya taşıdım. Önce nadirlik seç, sonra kartını seçip
                fiyatını yazarak ilana çıkar.
              </Text>

              <View style={styles.dkdSellLandingGrid}>
                {dkd_sell_rarity_sections.length ? (
                  dkd_sell_rarity_sections.map((dkd_rarity_section) => (
                    <Pressable
                      key={dkd_rarity_section.key}
                      onPress={() => {
                        dkd_set_sell_active_rarity_key(dkd_rarity_section.key);
                        dkd_set_sell_page_mode("detail");
                      }}
                      style={({ pressed }) => [
                        styles.dkdSellLandingCard,
                        pressed && styles.actionPressed,
                      ]}
                    >
                      <LinearGradient
                        colors={dkd_rarity_section.meta.sectionColors}
                        style={StyleSheet.absoluteFill}
                      />
                      <View style={styles.dkdSellLandingHeaderRow}>
                        <View style={styles.dkdSellLandingIconWrap}>
                          <MaterialCommunityIcons
                            name="cards-outline"
                            size={18}
                            color={dkd_rarity_section.meta.text}
                          />
                        </View>
                        <View style={styles.dkdSellLandingCountBadge}>
                          <Text style={styles.dkdSellLandingCountBadgeText}>
                            {formatNum(dkd_rarity_section.items.length)} kart
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.dkdSellLandingTitle,
                          { color: dkd_rarity_section.meta.text },
                        ]}
                        numberOfLines={1}
                      >
                        {dkd_rarity_section.title}
                      </Text>
                      <Text style={styles.dkdSellLandingCount} numberOfLines={2}>
                        Minimal renkli kategori kartı. Dokun ve ayrı vitrini aç.
                      </Text>

                      <View style={styles.dkdSellLandingPreviewRow}>
                        {dkd_rarity_section.items.slice(0, 2).map((dkd_preview_entry) => {
                          const dkd_preview_card =
                            dkd_preview_entry?.card || dkd_preview_entry || {};
                          return (
                            <Pressable
                              key={`landing-${dkd_rarity_section.key}-${String(dkd_preview_entry?.id ?? dkd_preview_card?.id ?? dkd_preview_card?.serial_code ?? dkd_preview_card?.name ?? "card")}`}
                              onPress={(dkd_event) => {
                                dkd_event?.stopPropagation?.();
                                onOpenCard?.(dkd_preview_card);
                              }}
                              style={({ pressed }) => [
                                styles.dkdSellLandingMiniCard,
                                pressed && styles.actionPressed,
                              ]}
                            >
                              <Text style={styles.dkdSellLandingMiniSerial} numberOfLines={1}>
                                {String(
                                  dkd_preview_card?.serial_code ||
                                    dkd_preview_card?.serialCode ||
                                    dkd_preview_card?.series ||
                                    "KART",
                                ).toUpperCase()}
                              </Text>
                              <Text style={styles.dkdSellLandingMiniName} numberOfLines={1}>
                                {dkd_preview_card?.name || "Kart"}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <View
                        style={[
                          styles.dkdSellLandingActionPill,
                          {
                            backgroundColor: dkd_rarity_section.meta.pillBg,
                            borderColor: dkd_rarity_section.meta.pillBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dkdSellLandingActionText,
                            { color: dkd_rarity_section.meta.text },
                          ]}
                        >
                          Vitrini aç
                        </Text>
                      </View>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.emptyInline}>Satılabilir kart bulunamadı.</Text>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.panelCard}>
              <LinearGradient
                colors={["rgba(13,27,44,0.98)", "rgba(9,18,29,0.98)"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.dkdSellPageTopBar}>
                <Pressable
                  onPress={() => dkd_set_sell_page_mode("overview")}
                  style={({ pressed }) => [
                    styles.dkdSellBackButton,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="arrow-left"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.dkdSellBackButtonText}>Geri</Text>
                </Pressable>
                <View style={styles.dkdSellPageTitleWrap}>
                  <Text style={styles.panelEyebrow}>KART SATIŞI</Text>
                  <Text style={styles.panelTitle}>
                    {dkd_sell_active_rarity_section?.title || "Nadirlik vitrini"}
                  </Text>
                </View>
              </View>
              <Text style={styles.panelSub}>
                Ayrı satış sayfasında minimal kartlara dokunup tam boy detayı
                açabilir, alt butonla ilan için seçip fiyatını yazarak doğrudan
                satışa çıkarabilirsin.
              </Text>

              <View style={styles.dkdSellSelectorGrid}>
                {dkd_sell_rarity_sections.map((dkd_rarity_section) => {
                  const dkd_is_selected =
                    dkd_sell_active_rarity_section?.key === dkd_rarity_section.key;
                  return (
                    <Pressable
                      key={dkd_rarity_section.key}
                      onPress={() =>
                        dkd_set_sell_active_rarity_key(dkd_rarity_section.key)
                      }
                      style={[
                        styles.dkdSellSelectorCard,
                        dkd_is_selected && styles.dkdSellSelectorCardActive,
                      ]}
                    >
                      <LinearGradient
                        colors={dkd_rarity_section.meta.sectionColors}
                        style={StyleSheet.absoluteFill}
                      />
                      <Text
                        style={[
                          styles.dkdSellSelectorTitle,
                          { color: dkd_rarity_section.meta.text },
                        ]}
                      >
                        {dkd_rarity_section.title}
                      </Text>
                      <Text style={styles.dkdSellSelectorCount}>
                        {formatNum(dkd_rarity_section.items.length)} kart
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.dkdSellCategorySection}>
                <LinearGradient
                  colors={
                    dkd_sell_active_rarity_section?.meta?.sectionColors ||
                    ["rgba(24,35,49,0.98)", "rgba(10,14,22,0.98)"]
                  }
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.dkdSellCategoryHeader}>
                  <View
                    style={[
                      styles.dkdSellCategoryPill,
                      {
                        backgroundColor:
                          dkd_sell_active_rarity_section?.meta?.pillBg ||
                          "rgba(255,255,255,0.10)",
                        borderColor:
                          dkd_sell_active_rarity_section?.meta?.pillBorder ||
                          "rgba(255,255,255,0.16)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dkdSellCategoryPillText,
                        {
                          color:
                            dkd_sell_active_rarity_section?.meta?.text ||
                            theme.colors.text,
                        },
                      ]}
                    >
                      {dkd_sell_active_rarity_section?.title || "Kartlar"}
                    </Text>
                  </View>
                  <Text style={styles.dkdSellCategoryCount}>
                    {formatNum(
                      dkd_sell_active_rarity_section?.items?.length || 0,
                    )} kart
                  </Text>
                </View>

                <View style={styles.dkdSellCategoryGrid}>
                  {(dkd_sell_active_rarity_section?.items || []).map(
                    (dkd_card_entry) => {
                      const dkd_card = dkd_card_entry?.card || {};
                      const dkd_is_active = selected?.id === dkd_card_entry?.id;
                      return (
                        <View
                          key={`${String(dkd_card_entry?.id ?? dkd_card?.id ?? "row")}`}
                          style={styles.dkdSellCategoryItemWrap}
                        >
                          <DkdMiniCardPreview
                            dkd_card_entry={dkd_card_entry}
                            dkd_preview_meta={dkd_sell_active_rarity_section?.meta}
                            dkd_is_selected={dkd_is_active}
                            dkd_on_open_press={(dkd_open_card) =>
                              onOpenCard?.(dkd_open_card)
                            }
                            dkd_on_select_press={() => setSelected(dkd_card_entry)}
                          />
                        </View>
                      );
                    },
                  )}
                </View>
              </View>

              <View style={styles.listFormCard}>
                <Text style={styles.formTitle}>
                  {selected
                    ? selectedCard?.name || "Seçili kart"
                    : "Henüz kart seçilmedi"}
                </Text>
                <Text style={styles.formSub}>
                  {selected
                    ? `${selectedCard?.series || "GENEL"} • ${selectedCard?.rarity || "common"}`
                    : "Yukarıdaki vitrinden bir kart seç."}
                </Text>

                <View style={styles.formRow}>
                  <View style={styles.inputWrap}>
                    <MaterialCommunityIcons
                      name="cash-multiple"
                      size={17}
                      color={ui.colors.gold}
                    />
                    <TextInput
                      value={price}
                      onChangeText={setPrice}
                      keyboardType="numeric"
                      placeholder="fiyat"
                      placeholderTextColor={theme.colors.textMuted}
                      style={styles.input}
                    />
                  </View>

                  <Pressable
                    onPress={() =>
                      selected
                        ? onList?.(selected, price)
                        : Alert.alert("Market", "Önce bir kart seç.")
                    }
                    style={({ pressed }) => [
                      styles.formAction,
                      pressed && styles.actionPressed,
                    ]}
                  >
                    <LinearGradient
                      colors={["rgba(108,203,255,0.24)", "rgba(47,141,255,0.16)"]}
                      style={StyleSheet.absoluteFill}
                    />
                    <Text style={styles.formActionText}>İlan ver</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {ownListings.length ? (
            <View style={styles.panelCard}>
              <LinearGradient
                colors={["rgba(13,27,44,0.98)", "rgba(9,18,29,0.98)"]}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.panelEyebrow}>BENİM İLANLARIM</Text>
              <Text style={styles.panelTitle}>Aktif satışların</Text>
              <View style={styles.ownListWrap}>
                {ownListings.map((item, index) => (
                  <View
                    key={`${item?.id || "mine"}-${index}`}
                    style={styles.ownListingItem}
                  >
                    <Text style={styles.ownListingTitle}>{item.card_name}</Text>
                    <Text style={styles.ownListingSub}>
                      {item.card_series} • {formatNum(item.price_token)} token
                    </Text>
                    <Pressable
                      onPress={() => onCancel?.(item.id)}
                      style={({ pressed }) => [
                        styles.ownListingAction,
                        pressed && styles.actionPressed,
                      ]}
                    >
                      <Text style={styles.ownListingActionText}>
                        İlanı kaldır
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <Text style={styles.listEyebrow}>AÇIK PAZAR</Text>
          <Text style={styles.listTitle}>Satın alınabilir ilanlar</Text>
          <Text style={styles.listSub}>
            İlanlar nadirlik önceliğine göre sıralanır; üstte daha güçlü kartlar,
            altta daha yaygın kartlar görünür.
          </Text>
        </>
      ) : null}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeScreen style={styles.screen}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[
            theme.colors.bgTop,
            theme.colors.bgMid,
            theme.colors.bgBottom,
          ]}
          style={styles.gradient}
        >
          {(loading && !marketListings.length) || !listReady ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={ui.colors.cyan} />
              <Text style={styles.loadingText}>Market hazırlanıyor…</Text>
            </View>
          ) : (
            <FlatList
              key="market-grid-2"
              data={dkd_market_list_data}
              numColumns={2}
              columnWrapperStyle={styles.columnWrap}
              keyExtractor={(item, index) =>
                `${item?.id || "listing"}-${index}`
              }
              renderItem={({ item }) => (
                <View style={styles.itemCell}>
                  <ListingCard
                    item={item}
                    mine={String(item.seller_id || "") === myId}
                    onOpenCard={onOpenCard}
                    onCancel={onCancel}
                    onBuy={onBuy}
                  />
                </View>
              )}
              ListHeaderComponent={header}
              ListEmptyComponent={
                dkd_market_section === "sell" ? <EmptyState /> : null
              }
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={5}
              updateCellsBatchingPeriod={32}
              removeClippedSubviews
              contentContainerStyle={styles.listContent}
            />
          )}
        </LinearGradient>
      </SafeScreen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bgBottom,
  },
  gradient: {
    flex: 1,
  },
  headerWrap: {
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  topBar: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(10,20,33,0.86)",
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  topCopy: {
    flex: 1,
    paddingRight: 12,
  },
  topKicker: {
    color: theme.colors.cyan,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  topTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
    lineHeight: 30,
  },
  topSub: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  topActions: {
    flexDirection: "row",
    gap: 8,
  },
  topActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  topChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  dkdSectionCardGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  dkdSectionCard: {
    flex: 1,
    minHeight: 172,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 14,
    overflow: "hidden",
  },
  dkdSectionCardActive: {
    borderColor: "rgba(255,255,255,0.22)",
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  dkdSectionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  dkdSectionCardTitle: {
    color: theme.colors.text,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    minHeight: 46,
    marginTop: 2,
  },
  dkdSectionCardSub: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 8,
    minHeight: 38,
  },
  dkdSectionCardBadge: {
    alignSelf: "flex-start",
    marginTop: "auto",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  dkdSectionCardBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.20)",
  },
  dkdSectionCardBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  dkdQuickInfoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
    overflow: "hidden",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 10,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  panelCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  panelEyebrow: {
    color: theme.colors.cyan,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  panelTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6,
  },
  panelSub: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 6,
  },
  shopHeroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  shopHeroBackgroundWrap: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    overflow: "hidden",
  },
  shopHeroBackgroundImage: {
    width: "100%",
    height: "100%",
  },
  shopHeroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(108,203,255,0.24)",
    backgroundColor: "rgba(108,203,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
  },
  snapshotCard: {
    width: "48%",
    minWidth: "48%",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  snapshotLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },
  snapshotValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  logicCard: {
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 16,
  },
  logicTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  logicBody: {
    color: theme.colors.textSoft,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  packGrid: {
    marginTop: 14,
    gap: 12,
  },
  packRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
    marginTop: 12,
  },
  packCell: {
    flex: 1,
    minWidth: 0,
    width: "50%",
  },
  packCard: {
    minHeight: 292,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 16,
    overflow: "hidden",
  },
  packGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 999,
    top: -20,
    right: -10,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  packGlowWithArt: { top: 40, right: -18 },
  packArtWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  packArtImage: {
    width: "100%",
    height: "100%",
    opacity: 0.72,
  },
  packTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  packBadge: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  packBadgeText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  packTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 16,
  },
  packSubtitle: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    marginTop: 8,
  },
  packDescription: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 20,
    fontWeight: "700",
    marginTop: 12,
    minHeight: 64,
  },
  packMetaRow: {
    marginTop: "auto",
    paddingTop: 10,
  },
  packPriceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  packPriceText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 6,
  },
  packRewardText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 6,
  },
  packAction: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  packActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  actionDisabled: {
    opacity: 0.6,
  },
  sellableContent: {
    paddingTop: 12,
    paddingRight: 12,
  },
  sellableItemWrap: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 4,
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  sellableItemWrapActive: {
    borderColor: "rgba(108,203,255,0.28)",
    backgroundColor: "rgba(108,203,255,0.06)",
  },
  dkdSellCategoryWrap: {
    marginTop: 12,
    gap: 12,
  },
  dkdSellLandingGrid: {
    marginTop: 14,
    gap: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  dkdSellLandingCard: {
    width: "48%",
    minHeight: 188,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 14,
    overflow: "hidden",
  },
  dkdSellLandingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dkdSellLandingIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  dkdSellLandingCountBadge: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  dkdSellLandingCountBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  dkdSellLandingTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 12,
  },
  dkdSellLandingCount: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 6,
    minHeight: 36,
  },
  dkdSellLandingPreviewRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  dkdSellLandingMiniCard: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(5,10,18,0.34)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dkdSellLandingMiniSerial: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  dkdSellLandingMiniName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5,
  },
  dkdSellLandingActionPill: {
    marginTop: "auto",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  dkdSellLandingActionText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  dkdSellPageTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dkdSellPageTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  dkdSellBackButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dkdSellBackButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  dkdSellSelectorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
    marginBottom: 12,
  },
  dkdSellSelectorCard: {
    width: "48%",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
    overflow: "hidden",
    minHeight: 84,
  },
  dkdSellSelectorCardActive: {
    borderColor: "rgba(108,203,255,0.28)",
    transform: [{ scale: 1.01 }],
  },
  dkdSellSelectorTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  dkdSellSelectorCount: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  dkdSellCategorySection: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
    overflow: "hidden",
  },
  dkdSellCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  dkdSellCategoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  dkdSellCategoryPillText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  dkdSellCategoryCount: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 11,
    fontWeight: "800",
  },
  dkdSellCategoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  dkdSellCategoryItemWrap: {
    width: "48%",
  },
  dkdMiniPreviewCard: {
    minHeight: 156,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 10,
  },
  dkdMiniPreviewCardActive: {
    borderColor: "rgba(108,203,255,0.28)",
    backgroundColor: "rgba(108,203,255,0.05)",
  },
  dkdMiniPreviewTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dkdMiniPreviewRarityPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  dkdMiniPreviewRarityText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  dkdMiniPreviewSelectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(125,245,208,0.10)",
    borderWidth: 1,
    borderColor: "rgba(125,245,208,0.24)",
  },
  dkdMiniPreviewTouchArea: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(6,12,22,0.40)",
    padding: 10,
    minHeight: 92,
  },
  dkdMiniPreviewArtDock: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  dkdMiniPreviewSerial: {
    color: "rgba(255,255,255,0.48)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 8,
  },
  dkdMiniPreviewName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 6,
  },
  dkdMiniPreviewMeta: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  dkdMiniPreviewInspectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
  },
  dkdMiniPreviewInspectText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    fontWeight: "800",
  },
  dkdMiniPreviewSelectButton: {
    marginTop: 10,
    minHeight: 38,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  dkdMiniPreviewSelectButtonActive: {
    borderColor: "rgba(125,245,208,0.22)",
    backgroundColor: "rgba(125,245,208,0.12)",
  },
  dkdMiniPreviewSelectButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  emptyInline: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
  },
  listFormCard: {
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
    marginTop: 12,
  },
  formTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  formSub: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  inputWrap: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "rgba(4,11,18,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    color: theme.colors.text,
    marginLeft: 8,
    fontWeight: "800",
  },
  formAction: {
    marginLeft: 8,
    minWidth: 116,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(108,203,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(108,203,255,0.08)",
  },
  formActionText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  ownListWrap: {
    marginTop: 12,
  },
  ownListingItem: {
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
    marginBottom: 8,
  },
  ownListingTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  ownListingSub: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  ownListingAction: {
    marginTop: 10,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  ownListingActionText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  listEyebrow: {
    color: theme.colors.cyan,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  listTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  listSub: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
  },
  columnWrap: {
    paddingHorizontal: 14,
    gap: 12,
  },
  itemCell: {
    flex: 1,
    minWidth: 0,
  },
  listingCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    padding: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  listingTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rarityPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: "900",
  },
  pricePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(243,199,119,0.12)",
    borderWidth: 1,
    borderColor: "rgba(243,199,119,0.24)",
  },
  priceText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 5,
  },
  tileWrap: {
    marginTop: 10,
  },
  cardName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
  },
  cardMeta: {
    color: theme.colors.textSoft,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
  },
  listingAction: {
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(108,203,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 12,
    backgroundColor: "rgba(108,203,255,0.08)",
  },
  listingActionMuted: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.10)",
  },
  listingActionText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "900",
  },
  actionPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: theme.colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 10,
  },
  listContent: {
    paddingBottom: 140,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },
  emptySub: {
    color: theme.colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6,
  },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tagText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "800",
  },

  merchantLoadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  merchantSectionWrap: {
    marginTop: 14,
    gap: 14,
  },
  merchantBusinessBlock: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(108,203,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
    gap: 12,
  },
  merchantBusinessHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  merchantBusinessTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "900",
  },
  deliveryPanel: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 14,
    marginTop: 14,
    marginBottom: 4,
  },
  deliveryHeroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  deliveryTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "900" },
  deliverySub: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  deliveryStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  deliveryStatusPillOn: {
    borderColor: "rgba(82,242,161,0.28)",
    backgroundColor: "rgba(82,242,161,0.10)",
  },
  deliveryStatusPillOff: {
    borderColor: "rgba(243,199,119,0.28)",
    backgroundColor: "rgba(243,199,119,0.10)",
  },
  deliveryStatusPillText: { fontSize: 11, fontWeight: "900" },
  deliveryStatusPillTextOn: { color: theme.colors.green },
  deliveryStatusPillTextOff: { color: theme.colors.gold },
  deliveryUnifiedCard: {
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(108,203,255,0.14)",
    backgroundColor: "rgba(7,15,25,0.72)",
    overflow: "hidden",
  },
  deliveryInputGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  deliveryInputIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  deliveryFieldLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  deliveryUnifiedInputAddress: {
    minHeight: 62,
    color: "#FFF",
    fontWeight: "700",
    textAlignVertical: "top",
    paddingVertical: 0,
  },
  deliveryUnifiedInputNote: {
    minHeight: 28,
    color: "#FFF",
    fontWeight: "700",
    paddingVertical: 0,
  },
  deliveryDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 14,
  },
  deliveryHint: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    fontWeight: "700",
  },
  merchantBusinessSub: {
    color: theme.colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  merchantGrid: {
    gap: 12,
  },
  merchantCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(6,13,22,0.88)",
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  merchantImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  merchantImageFallback: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  merchantBody: {
    flex: 1,
    minWidth: 0,
  },
  merchantCardTopRowModern: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    minHeight: 34,
  },
  merchantTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "900",
  },
  merchantPriceInlineCluster: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    paddingRight: 8,
  },
  merchantTokenDock: {
    minWidth: 128,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(116,233,255,0.20)",
    backgroundColor: "rgba(15,30,46,0.86)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  merchantTokenDockCompact: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(116,233,255,0.16)",
    backgroundColor: "rgba(15,30,46,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  merchantTokenDockText: {
    color: "#F7FBFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  merchantTokenDockTextCompact: {
    color: "#F7FBFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.1,
  },
  merchantMeta: {
    color: theme.colors.cyan,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 4,
  },
  merchantDesc: {
    color: theme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    marginTop: 6,
  },
  merchantInfoRowModern: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 10,
    gap: 8,
  },
  merchantPriceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(82,242,161,0.28)",
    backgroundColor: "rgba(82,242,161,0.10)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  merchantPriceBadgeText: {
    color: theme.colors.green,
    fontSize: 12,
    fontWeight: "900",
  },
  merchantBuyRowModern: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  merchantBuyBtn: {
    minWidth: 118,
    minHeight: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(108,203,255,0.24)",
    backgroundColor: "rgba(108,203,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  merchantBuyBtnCompact: {
    minWidth: 88,
    minHeight: 34,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  merchantBuyText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "900",
  },
  merchantBuyTextCompact: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "900",
  },
});

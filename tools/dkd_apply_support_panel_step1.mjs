import * as dkd_fs from "node:fs";
import * as dkd_path from "node:path";

const dkd_project_root = process.cwd();
const dkd_home_file_path = dkd_path.join(dkd_project_root, "src/features/map/MapHomeScreen.js");
const dkd_support_file_path = dkd_path.join(dkd_project_root, "src/features/support/dkd_support_panel_modal.js");

function dkd_fail(dkd_message_text) {
  console.error(`DKD_SUPPORT_PANEL_STEP1_ERROR: ${dkd_message_text}`);
  process.exit(1);
}

function dkd_replace_once(dkd_source_text, dkd_search_text, dkd_replace_text, dkd_step_label) {
  if (dkd_source_text.includes(dkd_replace_text)) {
    return dkd_source_text;
  }
  if (!dkd_source_text.includes(dkd_search_text)) {
    dkd_fail(`${dkd_step_label} hedef metin bulunamadı. Dosya güncel bazdan farklı olabilir.`);
  }
  return dkd_source_text.replace(dkd_search_text, dkd_replace_text);
}

if (!dkd_fs.existsSync(dkd_home_file_path)) {
  dkd_fail("src/features/map/MapHomeScreen.js bulunamadı. Komutu projects/Lootonia içinde çalıştır.");
}

if (!dkd_fs.existsSync(dkd_support_file_path)) {
  dkd_fail("src/features/support/dkd_support_panel_modal.js bulunamadı. Önce zip dosyasını proje köküne aç.");
}

let dkd_home_source_text = dkd_fs.readFileSync(dkd_home_file_path, "utf8");

const dkd_import_search_text = 'import { MaterialCommunityIcons } from "@expo/vector-icons";\n';
const dkd_import_replace_text = 'import { MaterialCommunityIcons } from "@expo/vector-icons";\nimport { dkd_render_support_panel_modal } from "../support/dkd_support_panel_modal";\n';
dkd_home_source_text = dkd_replace_once(dkd_home_source_text, dkd_import_search_text, dkd_import_replace_text, "import ekleme");

const dkd_mission_props_search_text = `  onOpenMap,
  onOpenScanner,
  onOpenDropList,`;
const dkd_mission_props_replace_text = `  onOpenMap,
  onOpenScanner,
  onOpenSupportPanel,
  onOpenDropList,`;
dkd_home_source_text = dkd_replace_once(dkd_home_source_text, dkd_mission_props_search_text, dkd_mission_props_replace_text, "MissionBoard prop ekleme");

const dkd_qr_button_search_text = `        <Pressable onPress={onOpenScanner} style={{ flex: 1 }}>
          <LinearGradient
            colors={["#17243F", "#0D1628"]}
            style={styles.ctaSecondary}
          >
            <MaterialCommunityIcons name="qrcode-scan" size={20} color="#FFF" />
            <Text style={styles.ctaSecondaryText}>QR Tara</Text>
          </LinearGradient>
        </Pressable>`;
const dkd_qr_button_replace_text = `        <Pressable onPress={onOpenSupportPanel} style={{ flex: 1 }}>
          <LinearGradient
            colors={["#1E3A8A", "#7C3AED", "#DB2777"]}
            start={dkd_make_native_axis_point(0, 0)}
            end={dkd_make_native_axis_point(1, 1)}
            style={styles.ctaSecondary}
          >
            <MaterialCommunityIcons name="face-agent" size={20} color="#FFF" />
            <Text style={styles.ctaSecondaryText}>Destek Paneli</Text>
          </LinearGradient>
        </Pressable>`;
dkd_home_source_text = dkd_replace_once(dkd_home_source_text, dkd_qr_button_search_text, dkd_qr_button_replace_text, "QR butonu değiştirme");

const dkd_state_search_text = `  const [liveMapOpen, setLiveMapOpen] = useState(false);
  useEffect(() => {`;
const dkd_state_replace_text = `  const [liveMapOpen, setLiveMapOpen] = useState(false);
  const [dkd_support_panel_open, dkd_set_support_panel_open] = useState(false);
  const dkd_open_support_panel = useCallback(() => {
    dkd_set_support_panel_open(true);
  }, []);
  const dkd_close_support_panel = useCallback(() => {
    dkd_set_support_panel_open(false);
  }, []);
  useEffect(() => {`;
dkd_home_source_text = dkd_replace_once(dkd_home_source_text, dkd_state_search_text, dkd_state_replace_text, "support state ekleme");

const dkd_mission_usage_search_text = `          onOpenMap={openLiveMap}
          onOpenScanner={onOpenScanner}
          onOpenDropList={onOpenDropList}`;
const dkd_mission_usage_replace_text = `          onOpenMap={openLiveMap}
          onOpenScanner={onOpenScanner}
          onOpenSupportPanel={dkd_open_support_panel}
          onOpenDropList={onOpenDropList}`;
dkd_home_source_text = dkd_replace_once(dkd_home_source_text, dkd_mission_usage_search_text, dkd_mission_usage_replace_text, "MissionBoard kullanım prop ekleme");

const dkd_modal_render_search_text = `        recenterToCurrentLocation={recenterToCurrentLocation}
      />
    </View>`;
const dkd_modal_render_replace_text = `        recenterToCurrentLocation={recenterToCurrentLocation}
      />
      {dkd_render_support_panel_modal({
        dkd_visible: dkd_support_panel_open,
        dkd_on_close: dkd_close_support_panel,
      })}
    </View>`;
dkd_home_source_text = dkd_replace_once(dkd_home_source_text, dkd_modal_render_search_text, dkd_modal_render_replace_text, "support modal render ekleme");

dkd_fs.writeFileSync(dkd_home_file_path, dkd_home_source_text, "utf8");
console.log("DKD_SUPPORT_PANEL_STEP1_OK: Ana sayfadaki QR Tara butonu Destek Paneli olarak bağlandı.");
process.exit(0);

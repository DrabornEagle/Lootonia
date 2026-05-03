import * as dkd_fs from "node:fs";
import * as dkd_path from "node:path";

const dkd_project_root = process.cwd();
const dkd_home_file_path = dkd_path.join(dkd_project_root, "src/features/map/MapHomeScreen.js");
const dkd_next_support_file_path = dkd_path.join(dkd_project_root, "src/features/support/dkd_support_panel_center.js");
const dkd_previous_support_file_path = dkd_path.join(dkd_project_root, "src/features/support/dkd_support_panel_modal.js");

function dkd_fail(dkd_message_text) {
  console.error(`DKD_SUPPORT_PANEL_STEP2_ERROR: ${dkd_message_text}`);
  process.exit(1);
}

function dkd_replace_once(dkd_source_text, dkd_search_text, dkd_replace_text, dkd_step_label) {
  if (dkd_source_text.includes(dkd_replace_text)) {
    return dkd_source_text;
  }
  if (!dkd_source_text.includes(dkd_search_text)) {
    dkd_fail(`${dkd_step_label} hedef metin bulunamadı. Önce step1 kurulu mu kontrol et.`);
  }
  return dkd_source_text.replace(dkd_search_text, dkd_replace_text);
}

if (!dkd_fs.existsSync(dkd_home_file_path)) {
  dkd_fail("src/features/map/MapHomeScreen.js bulunamadı. Komutu projects/Lootonia içinde çalıştır.");
}

if (!dkd_fs.existsSync(dkd_next_support_file_path)) {
  dkd_fail("src/features/support/dkd_support_panel_center.js bulunamadı. Önce step2 zip dosyasını proje köküne aç.");
}

let dkd_home_source_text = dkd_fs.readFileSync(dkd_home_file_path, "utf8");

const dkd_previous_import_text = 'import { dkd_render_support_panel_modal } from "../support/dkd_support_panel_modal";';
const dkd_next_import_text = 'import { dkd_render_support_panel_modal } from "../support/dkd_support_panel_center";';

dkd_home_source_text = dkd_replace_once(
  dkd_home_source_text,
  dkd_previous_import_text,
  dkd_next_import_text,
  "destek paneli import güncelleme",
);

dkd_fs.writeFileSync(dkd_home_file_path, dkd_home_source_text, "utf8");

if (dkd_fs.existsSync(dkd_previous_support_file_path)) {
  dkd_fs.unlinkSync(dkd_previous_support_file_path);
}

console.log("DKD_SUPPORT_PANEL_STEP2_OK: Destek Paneli mesaj formu ve cihaz içi talep geçmişi aktif edildi.");

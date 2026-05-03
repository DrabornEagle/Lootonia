import * as dkd_file_system from 'node:fs';
import * as dkd_path_tools from 'node:path';

const dkd_project_root = process.cwd();
const dkd_home_file_path = dkd_path_tools.join(dkd_project_root, 'src/features/map/MapHomeScreen.js');
const dkd_next_support_file_path = dkd_path_tools.join(dkd_project_root, 'src/features/support/dkd_support_panel_conversation.js');
const dkd_previous_support_center_path = dkd_path_tools.join(dkd_project_root, 'src/features/support/dkd_support_panel_center.js');
const dkd_previous_support_modal_path = dkd_path_tools.join(dkd_project_root, 'src/features/support/dkd_support_panel_modal.js');

function dkd_fail(dkd_message_text) {
  console.error(`DKD_SUPPORT_PANEL_STEP5_ERROR: ${dkd_message_text}`);
  process.exit(1);
}

if (!dkd_file_system.existsSync(dkd_home_file_path)) {
  dkd_fail('src/features/map/MapHomeScreen.js bulunamadı. Komutu projects/Lootonia içinde çalıştır.');
}

if (!dkd_file_system.existsSync(dkd_next_support_file_path)) {
  dkd_fail('src/features/support/dkd_support_panel_conversation.js bulunamadı. Step5 zip dosyasını proje köküne aç.');
}

let dkd_home_source_text = dkd_file_system.readFileSync(dkd_home_file_path, 'utf8');

const dkd_next_import_text = 'import { dkd_render_support_panel_modal } from "../support/dkd_support_panel_conversation";';
const dkd_import_candidates = [
  'import { dkd_render_support_panel_modal } from "../support/dkd_support_panel_center";',
  "import { dkd_render_support_panel_modal } from '../support/dkd_support_panel_center';",
  'import { dkd_render_support_panel_modal } from "../support/dkd_support_panel_modal";',
  "import { dkd_render_support_panel_modal } from '../support/dkd_support_panel_modal';",
  dkd_next_import_text,
  "import { dkd_render_support_panel_modal } from '../support/dkd_support_panel_conversation';",
];

if (!dkd_home_source_text.includes('../support/dkd_support_panel_conversation')) {
  const dkd_found_import_text = dkd_import_candidates.find((dkd_candidate_text) => dkd_home_source_text.includes(dkd_candidate_text));

  if (!dkd_found_import_text) {
    dkd_fail('Destek paneli import satırı bulunamadı. MapHomeScreen.js içinde dkd_render_support_panel_modal importunu kontrol et.');
  }

  dkd_home_source_text = dkd_home_source_text.replace(dkd_found_import_text, dkd_next_import_text);
  dkd_file_system.writeFileSync(dkd_home_file_path, dkd_home_source_text, 'utf8');
}

if (dkd_file_system.existsSync(dkd_previous_support_center_path)) {
  dkd_file_system.unlinkSync(dkd_previous_support_center_path);
}

if (dkd_file_system.existsSync(dkd_previous_support_modal_path)) {
  dkd_file_system.unlinkSync(dkd_previous_support_modal_path);
}

console.log('DKD_SUPPORT_PANEL_STEP5_OK: Ana sayfa Destek Paneli konuşma ve admin cevap ekranına bağlandı.');

import * as dkd_file_system from 'node:fs';
import * as dkd_path_tools from 'node:path';

const dkd_project_root = process.cwd();
const dkd_admin_menu_path = dkd_path_tools.join(dkd_project_root, 'src/features/admin/AdminMenuModal.js');

function dkd_fail(dkd_message_text) {
  console.error(`DKD_SUPPORT_PANEL_STEP4_ERROR: ${dkd_message_text}`);
  process.exit(1);
}

function dkd_replace_once(dkd_source_text, dkd_search_text, dkd_replace_text, dkd_error_text) {
  if (!dkd_source_text.includes(dkd_search_text)) {
    dkd_fail(dkd_error_text);
  }
  return dkd_source_text.replace(dkd_search_text, dkd_replace_text);
}

if (!dkd_file_system.existsSync(dkd_admin_menu_path)) {
  dkd_fail('src/features/admin/AdminMenuModal.js bulunamadı. Komutu projects/Lootonia içinde çalıştır.');
}

let dkd_admin_menu_text = dkd_file_system.readFileSync(dkd_admin_menu_path, 'utf8');
let dkd_changed = false;

if (!dkd_admin_menu_text.includes("../support/dkd_support_admin_queue_modal")) {
  dkd_admin_menu_text = dkd_replace_once(
    dkd_admin_menu_text,
    "import AdminBusinessModal from '../business/AdminBusinessModal';\n",
    "import AdminBusinessModal from '../business/AdminBusinessModal';\nimport dkd_support_admin_queue_modal from '../support/dkd_support_admin_queue_modal';\n",
    'AdminBusinessModal import satırı bulunamadı.'
  );
  dkd_changed = true;
}

if (!dkd_admin_menu_text.includes('dkd_support_queue_open')) {
  dkd_admin_menu_text = dkd_replace_once(
    dkd_admin_menu_text,
    '  const [businessOpen, setBusinessOpen] = useState(false);\n',
    "  const [businessOpen, setBusinessOpen] = useState(false);\n  const [dkd_support_queue_open, dkd_set_support_queue_open] = useState(false);\n",
    'businessOpen state satırı bulunamadı.'
  );
  dkd_changed = true;
}

if (dkd_admin_menu_text.includes('<GlassStat label="MODÜL" value="8" />')) {
  dkd_admin_menu_text = dkd_admin_menu_text.replace('<GlassStat label="MODÜL" value="8" />', '<GlassStat label="MODÜL" value="9" />');
  dkd_changed = true;
}

if (!dkd_admin_menu_text.includes('title="Destek Kuyruğu"')) {
  dkd_admin_menu_text = dkd_replace_once(
    dkd_admin_menu_text,
    `                <AdminAction\n                  icon="storefront-outline"\n                  title="İşletme Merkezi"\n                  sub="Önce işletmeyi kur, sonra drop bağla, kampanya aç ve kasada kupon doğrula. Daha sade yeni akış."\n                  onPress={() => setBusinessOpen(true)}\n                  tone="green"\n                />\n`,
    `                <AdminAction\n                  icon="storefront-outline"\n                  title="İşletme Merkezi"\n                  sub="Önce işletmeyi kur, sonra drop bağla, kampanya aç ve kasada kupon doğrula. Daha sade yeni akış."\n                  onPress={() => setBusinessOpen(true)}\n                  tone="green"\n                />\n                <AdminAction\n                  icon="headset"\n                  title="Destek Kuyruğu"\n                  sub="Uygulamadan gelen destek taleplerini gör, yanıtla ve çözüldü olarak kapat."\n                  onPress={() => dkd_set_support_queue_open(true)}\n                  tone="cyan"\n                />\n`,
    'İşletme Merkezi AdminAction bloğu bulunamadı.'
  );
  dkd_changed = true;
}

if (!dkd_admin_menu_text.includes('React.createElement(dkd_support_admin_queue_modal')) {
  dkd_admin_menu_text = dkd_replace_once(
    dkd_admin_menu_text,
    '      <AdminBusinessModal visible={businessOpen} onClose={() => setBusinessOpen(false)} />\n',
    "      <AdminBusinessModal visible={businessOpen} onClose={() => setBusinessOpen(false)} />\n      {React.createElement(dkd_support_admin_queue_modal, {\n        visible: dkd_support_queue_open,\n        onClose: () => dkd_set_support_queue_open(false),\n      })}\n",
    'AdminBusinessModal render satırı bulunamadı.'
  );
  dkd_changed = true;
}

if (dkd_changed) {
  dkd_file_system.writeFileSync(dkd_admin_menu_path, dkd_admin_menu_text);
}

console.log('DKD_SUPPORT_PANEL_STEP4_OK: Admin menüsüne Destek Kuyruğu paneli bağlandı.');

process.exit(0);

import dkd_file_system from "node:fs";
import dkd_path from "node:path";

const dkd_project_root_path = process.cwd();
const dkd_support_panel_path = dkd_path.join(
  dkd_project_root_path,
  "src/features/support/dkd_support_panel_center.js",
);

function dkd_fail(dkd_message_text) {
  console.error(`DKD_SUPPORT_PANEL_STEP3_ERROR: ${dkd_message_text}`);
  process.exit(1);
}

if (!dkd_file_system.existsSync(dkd_support_panel_path)) {
  dkd_fail("src/features/support/dkd_support_panel_center.js bulunamadı. Önce Step 2 paketini uygula.");
}

let dkd_source_text = dkd_file_system.readFileSync(dkd_support_panel_path, "utf8");

if (!dkd_source_text.includes("dkd_lootonia_support_drafts_v1")) {
  dkd_fail("Step 2 destek paneli baz metni bulunamadı. Eski kopyadan patch üretmiyorum; güncel dosyayı kontrol et.");
}

if (!dkd_source_text.includes("../../lib/supabase")) {
  dkd_source_text = dkd_source_text.replace(
    'import AsyncStorage from "@react-native-async-storage/async-storage";\n',
    'import AsyncStorage from "@react-native-async-storage/async-storage";\nimport { supabase, dkd_supabase_runtime_config } from "../../lib/supabase";\n',
  );
}

const dkd_helper_marker_text = `function dkd_clean_message_text(dkd_message_text) {\n  return String(dkd_message_text || "").replace(/\\s+/g, " ").trim();\n}\n`;
const dkd_remote_helper_text = `function dkd_get_support_priority(dkd_priority_key) {
  return (
    dkd_support_priority_list.find(
      (dkd_support_priority_item) => dkd_support_priority_item.dkd_key === dkd_priority_key,
    ) || dkd_support_priority_list[0]
  );
}

async function dkd_create_remote_support_request({ dkd_ticket_item }) {
  if (!dkd_supabase_runtime_config.dkd_is_ready) {
    return {
      dkd_remote_ok: false,
      dkd_remote_status_key: "dkd_local_only",
      dkd_remote_status_title: "Cihazda kayıtlı",
      dkd_remote_message: dkd_supabase_runtime_config.dkd_issue_text || "Supabase ayarı hazır değil.",
    };
  }

  const dkd_auth_result = await supabase.auth.getUser();
  const dkd_auth_user_id = dkd_auth_result?.data?.user?.id || null;

  if (dkd_auth_result?.error || !dkd_auth_user_id) {
    return {
      dkd_remote_ok: false,
      dkd_remote_status_key: "dkd_waiting_login",
      dkd_remote_status_title: "Giriş bekliyor",
      dkd_remote_message: "Supabase destek kuyruğuna göndermek için kullanıcı girişi gerekli.",
    };
  }

  const dkd_rpc_result = await supabase.rpc("dkd_create_support_thread_with_message", {
    dkd_param_ticket_code: dkd_ticket_item.dkd_ticket_code,
    dkd_param_topic_key: dkd_ticket_item.dkd_topic_key,
    dkd_param_topic_title: dkd_ticket_item.dkd_topic_title,
    dkd_param_priority_key: dkd_ticket_item.dkd_priority_key,
    dkd_param_contact_note: dkd_ticket_item.dkd_contact_note,
    dkd_param_message_text: dkd_ticket_item.dkd_message_text,
    dkd_param_source_key: "dkd_mobile_app",
  });

  if (dkd_rpc_result.error) {
    throw dkd_rpc_result.error;
  }

  const dkd_response_payload = dkd_rpc_result.data || {};

  return {
    dkd_remote_ok: Boolean(dkd_response_payload.dkd_ok),
    dkd_remote_thread_id: dkd_response_payload.dkd_thread_id || null,
    dkd_remote_message_id: dkd_response_payload.dkd_message_id || null,
    dkd_remote_status_key: dkd_response_payload.dkd_status_key || "dkd_open",
    dkd_remote_status_title: dkd_response_payload.dkd_status_title || "Destek kuyruğunda",
    dkd_remote_message: "Talep Supabase destek kuyruğuna gönderildi.",
  };
}
`;

if (!dkd_source_text.includes("async function dkd_create_remote_support_request")) {
  if (!dkd_source_text.includes(dkd_helper_marker_text)) {
    dkd_fail("Temiz mesaj helper alanı bulunamadı. Step 2 dosyan farklı görünüyor.");
  }
  dkd_source_text = dkd_source_text.replace(
    dkd_helper_marker_text,
    `${dkd_helper_marker_text}\n${dkd_remote_helper_text}`,
  );
}

const dkd_submit_start_text = "  const dkd_submit_support_request = useCallback(async () => {";
const dkd_recent_marker_text = "\n\n  const dkd_recent_history = dkd_support_history.slice(0, 3);";
const dkd_submit_start_index = dkd_source_text.indexOf(dkd_submit_start_text);
const dkd_recent_marker_index = dkd_source_text.indexOf(dkd_recent_marker_text, dkd_submit_start_index);

if (dkd_submit_start_index < 0 || dkd_recent_marker_index < 0) {
  dkd_fail("Destek talebi oluşturma bloğu bulunamadı. Dosya güncel Step 2 bazından farklı.");
}

const dkd_new_submit_block_text = `  const dkd_submit_support_request = useCallback(async () => {
    const dkd_clean_text = dkd_clean_message_text(dkd_message_text);
    const dkd_clean_contact_note = dkd_clean_message_text(dkd_contact_note);
    const dkd_selected_priority = dkd_get_support_priority(dkd_selected_priority_key);

    if (dkd_clean_text.length < 12) {
      Alert.alert("Eksik bilgi", "Destek talebini daha anlaşılır yazmak için en az 12 karakter gir.");
      return;
    }

    dkd_set_is_saving(true);
    try {
      const dkd_ticket_item_base = {
        dkd_ticket_code: dkd_make_ticket_code(),
        dkd_topic_key: dkd_selected_topic_key,
        dkd_topic_title: dkd_selected_topic.dkd_title,
        dkd_priority_key: dkd_selected_priority_key,
        dkd_priority_title: dkd_selected_priority.dkd_title,
        dkd_message_text: dkd_clean_text,
        dkd_contact_note: dkd_clean_contact_note,
        dkd_status_key: "dkd_local_pending",
        dkd_status_title: "Gönderiliyor",
        dkd_remote_thread_id: null,
        dkd_remote_message_id: null,
        dkd_sync_issue_text: "",
        dkd_created_at: new Date().toISOString(),
      };

      let dkd_ticket_item = dkd_ticket_item_base;
      let dkd_alert_title = "Talep cihazda kayıtlı";
      let dkd_alert_message = "Talep cihaz içinde kaydedildi. Supabase bağlantısı uygun olunca tekrar gönderebiliriz.";

      try {
        const dkd_remote_result = await dkd_create_remote_support_request({ dkd_ticket_item: dkd_ticket_item_base });
        dkd_ticket_item = {
          ...dkd_ticket_item_base,
          dkd_status_key: dkd_remote_result.dkd_remote_status_key,
          dkd_status_title: dkd_remote_result.dkd_remote_status_title,
          dkd_remote_thread_id: dkd_remote_result.dkd_remote_thread_id || null,
          dkd_remote_message_id: dkd_remote_result.dkd_remote_message_id || null,
          dkd_sync_issue_text: dkd_remote_result.dkd_remote_ok ? "" : dkd_remote_result.dkd_remote_message,
        };

        if (dkd_remote_result.dkd_remote_ok) {
          dkd_alert_title = "Destek talebi gönderildi";
          dkd_alert_message = "Talep Supabase destek kuyruğuna düştü. Admin paneli adımında bu talepleri tek ekranda göreceğiz.";
        } else {
          dkd_alert_message = dkd_remote_result.dkd_remote_message || dkd_alert_message;
        }
      } catch (dkd_remote_error) {
        console.warn("DKD_SUPPORT_REMOTE_SUBMIT_ERROR", dkd_remote_error);
        dkd_ticket_item = {
          ...dkd_ticket_item_base,
          dkd_status_key: "dkd_local_only",
          dkd_status_title: "Cihazda kayıtlı",
          dkd_sync_issue_text: dkd_remote_error?.message || "Supabase gönderimi başarısız oldu.",
        };
        dkd_alert_message = "Supabase gönderimi başarısız oldu; talep cihaz içinde yedek olarak saklandı.";
      }

      const dkd_next_history = [dkd_ticket_item, ...dkd_support_history].slice(0, 8);
      await AsyncStorage.setItem(dkd_support_storage_key, JSON.stringify(dkd_next_history));
      dkd_set_support_history(dkd_next_history);
      dkd_set_message_text("");
      dkd_set_contact_note("");
      Alert.alert(dkd_alert_title, dkd_alert_message);
    } catch (dkd_submit_error) {
      console.warn("DKD_SUPPORT_SUBMIT_ERROR", dkd_submit_error);
      Alert.alert("Kayıt başarısız", "Destek talebi cihazda kaydedilemedi. Uygulamayı kapatıp tekrar dene.");
    } finally {
      dkd_set_is_saving(false);
    }
  }, [
    dkd_contact_note,
    dkd_message_text,
    dkd_selected_priority_key,
    dkd_selected_topic,
    dkd_selected_topic_key,
    dkd_support_history,
  ]);`;

dkd_source_text = `${dkd_source_text.slice(0, dkd_submit_start_index)}${dkd_new_submit_block_text}${dkd_source_text.slice(dkd_recent_marker_index)}`;

dkd_source_text = dkd_source_text.replace(
  "Konu seç, mesajını yaz, destek talebini hazırla.",
  "Konu seç, mesajını yaz, destek kuyruğuna gönder.",
);

dkd_source_text = dkd_source_text.replace(
  "Bu adımda talep cihaz içinde hazırlanır. Sonraki adımda Supabase destek kuyruğuna bağlanacak.",
  "Talep Supabase destek kuyruğuna gönderilir. Bağlantı yoksa cihaz içinde yedeklenir.",
);

dkd_file_system.writeFileSync(dkd_support_panel_path, dkd_source_text);
console.log("DKD_SUPPORT_PANEL_STEP3_OK: Destek Paneli Supabase destek kuyruğuna bağlandı.");

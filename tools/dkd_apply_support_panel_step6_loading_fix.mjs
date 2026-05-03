import fs from 'node:fs';
import path from 'node:path';

const dkd_project_root = process.cwd();
const dkd_support_panel_path = path.join(
  dkd_project_root,
  'src',
  'features',
  'support',
  'dkd_support_panel_conversation.js',
);

function dkd_read_file(dkd_file_path) {
  if (!fs.existsSync(dkd_file_path)) {
    throw new Error(`DKD_SUPPORT_STEP6_MISSING_FILE: ${dkd_file_path}`);
  }
  return fs.readFileSync(dkd_file_path, 'utf8');
}

function dkd_write_file(dkd_file_path, dkd_file_text) {
  fs.writeFileSync(dkd_file_path, dkd_file_text, 'utf8');
}

function dkd_replace_once(dkd_file_text, dkd_search_value, dkd_replace_value, dkd_error_code) {
  if (!dkd_file_text.includes(dkd_search_value)) {
    if (dkd_file_text.includes(dkd_replace_value)) {
      return dkd_file_text;
    }
    throw new Error(dkd_error_code);
  }
  return dkd_file_text.replace(dkd_search_value, dkd_replace_value);
}

let dkd_support_panel_text = dkd_read_file(dkd_support_panel_path);

const dkd_old_loader_block = `  const dkd_load_thread_messages = dkd_use_callback(async (dkd_thread_id) => {
    if (!dkd_thread_id || !dkd_supabase_runtime_config.dkd_is_ready) {
      dkd_set_thread_messages([]);
      return;
    }

    dkd_set_is_loading_messages(true);
    dkd_set_error_text('');

    const dkd_message_result = await supabase
      .from('dkd_support_messages')
      .select('dkd_id, dkd_thread_id, dkd_user_id, dkd_sender_key, dkd_sender_title, dkd_message_text, dkd_created_at')
      .eq('dkd_thread_id', dkd_thread_id)
      .order('dkd_created_at', { ascending: true });

    if (dkd_message_result.error) {
      dkd_set_error_text(dkd_message_result.error.message || 'Destek mesajları yüklenemedi.');
      dkd_set_thread_messages([]);
    } else {
      dkd_set_thread_messages(Array.isArray(dkd_message_result.data) ? dkd_message_result.data : []);
    }

    dkd_set_is_loading_messages(false);
  }, []);
`;

const dkd_new_loader_block = `  const dkd_load_thread_messages = dkd_use_callback(async (dkd_thread_id) => {
    if (!dkd_thread_id || !dkd_supabase_runtime_config.dkd_is_ready) {
      dkd_set_is_loading_messages(false);
      dkd_set_thread_messages([]);
      return;
    }

    dkd_set_is_loading_messages(true);
    dkd_set_error_text('');

    try {
      const dkd_message_result = await supabase
        .from('dkd_support_messages')
        .select('dkd_id, dkd_thread_id, dkd_user_id, dkd_sender_key, dkd_sender_title, dkd_message_text, dkd_created_at')
        .eq('dkd_thread_id', dkd_thread_id)
        .order('dkd_created_at', { ascending: true });

      if (dkd_message_result.error) {
        dkd_set_error_text(dkd_message_result.error.message || 'Destek mesajları yüklenemedi.');
        dkd_set_thread_messages([]);
        return;
      }

      dkd_set_thread_messages(Array.isArray(dkd_message_result.data) ? dkd_message_result.data : []);
    } catch (dkd_message_load_error) {
      console.warn('DKD_SUPPORT_MESSAGE_LOAD_ERROR', dkd_message_load_error);
      dkd_set_error_text(dkd_message_load_error?.message || 'Destek mesajları yüklenemedi.');
      dkd_set_thread_messages([]);
    } finally {
      dkd_set_is_loading_messages(false);
    }
  }, []);
`;

dkd_support_panel_text = dkd_replace_once(
  dkd_support_panel_text,
  dkd_old_loader_block,
  dkd_new_loader_block,
  'DKD_SUPPORT_STEP6_LOADER_BLOCK_NOT_FOUND',
);

const dkd_old_runtime_not_ready_block = `    if (!dkd_supabase_runtime_config.dkd_is_ready) {
      dkd_set_error_text(dkd_supabase_runtime_config.dkd_issue_text || 'Supabase ayarı eksik.');
      dkd_set_remote_threads([]);
      return;
    }
`;

const dkd_new_runtime_not_ready_block = `    if (!dkd_supabase_runtime_config.dkd_is_ready) {
      dkd_set_error_text(dkd_supabase_runtime_config.dkd_issue_text || 'Supabase ayarı eksik.');
      dkd_set_remote_threads([]);
      dkd_set_selected_thread(null);
      dkd_set_thread_messages([]);
      dkd_set_is_loading_messages(false);
      dkd_set_is_loading_threads(false);
      return;
    }
`;

dkd_support_panel_text = dkd_replace_once(
  dkd_support_panel_text,
  dkd_old_runtime_not_ready_block,
  dkd_new_runtime_not_ready_block,
  'DKD_SUPPORT_STEP6_RUNTIME_BLOCK_NOT_FOUND',
);

const dkd_old_thread_message_call = `      if (dkd_next_selected_thread?.dkd_id) {
        dkd_load_thread_messages(dkd_next_selected_thread.dkd_id);
      } else {
        dkd_set_thread_messages([]);
      }
`;

const dkd_new_thread_message_call = `      if (dkd_next_selected_thread?.dkd_id) {
        await dkd_load_thread_messages(dkd_next_selected_thread.dkd_id);
      } else {
        dkd_set_thread_messages([]);
        dkd_set_is_loading_messages(false);
      }
`;

dkd_support_panel_text = dkd_replace_once(
  dkd_support_panel_text,
  dkd_old_thread_message_call,
  dkd_new_thread_message_call,
  'DKD_SUPPORT_STEP6_THREAD_CALL_BLOCK_NOT_FOUND',
);

const dkd_old_loading_render = `                    {dkd_is_loading_messages ? (
                      <View style={dkd_styles.dkd_loading_messages_box}>
                        <ActivityIndicator color="#67E8F9" size="small" />
                        <Text style={dkd_styles.dkd_loading_messages_text}>Konuşma yükleniyor...</Text>
                      </View>
                    ) : null}
`;

const dkd_new_loading_render = `                    {dkd_is_loading_messages && dkd_thread_messages.length === 0 ? (
                      <View style={dkd_styles.dkd_loading_messages_box}>
                        <ActivityIndicator color="#67E8F9" size="small" />
                        <Text style={dkd_styles.dkd_loading_messages_text}>Konuşma yükleniyor...</Text>
                      </View>
                    ) : null}
`;

dkd_support_panel_text = dkd_replace_once(
  dkd_support_panel_text,
  dkd_old_loading_render,
  dkd_new_loading_render,
  'DKD_SUPPORT_STEP6_LOADING_RENDER_BLOCK_NOT_FOUND',
);

dkd_write_file(dkd_support_panel_path, dkd_support_panel_text);

console.log('DKD_SUPPORT_PANEL_STEP6_OK: Destek Paneli konuşma yükleniyor göstergesi düzeltildi.');

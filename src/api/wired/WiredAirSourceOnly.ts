/**
 * Wired cards whose editor is read from the October AIR client code alone: no catalogue offer exists on hhus,
 * so nothing was observed at runtime. Correct these from a live check once one is possible.
 */
export const AIR_SOURCE_ONLY_WIRED: ReadonlySet<string> = new Set([
    'wf_cnd_wearing_badge', // AS3 wired_setup/conditions/class_4263.as
    'wf_cnd_not_wearing_b', // AS3 wired_setup/conditions/class_4263.as (negative)
    'wf_cnd_wearing_effect', // AS3 wired_setup/conditions/class_4227.as
    'wf_cnd_not_wearing_fx', // AS3 wired_setup/conditions/class_4227.as (negative)
    'wf_var_quest', // AS3 wired_setup/variables/QuestVariable.as
    'wf_var_quest_chain' // AS3 wired_setup/variables/QuestChainVariable.as
]);

/**
 * Wired cards whose runtime was read from the turbo-cloud emulator and never fired on the official hotel. Most editors
 * were observed on hhus (the AIR code only for at_time_long and move_furni_to); the server behaviour needs a live check.
 */
export const TURBO_REFERENCE_ONLY_WIRED: ReadonlySet<string> = new Set([
    'wf_act_bot_teleport', // AS3 wired_setup/actiontypes/class_4125.as
    'wf_act_bot_move', // AS3 wired_setup/actiontypes/class_4124.as
    'wf_act_bot_talk', // AS3 wired_setup/actiontypes/class_4250.as
    'wf_act_bot_talk_to_avatar', // AS3 wired_setup/actiontypes/class_4184.as
    'wf_act_bot_follow_avatar', // AS3 wired_setup/actiontypes/class_4307.as
    'wf_act_bot_clothes', // AS3 wired_setup/actiontypes/class_4170.as
    'wf_act_bot_give_handitem', // AS3 wired_setup/actiontypes/class_4031.as
    'wf_trg_bot_reached_avtr', // AS3 wired_setup/triggerconfs/class_4024.as
    'wf_trg_bot_reached_stf', // AS3 wired_setup/triggerconfs/class_4251.as
    'wf_trg_game_starts', // AS3 wired_setup/triggerconfs/class_4195.as
    'wf_trg_game_ends', // AS3 wired_setup/triggerconfs/class_4066.as
    'wf_trg_at_time_long', // AS3 wired_setup/triggerconfs/TriggerOnce.as (code 3)
    'wf_act_move_furni_to', // AS3 wired_setup/actiontypes/class_4162.as
    'wf_act_init_transaction', // AS3 wired_setup/actiontypes/chests/class_4180.as
    'wf_act_cancel_transaction', // AS3 wired_setup/actiontypes/chests/class_4182.as
    'wf_trg_transaction_complete', // AS3 wired_setup/triggerconfs/class_4226.as
    'wf_trg_transaction_fail', // AS3 wired_setup/triggerconfs/class_4009.as
    'wf_cnd_chest_has_items', // AS3 wired_setup/conditions/chests/ChestHasAmount.as
    'wf_cnd_chest_has_item_type', // AS3 wired_setup/conditions/chests/class_4163.as
    'wf_xtra_scan_chest_furni_by_type', // AS3 wired_setup/addons/chests/class_3960.as
    'wf_xtra_custom_contract', // AS3 wired_setup/addons/chests/class_4265.as
    'wf_act_give_currency', // AS3 wired_setup/actiontypes/chests/class_4174.as
    'wf_act_give_furni', // AS3 wired_setup/actiontypes/chests/class_4292.as
    'wf_act_give_reward', // AS3 wired_setup/actiontypes/class_4199.as
    'wf_act_mute_triggerer', // AS3 wired_setup/actiontypes/class_4046.as
    'wf_act_give_score', // AS3 wired_setup/actiontypes/GiveScore.as
    'wf_act_give_score_tm', // AS3 wired_setup/actiontypes/class_4040.as
    'wf_trg_score_achieved', // AS3 wired_setup/triggerconfs/ScoreAchieved.as
    'wf_act_place_furni', // AS3 wired_setup/actiontypes/class_3972.as
    'wf_act_remove_furni', // AS3 wired_setup/actiontypes/class_4089.as
    'wf_xtra_filter_users_by_var', // AS3 wired_setup/addons/class_4236.as
    'wf_xtra_text_input_variable', // AS3 wired_setup/addons/VariableCapturerAddon.as
    'wf_xtra_var_time_util', // AS3 wired_setup/addons/VariableTimeUtilAddon.as
    'wf_var_context', // AS3 wired_setup/variables/ContextVariable.as
    'wf_var_echo', // AS3 wired_setup/variables/EchoVariable.as
    'wf_var_reference', // AS3 wired_setup/variables/ReferenceVariable.as
    'wf_xtra_var_fx_health', // AS3 wired_setup/addons/variablefx/VariableFxHealthPointsAddon.as
    'wf_xtra_var_fx_progress', // AS3 wired_setup/addons/variablefx/VariableFxProgressBarAddon.as
    'wf_xtra_var_fx_level', // AS3 wired_setup/addons/variablefx/VariableFxLevellingProgressAddon.as
    'wf_xtra_var_fx_status', // AS3 wired_setup/addons/variablefx/VariableFxStatusBarAddon.as
    'wf_xtra_var_fx_boss', // AS3 wired_setup/addons/variablefx/VariableFxBossBarAddon.as
    'wf_xtra_var_fx_number', // AS3 wired_setup/addons/variablefx/VariableFxNumberDisplayAddon.as
]);

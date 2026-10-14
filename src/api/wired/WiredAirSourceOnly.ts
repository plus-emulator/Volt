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
    'wf_act_move_furni_to' // AS3 wired_setup/actiontypes/class_4162.as
]);

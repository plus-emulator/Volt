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

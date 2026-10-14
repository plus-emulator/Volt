/**
 * The Variables Web API add-on (code 2002, VARIABLES_WEB_API) as the official editor saves it:
 * VariablesWebApiAddon.as readStringParamFromForm L108 (`readKey TAB writeKey`) and readIntParamsFromForm L113
 * (`[1 when the write key is set and bulk delete is ticked, else 0]`). The keys are minted by the server
 * (generate request class_2618, outgoing 2515; result WiredWebApiKeyResultEvent); a save sends the keys as they are.
 * Build WIN63-202610131318-860371703.
 */

const KEY_SEPARATOR = '\t';

export interface IVariablesWebApiKeys {
    readKey: string;
    writeKey: string;
    bulkDelete: boolean;
}

/** Bulk delete rides on the write key: the official box disables the checkbox while the write key is empty. */
export const canAllowVariablesBulkDelete = (writeKey: string): boolean => !!writeKey;

export const parseVariablesWebApiKeys = (stringData: string | null | undefined, intData: number[] | null | undefined): IVariablesWebApiKeys => {
    const [readKey = '', writeKey = ''] = (stringData ?? '').split(KEY_SEPARATOR);

    return { readKey, writeKey, bulkDelete: intData?.[0] === 1 };
};

export const buildVariablesWebApiKeys = (keys: IVariablesWebApiKeys): { stringParam: string; intParams: number[] } => ({
    stringParam: `${keys.readKey}${KEY_SEPARATOR}${keys.writeKey}`,
    intParams: [canAllowVariablesBulkDelete(keys.writeKey) && keys.bulkDelete ? 1 : 0]
});

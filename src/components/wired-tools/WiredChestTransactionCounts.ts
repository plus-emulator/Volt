/** The Withdrawals and Deposits cells: a dash for nothing, otherwise furni, credits or both. */
export const summarizeTransactionCounts = (
    furni: number,
    coins: number,
    labels: { onlyFurni: (amount: number) => string; onlyCoins: (amount: number) => string; both: (amount: number, amount2: number) => string }
): string => {
    if (furni <= 0 && coins <= 0) return '-';
    if (furni > 0 && coins === 0) return labels.onlyFurni(furni);
    if (furni === 0 && coins > 0) return labels.onlyCoins(coins);

    return labels.both(furni, coins);
};

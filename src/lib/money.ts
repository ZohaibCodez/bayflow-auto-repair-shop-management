const pkr = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

/** Whole-rupee amounts, e.g. "PKR 16,100". */
export const formatPKR = (amount: number) => `PKR ${pkr.format(amount)}`;
export const formatNumber = (n: number) => pkr.format(n);

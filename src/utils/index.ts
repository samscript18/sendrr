export const formatWhole = (value: bigint) => new Intl.NumberFormat("en-US").format(Number(value));

export const formatTokenValue = (value: bigint) => {
	const whole = value / 10n ** 18n;
	const fraction = value % 10n ** 18n;
	if (fraction === 0n) {
		return `${whole.toLocaleString("en-US")}.00`;
	}

	const fractionString = fraction.toString().padStart(18, "0").slice(0, 2);
	return `${whole.toLocaleString("en-US")}.${fractionString}`;
};

export const parseAmountLines = (value: string) => {
	const chunks = value
		.split(/[\n,]/)
		.map((item) => item.trim())
		.filter(Boolean);

	let total = 0n;
	let invalidEntries = 0;

	for (const item of chunks) {
		if (!/^\d+$/.test(item)) {
			invalidEntries += 1;
			continue;
		}

		try {
			total += BigInt(item);
		} catch {
			invalidEntries += 1;
		}
	}

	return {
		total,
		invalidEntries,
		count: chunks.length,
	};
};


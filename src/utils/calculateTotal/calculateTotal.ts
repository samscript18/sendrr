export function calculateTotal(amounts: string): bigint {
	if (!amounts.trim()) {
		return BigInt(0);
	}

	try {
		const amountArray = amounts
			.split(/[,\n]+/)
			.map((amt) => amt.trim())
			.filter((amt) => amt !== "")
			.map((amt) => {
				try {
					return BigInt(amt);
				} catch {
					return BigInt(0);
				}
			});

		if (amountArray.length === 0) {
			return BigInt(0);
		}

		return amountArray.reduce((acc, curr) => acc + curr, BigInt(0));
	} catch {
		return BigInt(0);
	}
}

export function calculateTotalAsNumber(amounts: string): number {
	const bigIntTotal = calculateTotal(amounts);
	return Number(bigIntTotal);
}

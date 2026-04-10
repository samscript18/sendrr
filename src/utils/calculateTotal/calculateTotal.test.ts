import { describe, expect, it } from "vitest";

import { calculateTotal, calculateTotalAsNumber } from "./calculateTotal";

describe("calculateTotal", () => {
	it("returns 0n for empty input", () => {
		expect(calculateTotal("")).toBe(BigInt(0));
	});

	it("returns 0n for whitespace-only input", () => {
		expect(calculateTotal("   \n   \t   ")).toBe(BigInt(0));
	});

	it("sums comma-separated values", () => {
		expect(calculateTotal("100,200,300")).toBe(BigInt(600));
	});

	it("sums newline-separated values", () => {
		expect(calculateTotal("100\n200\n300")).toBe(BigInt(600));
	});

	it("sums mixed separators and trims spaces", () => {
		expect(calculateTotal(" 100,\n 200 ,300\n 400 ")).toBe(BigInt(1000));
	});

	it("ignores invalid entries by converting them to 0n", () => {
		expect(calculateTotal("100,abc,200,NaN,-,300")).toBe(BigInt(600));
	});

	it("ignores repeated separators and empty segments", () => {
		expect(calculateTotal("100,,\n\n,200,,,300")).toBe(BigInt(600));
	});

	it("handles very large integers safely", () => {
		const result = calculateTotal("90071992547409931234,66");
		expect(result).toBe(BigInt("90071992547409931300"));
	});

	it("supports negative bigint entries", () => {
		expect(calculateTotal("100,-40,-10")).toBe(BigInt(50));
	});

	it("handles CRLF-separated values", () => {
		expect(calculateTotal("100\r\n200\r\n300")).toBe(BigInt(600));
	});

	it("treats decimal and scientific notation as invalid", () => {
		expect(calculateTotal("100,1.5,2e3,300")).toBe(BigInt(400));
	});

	it("returns 0n when all provided entries are invalid", () => {
		expect(calculateTotal("abc,NaN,hello,1.5,2e3,-")).toBe(BigInt(0));
	});

	it("accepts explicit plus-sign integer entries", () => {
		expect(calculateTotal("+100,+200,300")).toBe(BigInt(600));
	});
});

describe("calculateTotalAsNumber", () => {
	it("returns a number for valid input", () => {
		expect(calculateTotalAsNumber("100,200,300")).toBe(600);
	});

	it("returns 0 for empty input", () => {
		expect(calculateTotalAsNumber("")).toBe(0);
	});

	it("matches calculateTotal conversion for mixed valid/invalid input", () => {
		const asBigInt = calculateTotal("100,abc,200");
		expect(calculateTotalAsNumber("100,abc,200")).toBe(Number(asBigInt));
	});

	it("returns 0 for all-invalid input", () => {
		expect(calculateTotalAsNumber("abc,NaN,hello")).toBe(0);
	});

	it("can lose integer safety for large totals", () => {
		const amounts = "9007199254740992,10";
		const asBigInt = calculateTotal(amounts);
		const asNumber = calculateTotalAsNumber(amounts);

		expect(asNumber).toBe(Number(asBigInt));
		expect(Number.isSafeInteger(asNumber)).toBe(false);
	});
});

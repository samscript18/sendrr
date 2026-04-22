"use client";

import { chainsToTSender, erc20Abi, tsenderAbi } from "@/configs/contract";
import { formatTokenValue, formatWhole } from "@/utils";
import { calculateTotal } from "@/utils/calculateTotal/calculateTotal";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { useQuery } from "@tanstack/react-query";
import { isAddress } from "viem";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, useConfig, useWriteContract } from "wagmi";
import WalletControls from "./ui/wallet-controls";
import { TxPhase } from "@/types";

const getStoredValue = (key: string) => {
	if (typeof window === "undefined") {
		return "";
	}

	return localStorage.getItem(key) ?? "";
};

const Home = () => {
	const [safeMode, setSafeMode] = useState<boolean>(true);
	const [tokenAddress, setTokenAddress] = useState<string>(() => getStoredValue("tokenAddress"));
	const [recipients, setRecipients] = useState<string>(() => getStoredValue("recipients"));
	const [amounts, setAmounts] = useState<string>(() => getStoredValue("amounts"));
	const [txPhase, setTxPhase] = useState<TxPhase>("idle");
	const [txMessage, setTxMessage] = useState<string>("");
	const chainId = useChainId();
	const account = useAccount();
	const config = useConfig();
	const total: bigint = useMemo(() => calculateTotal(amounts), [amounts]);
	const { writeContractAsync } = useWriteContract();

	const recipientsList = recipients
		.split(/[,\n]+/)
		.map((addr) => addr.trim())
		.filter((addr) => addr !== "") as `0x${string}`[];

	const amountsList = amounts
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

	const cardTone = safeMode ? "border-sky-400/80 shadow-[0_0_0_1px_rgba(56,189,248,0.5),0_25px_70px_rgba(14,165,233,0.25)]" : "border-rose-400/80 shadow-[0_0_0_1px_rgba(251,113,133,0.5),0_25px_70px_rgba(244,63,94,0.28)]";
	const ctaTone = safeMode ? "from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500" : "from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500";
	const isSubmitting = txPhase === "awaiting_wallet" || txPhase === "confirming_chain";

	const getApprovedAmount = useCallback(
		async (tsenderAddress: string | null): Promise<bigint> => {
			if (!tsenderAddress || !account.address || !isAddress(tokenAddress)) {
				return BigInt(0);
			}

			const response = await readContract(config, {
				abi: erc20Abi,
				address: tokenAddress as `0x${string}`,
				functionName: "allowance",
				args: [account.address, tsenderAddress as `0x${string}`],
			});

			return response as bigint;
		},
		[account.address, tokenAddress],
	);

	useEffect(() => {
		localStorage.setItem("tokenAddress", tokenAddress);
	}, [tokenAddress]);

	useEffect(() => {
		localStorage.setItem("recipients", recipients);
	}, [recipients]);

	useEffect(() => {
		localStorage.setItem("amounts", amounts);
	}, [amounts]);

	const {
		data: tokenDetails,
		isLoading: tokenDetailsLoading,
		isError: tokenDetailsError,
	} = useQuery({
		queryKey: ["token-details", chainId, account.address, tokenAddress],
		enabled: Boolean(account.address && tokenAddress && isAddress(tokenAddress) && chainsToTSender[chainId]?.tsender),
		queryFn: async () => {
			const tsenderAddress = chainsToTSender[chainId]?.tsender ?? null;
			const [symbolResult, nameResult, decimalsResult, balanceResult, allowanceResult] = await Promise.all([
				readContract(config, {
					abi: erc20Abi,
					address: tokenAddress as `0x${string}`,
					functionName: "symbol",
				}),
				readContract(config, {
					abi: erc20Abi,
					address: tokenAddress as `0x${string}`,
					functionName: "name",
				}),
				readContract(config, {
					abi: erc20Abi,
					address: tokenAddress as `0x${string}`,
					functionName: "decimals",
				}),
				readContract(config, {
					abi: erc20Abi,
					address: tokenAddress as `0x${string}`,
					functionName: "balanceOf",
					args: [account.address as `0x${string}`],
				}),
				getApprovedAmount(tsenderAddress),
			]);

			return {
				symbol: String(symbolResult),
				name: String(nameResult),
				decimals: String(decimalsResult),
				balance: formatWhole(balanceResult as bigint),
				allowance: formatWhole(allowanceResult),
			};
		},
		retry: 1,
		staleTime: 30_000,
	});

	const handleSubmit = async () => {
		const tsenderAddress = chainsToTSender[chainId]?.tsender;
		if (!account.address || !tsenderAddress || !isAddress(tokenAddress)) {
			setTxPhase("error");
			setTxMessage("Connect wallet and enter a valid token address first.");
			return;
		}

		try {
			setTxPhase("awaiting_wallet");
			setTxMessage("Confirm in MetaMask...");

			const approvedAmount = await getApprovedAmount(tsenderAddress);

			if (approvedAmount < total) {
				const approvalHash = await writeContractAsync({
					abi: erc20Abi,
					address: tokenAddress as `0x${string}`,
					functionName: "approve",
					args: [tsenderAddress as `0x${string}`, total],
				});
				setTxPhase("confirming_chain");
				setTxMessage("Approval submitted. Waiting for confirmation...");
				await waitForTransactionReceipt(config, { hash: approvalHash });
			}

			setTxPhase("awaiting_wallet");
			setTxMessage("Approve airdrop transaction in MetaMask...");
			const airdropHash = await writeContractAsync({
				abi: tsenderAbi,
				address: tsenderAddress as `0x${string}`,
				functionName: "airdropERC20",
				args: [tokenAddress as `0x${string}`, recipientsList, amountsList, total],
			});

			setTxPhase("confirming_chain");
			setTxMessage("Airdrop submitted. Waiting for confirmation...");
			await waitForTransactionReceipt(config, { hash: airdropHash });
			setTxPhase("success");
			setTxMessage("Airdrop transaction confirmed.");
		} catch (error) {
			setTxPhase("error");
			setTxMessage(error instanceof Error ? error.message : "Transaction failed.");
		}
	};

	return (
		<div className="min-h-screen bg-[#0b1221] text-slate-100">
			<div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(52,211,153,0.2),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(56,189,248,0.2),transparent_38%),radial-gradient(circle_at_50%_95%,rgba(251,113,133,0.24),transparent_38%)]" />
			<div className="pointer-events-none fixed inset-0 opacity-30 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-size-[36px_36px]" />

			<header className="relative overflow-hidden border-b border-cyan-300/15 bg-slate-950/80 backdrop-blur-2xl">
				<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-300/70 to-transparent" />
				<div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex items-center gap-4">
						<div className="relative">
							<div className="absolute inset-0 rounded-2xl bg-linear-to-br from-cyan-400 to-blue-600 blur-md opacity-40" />
							<div className="relative grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/40 bg-linear-to-br from-[#0ea5e9] to-[#2563eb] text-base font-black text-white shadow-[0_10px_35px_rgba(14,165,233,0.45)]">
								SR
							</div>
						</div>

						<div>
							<p className="text-2xl font-black tracking-tight text-white">Sendrr</p>
							<p className="text-xs uppercase tracking-[0.25em] text-cyan-200/80">Multisend Console</p>
						</div>
					</div>

					<div className="hidden xl:flex xl:flex-1 xl:justify-center">
						<div className="rounded-full border border-white/10 bg-slate-900/65 px-6 py-2 text-sm italic text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
							The most gas efficient airdrop flow for serious token teams.
						</div>
					</div>

					<div className="flex items-center justify-between gap-3 lg:justify-end">
						<div className="hidden rounded-full border border-emerald-300/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 md:block">Live on EVM Chains</div>
						<WalletControls />
					</div>
				</div>
			</header>

			{account.isConnected ? (
				<main className="relative mx-auto flex w-full max-w-7xl justify-center px-4 py-10 md:px-8">
					<section className={`w-full max-w-3xl rounded-3xl border bg-slate-950/65 p-6 backdrop-blur-xl md:p-8 ${cardTone}`}>
						<div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
							<h1 className="text-4xl font-black tracking-tight">Sendrr</h1>
							<div className="inline-flex rounded-xl border border-white/10 bg-slate-900/70 p-1">
								<button
									type="button"
									onClick={() => setSafeMode(true)}
									className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${safeMode ? "bg-white text-slate-900 shadow" : "text-slate-400 hover:text-slate-200"}`}
								>
									Safe Mode
								</button>
								<button
									type="button"
									onClick={() => setSafeMode(false)}
									className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${!safeMode ? "bg-white text-slate-900 shadow" : "text-slate-400 hover:text-slate-200"}`}
								>
									Unsafe Mode
								</button>
							</div>
						</div>

						<div className="space-y-5">
							<label className="block">
								<p className="mb-2 text-sm font-semibold text-slate-300">Token Address</p>
								<input
									type="text"
									value={tokenAddress}
									onChange={(e) => setTokenAddress(e.target.value)}
									placeholder="0x"
									className="h-12 w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-sky-400"
								/>
							</label>

							<label className="block">
								<p className="mb-2 text-sm font-semibold text-slate-300">Recipients (comma or new line separated)</p>
								<textarea
									value={recipients}
									onChange={(e) => setRecipients(e.target.value)}
									placeholder="0x123..., 0x456..."
									rows={4}
									className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-sky-400"
								/>
							</label>

							<label className="block">
								<p className="mb-2 text-sm font-semibold text-slate-300">Amounts (wei; comma or new line separated)</p>
								<textarea
									value={amounts}
									onChange={(e) => setAmounts(e.target.value)}
									placeholder="100, 200, 300..."
									rows={4}
									className="w-full rounded-xl border border-white/15 bg-slate-900/80 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 transition focus:border-sky-400"
								/>
							</label>
						</div>

						<div className="mt-5 rounded-2xl border border-white/15 bg-slate-900/65 p-5">
							<h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-slate-300">Transaction Details</h3>
							<div className="grid gap-2 text-sm text-slate-300 grid-cols-1">
								<div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2">
									<span>Token Name</span>
									<span className="font-semibold text-slate-100">
										{tokenDetailsLoading ? "..." : `${tokenDetails ? `${tokenDetails?.name} (${tokenDetails?.symbol})` : "-"}`}
									</span>
								</div>
								<div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2">
									<span>Recipients</span>
									<span className="font-semibold text-slate-100">{recipientsList.length}</span>
								</div>
								<div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2 min-h-auto">
									<span>Amount(Wei)</span>
									<span className="font-semibold text-slate-100 wrap-break-word">{tokenDetailsLoading ? "..." : total}</span>
								</div>
								<div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-800/50 px-3 py-2">
									<span>Amount({tokenDetails?.symbol ?? "token"})</span>
									<span className="font-semibold text-slate-100">{tokenDetailsLoading ? "..." : tokenDetails ? formatTokenValue(total) : "-"}</span>
								</div>
							</div>
							{tokenAddress && !isAddress(tokenAddress) ? <p className="mt-3 text-sm text-amber-300">Enter a valid token address</p> : null}
							{tokenDetailsError ? <p className="mt-3 text-sm text-amber-300">Unable to load token details</p> : null}
						</div>

						{safeMode ? null : (
							<div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
								<p>Using unsafe super gas optimized mode</p>
								<span className="rounded-full border border-rose-300/40 px-2 py-0.5 text-xs">i</span>
							</div>
						)}

						{txPhase !== "idle" ? (
							<div className="mt-5 flex w-full items-start gap-3 rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
								{isSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200 border-t-transparent" /> : <span className="text-base">•</span>}
								<p className="min-w-0 flex-1 wrap-break-word whitespace-pre-wrap">{txMessage}</p>
							</div>
						) : null}

						<button
							type="button"
							onClick={handleSubmit}
							disabled={isSubmitting}
							className={`mt-6 h-13 w-full rounded-xl bg-linear-to-r text-lg font-bold text-white shadow-[0_12px_30px_rgba(59,130,246,0.35)] transition hover:-translate-y-0.5 ${ctaTone}`}
						>
							{isSubmitting ? "Processing..." : safeMode ? "Send Tokens" : "Send Tokens (Unsafe)"}
						</button>
					</section>
				</main>
			) : (
				<main className="relative mx-auto flex w-full max-w-7xl justify-center px-4 py-14 md:px-8 mt-8">
					<section className="w-full max-w-2xl rounded-3xl border border-cyan-300/35 bg-slate-950/65 p-7 text-center shadow-[0_0_0_1px_rgba(56,189,248,0.35),0_24px_70px_rgba(14,165,233,0.2)] backdrop-blur-xl md:p-10">
						<div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/45 bg-linear-to-br from-cyan-400/30 to-blue-600/30 text-cyan-100">
							<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M5.25 8.25h13.5a2.25 2.25 0 0 1 2.25 2.25v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 16.5v-6a2.25 2.25 0 0 1 2.25-2.25Z"
								/>
								<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6.75A3.75 3.75 0 0 0 12.75 3h-1.5A3.75 3.75 0 0 0 7.5 6.75v1.5" />
								<circle cx="15.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
							</svg>
						</div>

						<h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">Connect Your Wallet</h2>
						<p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
							Connect a wallet to unlock the Sendrr console, preview token data, and execute multi-send transactions.
						</p>

						<div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100">
							<span className="h-2 w-2 rounded-full bg-cyan-300" />
							Use the top-right connect button
						</div>
					</section>
				</main>
			)}
		</div>
	);
};

export default Home;

import secrets from "@/constants/constant";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, zksync, mainnet } from "wagmi/chains";

let cachedConfig: ReturnType<typeof getDefaultConfig> | null = null;

export const getConfig = () => {
	if (typeof window === "undefined") {
		throw new Error("Wagmi config can only be created in the browser.");
	}

	if (cachedConfig) {
		return cachedConfig;
	}

	cachedConfig = getDefaultConfig({
		appName: "Sendrr",
		projectId: secrets.walletConnectProjectId,
		chains: [anvil, zksync, mainnet],
		ssr: false,
	});

	return cachedConfig;
};

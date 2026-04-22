import secrets from "@/constants/constant";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { anvil, zksync, mainnet } from "wagmi/chains";

let config: ReturnType<typeof getDefaultConfig> | null = null;

export const getConfig = () => {
	config = getDefaultConfig({
		appName: "Sendrr",
		projectId: secrets.walletConnectProjectId,
		chains: [anvil, zksync, mainnet],
		ssr: false,
	});

	return config;
};

import secrets from "@/constants/constant";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createStorage } from "wagmi";
import { anvil, zksync, mainnet } from "wagmi/chains";

export const config = getDefaultConfig({
	appName: "Sendrr",
	projectId: secrets.walletConnectProjectId,
	chains: [anvil, zksync, mainnet],
	storage: createStorage({
		storage: typeof window !== "undefined" ? localStorage : undefined,
	}),
	ssr: false,
});

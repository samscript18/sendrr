"use client";

import { getConfig } from "@/configs/config";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";

const queryClient = new QueryClient();

export const Provider = ({ children }: { children: React.ReactNode }) => {
	const [config, setConfig] = useState<ReturnType<typeof getConfig> | null>(null);

	useEffect(() => {
		setConfig(getConfig());
	}, []);

	if (!config) {
		return null;
	}

	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider>{children}</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
};

"use client";

import { config } from "@/configs/config";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { WagmiProvider } from "wagmi";

const queryClient = new QueryClient();
const subscribe = () => () => {};

const useIsClient = () => {
	return useSyncExternalStore(
		subscribe,
		() => true,
		() => false,
	);
};

export const Provider = ({ children }: { children: React.ReactNode }) => {
	const isClient = useIsClient();

	if (!isClient) {
		return <>{children}</>;
	}

	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider>{children}</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
};

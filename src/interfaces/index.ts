export interface ContractsConfig {
	[chainId: number]: {
		tsender: string;
		no_check: string | null;
	};
}

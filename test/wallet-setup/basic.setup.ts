// Import necessary Synpress modules
import secrets from "@/constants/constant";
import { defineWalletSetup } from "@synthetixio/synpress";
import { MetaMask } from "@synthetixio/synpress/playwright";

// Define a test seed phrase and password
const SEED_PHRASE = secrets.seedPhrase;
const PASSWORD = secrets.password;

type SynpressContext = ConstructorParameters<typeof MetaMask>[0];
type SynpressWalletPage = ConstructorParameters<typeof MetaMask>[1];

// Define the basic wallet setup
export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
	// Create a new MetaMask instance
	const metamask = new MetaMask(context as unknown as SynpressContext, walletPage as unknown as SynpressWalletPage, PASSWORD);

	// Import the wallet using the seed phrase
	await metamask.importWallet(SEED_PHRASE);

	// Additional setup steps can be added here, such as:
	// - Adding custom networks
	// - Importing tokens
	// - Setting up specific account states
});

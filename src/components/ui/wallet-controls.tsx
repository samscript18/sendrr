import { ConnectButton } from "@rainbow-me/rainbowkit";

const WalletControls = () => {
	return <ConnectButton accountStatus={{ smallScreen: "avatar", largeScreen: "full" }} chainStatus="full" showBalance={{ smallScreen: false, largeScreen: true }} label="Connect Wallet" />;
};
export default WalletControls;

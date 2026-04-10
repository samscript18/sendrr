import { testWithSynpress } from "@synthetixio/synpress";
import { MetaMask, metaMaskFixtures } from "@synthetixio/synpress/playwright";
import basicSetup from "../wallet-setup/basic.setup";

const test = testWithSynpress(metaMaskFixtures(basicSetup));
const { expect } = test;

test("has title", async ({ page }) => {
	await page.goto("https://playwright.dev/");
	await expect(page).toHaveTitle(/Sendrr/);
});

test("should show the airdropform when connected, otherwise, not", async ({ page, context, metamaskPage, extensionId }) => {
	await page.goto("/");
	await expect(page.getByText("Connect Your Wallet")).toBeVisible();

	const metamask = new MetaMask(context, metamaskPage, basicSetup.walletPassword, extensionId);
	await page.getByTestId("rk-connect-button").click();
	await page.getByTestId("rk-wallet-option-io.metamask").waitFor({
		state: "visible",
		timeout: 3000,
	});
	await page.getByTestId("rk-wallet-option-io.metamask").click();
	await metamask.connectToDapp();
});

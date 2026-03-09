import { ipcMain } from "electron";
import type { ProviderType, SetApiKeyInput } from "../contracts.js";
import type { IpcContext } from "./types.js";

export function registerAuthHandlers(ctx: IpcContext): void {
  ipcMain.handle("auth:setApiKey", async (_event, input: SetApiKeyInput) => {
    return ctx.oauthManager.setApiKey(input);
  });

  ipcMain.handle("auth:status", async (_event, provider: ProviderType) => {
    return ctx.oauthManager.getStatus(provider);
  });

  ipcMain.handle("auth:logout", async (_event, provider: ProviderType) => {
    return ctx.oauthManager.logout(provider);
  });

  ipcMain.handle("auth:oauthAvailability", async () => {
    return ctx.oauthManager.getOAuthAvailability();
  });

  ipcMain.handle("auth:initiateOAuth", async (_event, provider: ProviderType) => {
    return ctx.oauthManager.initiateOAuth(provider);
  });

  ipcMain.handle("auth:waitOAuthCallback", async (_event, provider: ProviderType) => {
    return ctx.oauthManager.waitForOAuthCallback(provider);
  });

  ipcMain.handle("auth:cancelOAuth", async (_event, provider: ProviderType) => {
    return ctx.oauthManager.cancelOAuth(provider);
  });

  ipcMain.handle("auth:submitOAuthCode", async (_event, provider: ProviderType, code: string) => {
    return ctx.oauthManager.submitOAuthCode(provider, code);
  });

  // GitHub Device Code (Copilot)
  ipcMain.handle("auth:initiateDeviceCode", async () => {
    return ctx.oauthManager.initiateDeviceCode();
  });

  ipcMain.handle("auth:pollDeviceCode", async () => {
    return ctx.oauthManager.pollDeviceCode();
  });

  ipcMain.handle("auth:cancelDeviceCode", async () => {
    ctx.oauthManager.cancelDeviceCode();
  });
}

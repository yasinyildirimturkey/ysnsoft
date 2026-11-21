import type { HotelConfig } from "../config/hotel.js";
import { ElektraClient, elektraSecretsFromEnv } from "./elektra.js";
import { MockPmsClient } from "./mock.js";
import type { PmsClient } from "./types.js";

export function createPmsClient(config: HotelConfig): PmsClient {
  switch (config.pms.type) {
    case "mock":
      return new MockPmsClient();
    case "elektra":
      return new ElektraClient(config.pms, elektraSecretsFromEnv(config.pms.secretsEnvPrefix));
  }
}

export * from "./types.js";

import path from "node:path";
import type { Hotel } from "../config/hotel.js";
import { ElektraClient, elektraSecretsFromEnv } from "./elektra.js";
import { MockPmsClient } from "./mock.js";
import { loadSamplePmsData, SamplePmsClient } from "./sample.js";
import type { PmsClient } from "./types.js";

export function createPmsClient(hotel: Hotel): PmsClient {
  const { config } = hotel;
  switch (config.pms.type) {
    case "mock":
      return config.pms.dataFile
        ? new SamplePmsClient(loadSamplePmsData(path.join(hotel.dir, config.pms.dataFile)))
        : new MockPmsClient();
    case "elektra":
      return new ElektraClient(config.pms, elektraSecretsFromEnv(config.pms.secretsEnvPrefix));
  }
}

export * from "./types.js";

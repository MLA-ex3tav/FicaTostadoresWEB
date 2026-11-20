import { beforeEach, describe, expect, it } from "vitest";
import {
  getElectronDevices,
  getElectronPresenceStatus,
  normalizeElectronHeartbeatPayload,
  recordElectronHeartbeat,
  setElectronDeviceAlias,
} from "./electron-presence";

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

describe("presencia multi-equipo", () => {
  it("normaliza el flag pcMaster del heartbeat", () => {
    expect(normalizeElectronHeartbeatPayload({ pcMaster: true }).pcMaster).toBe(true);
    expect(normalizeElectronHeartbeatPayload({ pcMaster: "true" }).pcMaster).toBe(false);
    expect(normalizeElectronHeartbeatPayload({}).pcMaster).toBe(false);
  });

  it("registra varios equipos y marca cuál tiene PC Master", async () => {
    const masterId = `test-master-${Date.now()}`;
    const otherId = `test-other-${Date.now()}`;

    await recordElectronHeartbeat({
      instanceId: masterId,
      hostname: "PC-MASTER-TEST",
      version: "1.0.0",
      pcMaster: true,
    });
    await recordElectronHeartbeat({
      instanceId: otherId,
      hostname: "PC-SECUNDARIO-TEST",
      version: "1.0.0",
      pcMaster: false,
    });

    const devices = await getElectronDevices();
    const master = devices.find((device) => device.instanceId === masterId);
    const other = devices.find((device) => device.instanceId === otherId);

    expect(master?.pcMaster).toBe(true);
    expect(master?.hostname).toBe("PC-MASTER-TEST");
    expect(other?.pcMaster).toBe(false);
    expect(devices.length).toBeGreaterThanOrEqual(2);
  });

  it("el estado general refleja el último equipo y la cantidad registrada", async () => {
    const id = `test-latest-${Date.now()}`;
    await new Promise((resolve) => setTimeout(resolve, 10));

    await recordElectronHeartbeat({
      instanceId: id,
      hostname: "PC-LATEST-TEST",
      pcMaster: true,
    });

    const status = await getElectronPresenceStatus();

    expect(status.hostname).toBe("PC-LATEST-TEST");
    expect(status.pcMaster).toBe(true);
    expect(status.deviceCount).toBeGreaterThanOrEqual(1);
    expect(status.storage).toBe("memory");
    expect(status.connected).toBe(true);
  });

  it("guarda, recorta y limpia el alias de un equipo", async () => {
    const id = `test-alias-${Date.now()}`;
    await recordElectronHeartbeat({
      instanceId: id,
      hostname: "PC-TEST-ALIAS",
      pcMaster: false,
    });

    const renamed = await setElectronDeviceAlias(id, "  PC de oficina  ");
    expect(renamed?.alias).toBe("PC de oficina");

    const fromList = (await getElectronDevices()).find(
      (device) => device.instanceId === id,
    );
    expect(fromList?.alias).toBe("PC de oficina");

    const cleared = await setElectronDeviceAlias(id, null);
    expect(cleared?.alias).toBeNull();
  });

  it("el heartbeat no sobrescribe el alias puesto desde el admin", async () => {
    const id = `test-alias-heartbeat-${Date.now()}`;
    await recordElectronHeartbeat({
      instanceId: id,
      hostname: "PC-TEST-ALIAS-HB",
      version: "1.0.0",
    });
    await setElectronDeviceAlias(id, "Servidor principal");

    await recordElectronHeartbeat({
      instanceId: id,
      hostname: "PC-TEST-ALIAS-HB-NUEVO",
      version: "1.0.1",
    });

    const device = (await getElectronDevices()).find(
      (item) => item.instanceId === id,
    );

    expect(device?.alias).toBe("Servidor principal");
    expect(device?.hostname).toBe("PC-TEST-ALIAS-HB-NUEVO");
  });

  it("devuelve null al renombrar un equipo inexistente", async () => {
    expect(
      await setElectronDeviceAlias(`no-existe-${Date.now()}`, "Whatever"),
    ).toBeNull();
  });
});

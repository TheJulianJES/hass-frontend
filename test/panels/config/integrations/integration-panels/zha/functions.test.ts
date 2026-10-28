import { describe, expect, it } from "vitest";
import { computeCommandValue } from "../../../../../../src/panels/config/integrations/integration-panels/zha/functions";
import type { Command } from "../../../../../../src/data/zha";

const command = (partial: Partial<Command>): Command => ({
  name: "",
  id: 0,
  type: "server",
  schema: [],
  ...partial,
});

describe("computeCommandValue", () => {
  it("distinguishes a server command from a client command with the same ID", () => {
    // Regression test: a Zigbee command ID is only unique within one
    // direction, so a cluster can define both a server command and a client
    // report at the same ID (the Inovelli VZM32-SN mmWave cluster does, at
    // 0x00-0x03). Keying the command picker on the ID alone let whichever
    // entry sorted first shadow the other, so picking the server command
    // issued the client report instead. Both commands share a name here too,
    // so the key has to include the direction to tell them apart.
    const serverCommand = command({ id: 0x00, name: "report", type: "server" });
    const clientCommand = command({ id: 0x00, name: "report", type: "client" });

    expect(computeCommandValue(serverCommand)).not.toBe(
      computeCommandValue(clientCommand)
    );
  });
});

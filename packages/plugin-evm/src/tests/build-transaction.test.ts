import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { parseEther } from "viem";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import * as elizaCore from "@elizaos/core";

import { createUnsignedTxAction } from "../actions/build-transaction";

// Definim uns valors per defecte per als tests.
const defaultTransferParams = {
  fromAddress: "0xElTeuCompte",
  toAddress: "0xReceptorAddress1234567890abcdef",
  amount: "1",
};

describe("Build Transaction Action", () => {
  let runtime: IAgentRuntime;
  let message: Memory;
  let state: State;

  beforeEach(() => {
    // Cream uns mètodes mínims per al runtime que s'utilitzen a l'acció.
    runtime = {
      composeState: vi.fn(async (msg: Memory) => ({})),
      updateRecentMessageState: vi.fn(async (state: State) => state),
      getSetting: vi.fn(),
    } as unknown as IAgentRuntime;
    
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("ha de retornar un JSON de transacció unsigned ben format", async () => {
    // Stub per generateObjectDeprecated per retornar uns paràmetres de transferència coneguts.
    vi.spyOn(elizaCore, "generateObjectDeprecated").mockResolvedValue(defaultTransferParams);

    const callback = vi.fn();
    const result = await createUnsignedTxAction.handler(runtime, message, state, {}, callback);

    // Calculem el valor esperat en hex a partir de "1" ETH.
    const expectedValue = "0x" + parseEther("1").toString(16);

    expect(callback).toHaveBeenCalledWith({
      text: "Transacció no signada generada correctament.",
      content: {
        from: "0xElTeuCompte",
        to: "0xReceptorAddress1234567890abcdef",
        value: expectedValue,
      },
    });
    expect(result).toBe(true);
  });

  it("ha de usar l'adreça per defecte si no es proporciona la sender address", async () => {
    // Stub per generateObjectDeprecated per retornar uns paràmetres sense "fromAddress"
    vi.spyOn(elizaCore, "generateObjectDeprecated").mockResolvedValue({
      toAddress: "0xReceptorAddress1234567890abcdef",
      amount: "2",
    });

    const callback = vi.fn();
    const result = await createUnsignedTxAction.handler(runtime, message, state, {}, callback);

    const expectedValue = "0x" + parseEther("2").toString(16);
    expect(callback).toHaveBeenCalledWith({
      text: "Transacció no signada generada correctament.",
      content: {
        from: "0xElTeuCompte", // s'utilitza el valor per defecte
        to: "0xReceptorAddress1234567890abcdef",
        value: expectedValue,
      },
    });
    expect(result).toBe(true);
  });
});

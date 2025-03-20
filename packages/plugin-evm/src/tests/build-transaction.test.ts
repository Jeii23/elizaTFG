import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { parseEther } from "viem";
import type { IAgentRuntime, Memory, State } from "@elizaos/core";
import * as elizaCore from "@elizaos/core";

import { createUnsignedTxAction } from "../actions/createUnsignedTx";

// Tests addicionals per a la build transaction
describe("Build Transaction Action - Tests Addicionals", () => {
  let runtime: IAgentRuntime;
  let message: Memory;
  let state: State;

  beforeEach(() => {
    runtime = {
      composeState: vi.fn(async (msg: Memory) => ({})),
      updateRecentMessageState: vi.fn(async (state: State) => state),
      getSetting: vi.fn(),
    } as unknown as IAgentRuntime;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Test 1: Comprovar què passa si generateObjectDeprecated retorna null.
  it("ha de retornar error si generateObjectDeprecated retorna null", async () => {
    vi.spyOn(elizaCore, "generateObjectDeprecated").mockResolvedValue(null);
    const callback = vi.fn();
    const result = await createUnsignedTxAction.handler(runtime, message, state, {}, callback);

    // Aquest test assumeix que el handler crida al callback amb un missatge d'error
    expect(callback).toHaveBeenCalledWith({
      text: "Error: No s'han pogut generar els paràmetres per la transacció unsigned."
    });
    expect(result).toBe(false);
  });

  // Test 2: Comprovar que si falta el camp "toAddress", s'informa de l'error.
  it("ha de retornar error si falta el camp 'toAddress'", async () => {
    vi.spyOn(elizaCore, "generateObjectDeprecated").mockResolvedValue({
      fromAddress: "0xElTeuCompte",
      amount: "1"
    });
    const callback = vi.fn();
    const result = await createUnsignedTxAction.handler(runtime, message, state, {}, callback);

    // Aquest test assumeix que el handler detecta la manca del camp i retorna un error.
    expect(callback).toHaveBeenCalledWith({
      text: "Error: Falta 'toAddress' en els paràmetres de la transacció unsigned."
    });
    expect(result).toBe(false);
  });

  // Test 3: Comprovar que si l'import ("amount") és invàlid, es gestiona l'error (per exemple, llençant una excepció).
  it("ha de gestionar errors si l'import ('amount') és invàlid", async () => {
    vi.spyOn(elizaCore, "generateObjectDeprecated").mockResolvedValue({
      fromAddress: "0xElTeuCompte",
      toAddress: "0xReceptorAddress1234567890abcdef",
      amount: "not_a_number"
    });
    const callback = vi.fn();

    // Aquí esperem que parseEther falli i el handler llençi una excepció.
    await expect(
      createUnsignedTxAction.handler(runtime, message, state, {}, callback)
    ).rejects.toThrow();
  });

  // Test 4: Comprovar que s'eliminen els espais innecessaris en les adreces
  it("ha de retornar una transacció unsigned correcte fins i tot amb espais extra en les adreces", async () => {
    vi.spyOn(elizaCore, "generateObjectDeprecated").mockResolvedValue({
      fromAddress: "   0xElTeuCompte  ",
      toAddress: "0xReceptorAddress1234567890abcdef   ",
      amount: "3"
    });
    const callback = vi.fn();
    const result = await createUnsignedTxAction.handler(runtime, message, state, {}, callback);

    const expectedValue = "0x" + parseEther("3").toString(16);
    expect(callback).toHaveBeenCalledWith({
      text: "Transacció no signada generada correctament.",
      content: {
        from: "0xElTeuCompte", // s'espera que s'elimini l'espai extra
        to: "0xReceptorAddress1234567890abcdef",
        value: expectedValue,
      },
    });
    expect(result).toBe(true);
  });
});

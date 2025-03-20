import { parseEther } from "viem";
import {
  type Action,
  composeContext,
  generateObjectDeprecated,
  type HandlerCallback,
  ModelClass,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@elizaos/core";

import type { BuildParams } from "../types";
import { unsignedTxTemplate } from "../templates";

// Aquesta classe crea una transacció sense signar en format JSON.
export class CreateUnsignedTxAction {
  async createUnsignedTx(params: BuildParams): Promise<object> {
    // Convertim el valor (per exemple, la quantitat en ethers) a format hex
    const valueHex = "0x" + parseEther(params.amount || "1").toString(16);
    return {
      from: params.fromAddress ? params.fromAddress.trim() : "0xElTeuCompte",
      to: params.toAddress ? params.toAddress.trim() : "0xReceptorAddress1234567890abcdef",
      value: valueHex,
    };
  }
}

const buildTransferDetails = async (
  state: State,
  runtime: IAgentRuntime
): Promise<BuildParams> => {
  // Componem el context per generar els paràmetres a partir d'una plantilla
  const context = composeContext({
    state,
    template: unsignedTxTemplate,
  });

  const transferDetails = (await generateObjectDeprecated({
    runtime,
    context,
    modelClass: ModelClass.SMALL,
  })) as BuildParams;

  // Comprovem si s'ha generat un objecte vàlid
  if (!transferDetails) {
    throw new Error("Error: No s'han pogut generar els paràmetres per la transacció unsigned.");
  }

  // Comprovem que existeixi el camp 'toAddress'
  if (!transferDetails.toAddress || transferDetails.toAddress.trim() === "") {
    throw new Error("Error: Falta 'toAddress' en els paràmetres de la transacció unsigned.");
  }

  // Obtenim EVM_PUBLIC_ADDRESS des de la configuració i n'apliquem trim()
  const envFromAddress = runtime.getSetting("EVM_PUBLIC_ADDRESS");
  if (envFromAddress) {
    const trimmedEnv = envFromAddress.trim();
    if (trimmedEnv.startsWith("0x")) {
      transferDetails.fromAddress = trimmedEnv as `0x${string}`;
    } else {
      throw new Error("EVM_PUBLIC_ADDRESS must be a valid hex string starting with '0x'");
    }
  } else {
    transferDetails.fromAddress = transferDetails.fromAddress
      ? (transferDetails.fromAddress.trim() as `0x${string}`)
      : "0xElTeuCompte" as `0x${string}`;
  }

  // Neteja d'espais per si els camps ja els tenen
  transferDetails.toAddress = transferDetails.toAddress.trim() as `0x${string}`;
  if (transferDetails.fromAddress) {
    transferDetails.fromAddress = transferDetails.fromAddress.trim() as `0x${string}`;
  }

  return transferDetails;
};

export const createUnsignedTxAction: Action = {
  name: "createUnsignedTx",
  description:
    "Genera un JSON per una transacció no signada, amb els camps 'from', 'to' i 'value'",
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback?: HandlerCallback
  ) => {
    try {
      state = state
        ? await runtime.updateRecentMessageState(state)
        : (await runtime.composeState(message)) as State;
      console.log("CreateUnsignedTx action handler called");

      // Obtenim els detalls de la transferència i validem els paràmetres
      const params = await buildTransferDetails(state, runtime);
      const actionInstance = new CreateUnsignedTxAction();
      // Aquest mètode pot llençar un error si l'import és invàlid.
      const unsignedTx = await actionInstance.createUnsignedTx(params);

      if (callback) {
        callback({
          text: "Transacció no signada generada correctament.",
          content: unsignedTx,
        });
      }
      return true;
    } catch (error: any) {
      // Si l'error és un dels nostres errors controlats, gestiona'l i retorna false.
      if (
        error.message &&
        (error.message.includes("No s'han pogut generar") ||
          error.message.includes("Falta 'toAddress'"))
      ) {
        if (callback) {
          callback({ text: error.message });
        }
        return false;
      }
      // Per altres errors (per exemple, d'un import invàlid) reenvia l'error per rebutjar la promesa.
      throw error;
    }
  },
  validate: async (runtime: IAgentRuntime) => {
    // No es requereix cap clau privada ja que la transacció no es signa
    return true;
  },
  examples: [
    [
      {
        user: "assistant",
        content: {
          text: "Generating an unsigned transaction from 0xElTeuCompte to 0xReceptorAddress1234567890abcdef",
          action: "CREATE_UNSIGNED_TX",
        },
      },
      {
        user: "user",
        content: {
          text: "Create an unsigned transaction from 0xElTeuCompte to 0xReceptorAddress1234567890abcdef",
          action: "CREATE_UNSIGNED_TX",
        },
      },
    ],
  ],
  similes: ["CREATE_UNSIGNED_TX", "UNSIGNED_TRANSACTION", "TX_JSON", "BUILD_TRANSACTION", "createUnsignedTx"],
};
